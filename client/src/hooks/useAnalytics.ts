import { useEffect, useMemo, useState } from 'react';
import { instantiate } from '@assemblyscript/loader';
import { jsAnalytics, type AnalyticsEngine } from '../lib/analyticsJs';

// Raw exports: typed arrays cross the boundary as pointers into linear memory.
interface RawExports extends Record<string, unknown> {
  F64ARRAY_ID: WebAssembly.Global;
  I32ARRAY_ID: WebAssembly.Global;
  calculateVelocity(completedPtr: number, boundariesPtr: number): number;
  averageVelocity(velocityPtr: number): number;
  burndownForecast(remaining: number, avgVelocity: number): number;
  detectBottleneck(columnCountsPtr: number): number;
  burndownSeries(createdPtr: number, completedPtr: number, samplesPtr: number): number;
}

let enginePromise: Promise<AnalyticsEngine> | null = null;

async function loadEngine(): Promise<AnalyticsEngine> {
  // analytics.wasm is served from client/public/wasm/ (built by @repo/wasm).
  const { exports } = await instantiate<RawExports>(fetch('/wasm/analytics.wasm'), {});
  const f64Id = exports.F64ARRAY_ID.valueOf() as number;
  const i32Id = exports.I32ARRAY_ID.valueOf() as number;

  const withArrays = <R>(
    values: (number[] | Float64Array | Int32Array)[],
    ids: number[],
    fn: (ptrs: number[]) => R
  ): R => {
    const ptrs = values.map((v, i) => exports.__pin(exports.__newArray(ids[i], v)));
    try {
      return fn(ptrs);
    } finally {
      for (const p of ptrs) exports.__unpin(p);
    }
  };
  const readI32Array = (ptr: number): number[] => exports.__getArray(ptr);

  return {
    velocity: (completedTimes, boundaries) =>
      withArrays([completedTimes, boundaries], [f64Id, f64Id], ([c, b]) =>
        readI32Array(exports.calculateVelocity(c, b))
      ),
    averageVelocity: (velocity) =>
      withArrays([velocity], [i32Id], ([v]) => exports.averageVelocity(v)),
    forecastPeriods: (remaining, avgVelocity) => exports.burndownForecast(remaining, avgVelocity),
    bottleneck: (columnCounts) =>
      withArrays([columnCounts], [i32Id], ([c]) => exports.detectBottleneck(c)),
    burndown: (createdTimes, completedTimes, sampleTimes) =>
      withArrays([createdTimes, completedTimes, sampleTimes], [f64Id, f64Id, f64Id], ([c, d, s]) =>
        readI32Array(exports.burndownSeries(c, d, s))
      ),
  };
}

function getEngine(): Promise<AnalyticsEngine> {
  enginePromise ??= loadEngine();
  return enginePromise;
}

export interface BenchmarkResult {
  taskCount: number;
  wasmMs: number;
  jsMs: number;
  speedup: number;
}

interface BenchmarkData {
  completed: Float64Array;
  created: Float64Array;
  done: Float64Array;
  bounds: Float64Array;
  samples: Float64Array;
  wip: number[];
}

/** Time one engine over the synthetic workload (velocity + burndown + bottleneck). */
function timeEngine(engine: AnalyticsEngine, data: BenchmarkData, iterations: number): number {
  const run = () => {
    const vel = engine.velocity(data.completed, data.bounds);
    engine.forecastPeriods(1000, engine.averageVelocity(vel));
    engine.bottleneck(data.wip);
    engine.burndown(data.created, data.done, data.samples);
  };
  run(); // warm up (JIT / lazy WASM compilation)
  const start = performance.now();
  for (let i = 0; i < iterations; i++) run();
  return (performance.now() - start) / iterations;
}

/** Run the full analytics workload on both engines and compare. */
export async function runAnalyticsBenchmark(
  taskCount = 10_000,
  iterations = 25
): Promise<BenchmarkResult> {
  const wasm = await getEngine();

  // Synthetic project: `taskCount` tasks created over ~26 weeks, 70% completed.
  const WEEK = 7 * 24 * 3600 * 1000;
  const t0 = Date.now() - 26 * WEEK;
  const created = new Float64Array(taskCount);
  const done = new Float64Array(taskCount);
  const completed: number[] = [];
  for (let i = 0; i < taskCount; i++) {
    const c = t0 + Math.random() * 26 * WEEK;
    created[i] = c;
    if (Math.random() < 0.7) {
      const d = c + Math.random() * 2 * WEEK;
      done[i] = d;
      completed.push(d);
    } else {
      done[i] = -1;
    }
  }
  const bounds = Float64Array.from({ length: 27 }, (_, i) => t0 + i * WEEK);
  const samples = Float64Array.from(
    { length: 90 },
    (_, i) => Date.now() - (89 - i) * 24 * 3600 * 1000
  );
  const wip = Array.from({ length: 6 }, () => Math.floor(Math.random() * 50));

  const data: BenchmarkData = {
    completed: Float64Array.from(completed),
    created,
    done,
    bounds,
    samples,
    wip,
  };
  const wasmMs = timeEngine(wasm, data, iterations);
  const jsMs = timeEngine(jsAnalytics, data, iterations);
  return { taskCount, wasmMs, jsMs, speedup: jsMs / wasmMs };
}

/**
 * WASM-backed analytics engine for the dashboard. Falls back to the identical
 * JS implementation until the module finishes loading, so charts always render.
 */
export function useAnalytics(): { engine: AnalyticsEngine; wasmReady: boolean } {
  const [wasmEngine, setWasmEngine] = useState<AnalyticsEngine | null>(null);

  useEffect(() => {
    let active = true;
    getEngine()
      .then((engine) => {
        if (active) setWasmEngine(engine);
      })
      .catch(() => {
        // Stay on the JS fallback if the module fails to load.
      });
    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({ engine: wasmEngine ?? jsAnalytics, wasmReady: wasmEngine !== null }),
    [wasmEngine]
  );
}
