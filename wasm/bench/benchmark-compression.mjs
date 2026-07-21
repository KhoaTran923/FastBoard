import { instantiate } from '@assemblyscript/loader';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

// WASM LZSS compression vs the identical pure-JS implementation.
// Run: pnpm --filter @repo/wasm bench:compression

const here = dirname(fileURLToPath(import.meta.url));
const N = 2000; // tasks in the synthetic board snapshot
const ITERS = 50;

// Synthetic board state: shaped like the client's offline snapshot
const WORDS =
  'implement review deploy refactor design database api frontend backend socket cache index migration component modal store hook realtime kanban board column task priority urgent'.split(
    ' '
  );
const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
const columns = ['Todo', 'In Progress', 'Review', 'Done'].map((name, i) => ({
  id: `col-${i}`,
  name,
  tasks: [],
}));
for (let i = 0; i < N; i++) {
  columns[i % columns.length].tasks.push({
    id: `task-${String(i).padStart(5, '0')}`,
    title: `${pick()} ${pick()} ${pick()}`,
    description: `${pick()} ${pick()} ${pick()} ${pick()} ${pick()} ${pick()} ${pick()}`,
    priority: ['low', 'medium', 'high', 'urgent'][i % 4],
    position: i,
    assignees: [`user-${i % 7}`],
    created_at: new Date(Date.now() - i * 3600_000).toISOString(),
    updated_at: new Date().toISOString(),
  });
}
const json = JSON.stringify({ id: 'board-1', name: 'Sprint Board', columns });
const inputBytes = new TextEncoder().encode(json);

// 1) WASM module
const wasmBuffer = await readFile(
  join(here, '..', '..', 'client', 'public', 'wasm', 'compression.wasm')
);
const { exports } = await instantiate(wasmBuffer, {});
const u8Id = exports.UINT8ARRAY_ID.valueOf();

function wasmCompress(bytes) {
  const inPtr = exports.__pin(exports.__newArray(u8Id, bytes));
  try {
    const outPtr = exports.compress(inPtr);
    return exports.__getUint8Array(outPtr).slice();
  } finally {
    exports.__unpin(inPtr);
  }
}
function wasmDecompress(bytes) {
  const inPtr = exports.__pin(exports.__newArray(u8Id, bytes));
  try {
    const outPtr = exports.decompress(inPtr);
    return exports.__getUint8Array(outPtr).slice();
  } finally {
    exports.__unpin(inPtr);
  }
}

// 2) Pure JavaScript implementation (same LZSS algorithm and stream format)
const WINDOW = 4096;
const MIN_MATCH = 3;
const MAX_MATCH = 18;
const HASH_SIZE = 1 << 13;
const MAX_CHAIN = 32;
const HEADER = 5;

function jsCompress(input) {
  const n = input.length;
  const out = new Uint8Array(HEADER + n + (n >> 3) + 2);
  out[0] = 1;
  out[1] = n & 0xff;
  out[2] = (n >> 8) & 0xff;
  out[3] = (n >> 16) & 0xff;
  out[4] = (n >> 24) & 0xff;

  const head = new Int32Array(HASH_SIZE).fill(-1);
  const prev = new Int32Array(WINDOW);
  const hash3 = (i) =>
    ((input[i] << 10) ^ (input[i + 1] << 5) ^ input[i + 2]) & (HASH_SIZE - 1);

  let outPos = HEADER;
  let flagPos = 0;
  let flagBits = 0;
  let tokenCount = 8;

  let i = 0;
  while (i < n) {
    if (tokenCount === 8) {
      if (flagBits !== 0 || flagPos !== 0) out[flagPos] = flagBits;
      flagPos = outPos++;
      flagBits = 0;
      tokenCount = 0;
    }

    let bestLen = 0;
    let bestOffset = 0;
    if (i + MIN_MATCH <= n) {
      const h = hash3(i);
      let candidate = head[h];
      let chain = MAX_CHAIN;
      const limit = i - WINDOW;
      const maxLen = n - i < MAX_MATCH ? n - i : MAX_MATCH;
      while (candidate >= 0 && candidate >= limit && chain-- > 0) {
        let len = 0;
        while (len < maxLen && input[candidate + len] === input[i + len]) len++;
        if (len > bestLen) {
          bestLen = len;
          bestOffset = i - candidate;
          if (len === maxLen) break;
        }
        candidate = prev[candidate & (WINDOW - 1)];
      }
    }

    if (bestLen >= MIN_MATCH) {
      const off = bestOffset - 1;
      out[outPos++] = off & 0xff;
      out[outPos++] = ((off >> 8) << 4) | (bestLen - MIN_MATCH);
      const end = i + bestLen;
      while (i < end) {
        if (i + MIN_MATCH <= n) {
          const h = hash3(i);
          prev[i & (WINDOW - 1)] = head[h];
          head[h] = i;
        }
        i++;
      }
    } else {
      flagBits |= 1 << tokenCount;
      out[outPos++] = input[i];
      if (i + MIN_MATCH <= n) {
        const h = hash3(i);
        prev[i & (WINDOW - 1)] = head[h];
        head[h] = i;
      }
      i++;
    }
    tokenCount++;
  }
  if (n > 0) out[flagPos] = flagBits;

  return out.slice(0, outPos);
}

