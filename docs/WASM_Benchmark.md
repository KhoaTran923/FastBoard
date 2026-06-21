# Search Benchmark — WASM vs JavaScript vs API

10.000 tasks searched for `"search"` · Node v24.16.0 · 2026-06-21

| Engine                   | ms / search | Matches |
| ------------------------ | ----------: | ------: |
| WASM (client-side)       |       0.626 |    1840 |
| JavaScript (client-side) |       0.293 |    1840 |
| API (server round-trip)  |       0.740 |    1840 |

> `pnpm --filter @repo/wasm bench`
