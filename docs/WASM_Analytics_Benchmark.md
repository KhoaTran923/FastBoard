# Analytics Benchmark — WASM vs JavaScript

10.000 tasks · 26 weekly periods · 90 burndown samples · Node v24.18.0 · 2026-07-05

| Function   |  JS ms | WASM ms (copy every call) | WASM ms (data resident) | Speedup (resident) |
| ---------- | -----: | ------------------------: | ----------------------: | -----------------: |
| velocity   | 0.2044 |                    0.2427 |                  0.1971 |              1.04x |
| burndown   | 5.2483 |                    2.6132 |                  2.8249 |              1.86x |
| bottleneck | 0.0001 |                    0.0046 |                  0.0001 |              0.77x |

Result parity check: both engines return identical outputs.

**Reading the numbers.** WASM wins where there is real computation per byte
transferred (burndown scans N×D task/day pairs). "Copy every call" includes
marshalling the task arrays into WASM linear memory; "data resident" copies
them once and only recomputes — the realistic dashboard pattern. For
micro-inputs (bottleneck: 8 integers) the JS↔WASM call overhead dominates and
plain JavaScript is the right tool — an important negative result.

> `pnpm --filter @repo/wasm bench:analytics` · in-app version: Analytics page → “Run benchmark”
