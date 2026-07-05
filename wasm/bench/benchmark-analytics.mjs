import { instantiate } from '@assemblyscript/loader';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

// WASM Analytics Engine vs the identical pure-JS implementation, per function.
// Run: pnpm --filter @repo/wasm bench:analytics

const here = dirname(fileURLToPath(import.meta.url));
const N = 10000; // tasks
const WEEKS = 26; // velocity periods
const SAMPLES = 90; // burndown sample days
const ITERS = 100;

// Synthetic project: N tasks over 26 weeks, ~70% completed
const WEEK = 7 * 24 * 3600 * 1000;
const t0 = Date.now() - WEEKS * WEEK;
const created = [];
const done = []; // -1 = still open
const completedOnly = [];
for (let i = 0; i < N; i++) {
  const c = t0 + Math.random() * WEEKS * WEEK;
  created.push(c);
  if (Math.random() < 0.7) {
    const d = c + Math.random() * 2 * WEEK;
    done.push(d);
    completedOnly.push(d);
  } else {
    done.push(-1);
  }
}
const boundaries = Array.from({ length: WEEKS + 1 }, (_, i) => t0 + i * WEEK);
const samples = Array.from(
  { length: SAMPLES },
  (_, i) => Date.now() - (SAMPLES - 1 - i) * 24 * 3600 * 1000
);
const wip = Array.from({ length: 8 }, () => Math.floor(Math.random() * 200));

// Typed-array views: __newArray bulk-copies these (memcpy) instead of
// element-by-element, which is also how the client passes data.
const createdT = Float64Array.from(created);
const doneT = Float64Array.from(done);
const completedT = Float64Array.from(completedOnly);
const boundariesT = Float64Array.from(boundaries);
const samplesT = Float64Array.from(samples);
const wipT = Int32Array.from(wip);

// 1) WASM engine
const wasmBuffer = await readFile(
  join(here, '..', '..', 'client', 'public', 'wasm', 'analytics.wasm')
);
const { exports } = await instantiate(wasmBuffer, {});
const f64Id = exports.F64ARRAY_ID.valueOf();
const i32Id = exports.I32ARRAY_ID.valueOf();

const withArrays = (values, ids, fn) => {
  const ptrs = values.map((v, i) => exports.__pin(exports.__newArray(ids[i], v)));
  try {
    return fn(ptrs);
  } finally {
    for (const p of ptrs) exports.__unpin(p);
  }
};

const wasm = {
  velocity: () =>
    withArrays([completedT, boundariesT], [f64Id, f64Id], ([c, b]) =>
      exports.__getArray(exports.calculateVelocity(c, b))
    ),
  burndown: () =>
    withArrays([createdT, doneT, samplesT], [f64Id, f64Id, f64Id], ([c, d, s]) =>
      exports.__getArray(exports.burndownSeries(c, d, s))
    ),
  bottleneck: () => withArrays([wipT], [i32Id], ([w]) => exports.detectBottleneck(w)),
};

// 2) Pure JavaScript engine (same algorithms)
function jsVelocity(completedTimes, bounds) {
  const periods = bounds.length - 1;
  const counts = new Array(periods).fill(0);
  const lo = bounds[0];
  const hi = bounds[periods];
  for (let i = 0; i < completedTimes.length; i++) {
    const t = completedTimes[i];
    if (t < lo || t >= hi) continue;
    let a = 0;
    let b = periods - 1;
    while (a < b) {
      const mid = (a + b + 1) >> 1;
      if (bounds[mid] <= t) a = mid;
      else b = mid - 1;
    }
    counts[a]++;
  }
  return counts;
}
function jsBurndown(createdTimes, doneTimes, sampleTimes) {
  const out = new Array(sampleTimes.length).fill(0);
  for (let d = 0; d < sampleTimes.length; d++) {
    const at = sampleTimes[d];
    let open = 0;
    for (let i = 0; i < createdTimes.length; i++) {
      if (createdTimes[i] <= at && (doneTimes[i] < 0 || doneTimes[i] > at)) open++;
    }
    out[d] = open;
  }
  return out;
}
function jsBottleneck(counts) {
  const n = counts.length;
  if (n < 2) return -1;
  let maxIdx = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += counts[i];
    if (counts[i] > counts[maxIdx]) maxIdx = i;
  }
  const max = counts[maxIdx];
  if (max <= 1) return -1;
  const restAvg = (total - max) / (n - 1);
  if (restAvg <= 0) return maxIdx;
  return max >= restAvg * 1.5 ? maxIdx : -1;
}
const js = {
  velocity: () => jsVelocity(completedOnly, boundaries),
  burndown: () => jsBurndown(created, done, samples),
  bottleneck: () => jsBottleneck(wip),
};