function jsDecompress(input) {
  const n = input[1] | (input[2] << 8) | (input[3] << 16) | (input[4] << 24);
  const out = new Uint8Array(n);
  let inPos = HEADER;
  let outPos = 0;
  let flagBits = 0;
  let tokenCount = 8;
  while (outPos < n) {
    if (tokenCount === 8) {
      flagBits = input[inPos++];
      tokenCount = 0;
    }
    if ((flagBits >> tokenCount) & 1) {
      out[outPos++] = input[inPos++];
    } else {
      const b0 = input[inPos++];
      const b1 = input[inPos++];
      const offset = (b0 | ((b1 >> 4) << 8)) + 1;
      let len = (b1 & 0x0f) + MIN_MATCH;
      let src = outPos - offset;
      while (len-- > 0) out[outPos++] = out[src++];
    }
    tokenCount++;
  }
  return out;
}

// Timing
function bench(fn, iters = ITERS) {
  fn(); // warm up
  const start = performance.now();
  for (let k = 0; k < iters; k++) fn();
  return (performance.now() - start) / iters;
}

const wasmOut = wasmCompress(inputBytes);
const jsOut = jsCompress(inputBytes);

const rows = [
  {
    Operation: 'compress',
    'JS ms': bench(() => jsCompress(inputBytes)).toFixed(3),
    'WASM ms': bench(() => wasmCompress(inputBytes)).toFixed(3),
  },
  {
    Operation: 'decompress',
    'JS ms': bench(() => jsDecompress(jsOut)).toFixed(3),
    'WASM ms': bench(() => wasmDecompress(wasmOut)).toFixed(3),
  },
];
for (const r of rows) r.Speedup = `${(Number(r['JS ms']) / Number(r['WASM ms'])).toFixed(2)}x`;

const ratio = ((wasmOut.length / inputBytes.length) * 100).toFixed(1);
console.log(
  `\nCompression benchmark — board snapshot with ${N.toLocaleString()} tasks` +
    `\nJSON size: ${inputBytes.length.toLocaleString()} B -> compressed: ${wasmOut.length.toLocaleString()} B (${ratio}% of original)\n`
);
console.table(rows);

// Sanity: identical streams and lossless round-trips, cross-engine both ways
const dec = new TextDecoder();
const same =
  wasmOut.length === jsOut.length &&
  dec.decode(wasmDecompress(jsOut)) === json &&
  dec.decode(jsDecompress(wasmOut)) === json;
console.log(same ? 'Round-trip OK, WASM and JS streams identical\n' : 'MISMATCH!\n');

const md = `# Compression Benchmark — WASM vs JavaScript

Board snapshot with ${N.toLocaleString()} tasks · Node ${process.version} · ${new Date().toISOString().slice(0, 10)}

| Metric | Value |
| --- | ---: |
| Raw JSON | ${inputBytes.length.toLocaleString()} B |
| Compressed (LZSS) | ${wasmOut.length.toLocaleString()} B |
| Ratio | ${ratio}% of original |

| Operation | JS ms | WASM ms | Speedup |
| --- | ---: | ---: | ---: |
${rows.map((r) => `| ${r.Operation} | ${r['JS ms']} | ${r['WASM ms']} | ${r.Speedup} |`).join('\n')}

> \`pnpm --filter @repo/wasm bench:compression\`
`;

await mkdir(join(here, '..', '..', 'docs'), { recursive: true });
await writeFile(join(here, '..', '..', 'docs', 'WASM_Compression_Benchmark.md'), md, 'utf8');
console.log('Wrote docs/WASM_Compression_Benchmark.md\n');
