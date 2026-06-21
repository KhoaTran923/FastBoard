import { instantiate } from '@assemblyscript/loader';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, URL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const N = 10000;
const SYNC_ITERS = 200;
const API_ITERS = 50;
const QUERY = 'search';

// ── Corpus of N task titles ──────────────────────────────────────────────────
const WORDS = [
  'build', 'design', 'review', 'test', 'deploy', 'refactor', 'search', 'board',
  'task', 'user', 'auth', 'column', 'sprint', 'bug', 'feature', 'docs', 'api',
  'cache', 'token', 'login', 'flow', 'model', 'query', 'index', 'schema',
];
const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)];
const corpus = Array.from({ length: N }, () =>
  `${pick()} ${pick()} ${pick()} ${pick()} ${pick()}`.toLowerCase()
);

const countMatches = (q) => {
  let n = 0;
  for (let i = 0; i < corpus.length; i++) if (corpus[i].includes(q)) n++;
  return n;
};

// ── 1) WASM search
const wasmBuffer = await readFile(
  join(here, '..', '..', 'client', 'public', 'wasm', 'search.wasm')
);
const { exports } = await instantiate(wasmBuffer, {});
exports.clearDocs();
for (const s of corpus) exports.addDoc(exports.__newString(s));
function wasmSearch(q) {
  const qp = exports.__pin(exports.__newString(q));
  const n = exports.searchAll(qp);
  exports.__unpin(qp);
  return n;
}

// ── 2) JavaScript search (native String.includes, in the browser)
function jsSearch(q) {
  return countMatches(q);
}

// ── 3) API search
const server = createServer((req, res) => {
  const q = (new URL(req.url, 'http://localhost').searchParams.get('q') ?? '').toLowerCase();
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ matches: countMatches(q) }));
});
await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
async function apiSearch(q) {
  const res = await globalThis.fetch(`http://localhost:${port}/search?q=${encodeURIComponent(q)}`);
  return (await res.json()).matches;
}

// ── Timing helpers ───────────────────────────────────────────────────────────
function benchSync(fn, iters) {
  fn(QUERY); // warm up
  const start = performance.now();
  let matches = 0;
  for (let k = 0; k < iters; k++) matches = fn(QUERY);
  return { perSearchMs: (performance.now() - start) / iters, matches };
}
async function benchAsync(fn, iters) {
  await fn(QUERY); // warm up
  const start = performance.now();
  let matches = 0;
  for (let k = 0; k < iters; k++) matches = await fn(QUERY);
  return { perSearchMs: (performance.now() - start) / iters, matches };
}

const results = [
  ['WASM (client-side)', benchSync(wasmSearch, SYNC_ITERS)],
  ['JavaScript (client-side)', benchSync(jsSearch, SYNC_ITERS)],
  ['API (server round-trip)', await benchAsync(apiSearch, API_ITERS)],
];
server.close();

console.log(`\nSearch benchmark — ${N.toLocaleString()} tasks, query "${QUERY}"\n`);
console.table(
  results.map(([engine, r]) => ({
    Engine: engine,
    'ms / search': r.perSearchMs.toFixed(3),
    matches: r.matches,
  }))
);

const md = `# Search Benchmark — WASM vs JavaScript vs API

${N.toLocaleString()} tasks searched for \`"${QUERY}"\` · Node ${process.version} · ${new Date().toISOString().slice(0, 10)}

| Engine | ms / search | Matches |
| --- | ---: | ---: |
${results.map(([engine, r]) => `| ${engine} | ${r.perSearchMs.toFixed(3)} | ${r.matches} |`).join('\n')}

> \`pnpm --filter @repo/wasm bench\`
`;

await mkdir(join(here, '..', '..', 'docs'), { recursive: true });
await writeFile(join(here, '..', '..', 'docs', 'WASM_Benchmark.md'), md, 'utf8');
console.log('\nWrote docs/WASM_Benchmark.md\n');