// Timing
function bench(fn, iters = ITERS) {
  fn(); // warm up
  const start = performance.now();
  for (let k = 0; k < iters; k++) fn();
  return (performance.now() - start) / iters;
}

// Resident mode: the arrays are copied into WASM memory once (as a client
// would after loading board data) and every iteration only recomputes.
function benchResident(values, ids, call, iters) {
  const ptrs = values.map((v, i) => exports.__pin(exports.__newArray(ids[i], v)));
  try {
    return bench(() => call(ptrs), iters);
  } finally {
    for (const p of ptrs) exports.__unpin(p);
  }
}

const wasmResident = {
  velocity: (iters) =>
    benchResident(
      [completedT, boundariesT],
      [f64Id, f64Id],
      ([c, b]) => exports.__getArray(exports.calculateVelocity(c, b)),
      iters
    ),
  burndown: (iters) =>
    benchResident(
      [createdT, doneT, samplesT],
      [f64Id, f64Id, f64Id],
      ([c, d, s]) => exports.__getArray(exports.burndownSeries(c, d, s)),
      iters
    ),
  bottleneck: (iters) =>
    benchResident([wipT], [i32Id], ([w]) => exports.detectBottleneck(w), iters),
};

const rows = [];
for (const [name, iters] of [
  ['velocity', ITERS],
  ['burndown', ITERS],
  ['bottleneck', ITERS * 100],
]) {
  const wasmCold = bench(wasm[name], iters);
  const wasmWarm = wasmResident[name](iters);
  const jsMs = bench(js[name], iters);
  rows.push({
    Function: name,
    'JS ms': jsMs.toFixed(4),
    'WASM ms (copy every call)': wasmCold.toFixed(4),
    'WASM ms (data resident)': wasmWarm.toFixed(4),
    Speedup: `${(jsMs / wasmWarm).toFixed(2)}x`,
  });
}

console.log(
  `\nAnalytics benchmark — ${N.toLocaleString()} tasks, ${WEEKS} weeks, ${SAMPLES} burndown samples\n`
);
console.table(rows);

// Sanity: both engines must agree.
const same =
  JSON.stringify(wasm.velocity()) === JSON.stringify(js.velocity()) &&
  JSON.stringify(wasm.burndown()) === JSON.stringify(js.burndown()) &&
  wasm.bottleneck() === js.bottleneck();
console.log(
  same ? '✓ WASM and JS results are identical\n' : '✗ RESULT MISMATCH between engines!\n'
);

const md = `# Analytics Benchmark — WASM vs JavaScript

${N.toLocaleString()} tasks · ${WEEKS} weekly periods · ${SAMPLES} burndown samples · Node ${process.version} · ${new Date().toISOString().slice(0, 10)}

| Function | JS ms | WASM ms (copy every call) | WASM ms (data resident) | Speedup (resident) |
| --- | ---: | ---: | ---: | ---: |
${rows
  .map(
    (r) =>
      `| ${r.Function} | ${r['JS ms']} | ${r['WASM ms (copy every call)']} | ${r['WASM ms (data resident)']} | ${r.Speedup} |`
  )
  .join('\n')}

Result parity check: ${same ? 'both engines return identical outputs.' : 'MISMATCH — investigate!'}

**Reading the numbers.** WASM wins where there is real computation per byte
transferred (burndown scans N×D task/day pairs). "Copy every call" includes
marshalling the task arrays into WASM linear memory; "data resident" copies
them once and only recomputes — the realistic dashboard pattern. For
micro-inputs (bottleneck: 8 integers) the JS↔WASM call overhead dominates and
plain JavaScript is the right tool — an important negative result.

> \`pnpm --filter @repo/wasm bench:analytics\` · in-app version: Analytics page → “Run benchmark”
`;

await mkdir(join(here, '..', '..', 'docs'), { recursive: true });
await writeFile(join(here, '..', '..', 'docs', 'WASM_Analytics_Benchmark.md'), md, 'utf8');
console.log('Wrote docs/WASM_Analytics_Benchmark.md\n');
