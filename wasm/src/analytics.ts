// WASM Analytics Engine: project statistics computed client-side.
// Timestamps are epoch milliseconds carried in f64.

// Runtime ids for typed arrays, needed by the JS loader's __newArray()
export const F64ARRAY_ID = idof<Float64Array>();
export const I32ARRAY_ID = idof<Int32Array>();

/**
 * Tasks completed per period. `boundaries` holds P+1 sorted period edges;
 * each completion is bucketed with a binary search, O(N log P) overall.
 */
export function calculateVelocity(
  completedTimes: Float64Array,
  boundaries: Float64Array
): Int32Array {
  const periods: i32 = boundaries.length - 1;
  const counts = new Int32Array(periods > 0 ? periods : 0);
  if (periods <= 0) return counts;

  // unchecked() skips bounds checks in hot loops; indices are always in range
  const lo: f64 = unchecked(boundaries[0]);
  const hi: f64 = unchecked(boundaries[periods]);
  for (let i: i32 = 0, n = completedTimes.length; i < n; i++) {
    const t: f64 = unchecked(completedTimes[i]);
    if (t < lo || t >= hi) continue;
    // Largest a with boundaries[a] <= t
    let a: i32 = 0;
    let b: i32 = periods - 1;
    while (a < b) {
      const mid: i32 = (a + b + 1) >> 1;
      if (unchecked(boundaries[mid]) <= t) a = mid;
      else b = mid - 1;
    }
    unchecked(counts[a]++);
  }
  return counts;
}

/** Mean tasks-per-period of a velocity series (0 for an empty series). */
export function averageVelocity(velocity: Int32Array): f64 {
  const n: i32 = velocity.length;
  if (n === 0) return 0;
  let sum: f64 = 0;
  for (let i: i32 = 0; i < n; i++) sum += <f64>unchecked(velocity[i]);
  return sum / <f64>n;
}

/**
 * Periods needed to finish `remaining` tasks at the average velocity.
 * Returns -1 when velocity is not positive.
 */
export function burndownForecast(remaining: i32, avgVelocity: f64): f64 {
  if (avgVelocity <= 0) return -1;
  if (remaining <= 0) return 0;
  return <f64>remaining / avgVelocity;
}

// A bottleneck holds at least this many times the other columns' average
const BOTTLENECK_THRESHOLD: f64 = 1.5;

/**
 * Index of the column whose open-task count stands out from the rest,
 * or -1 when work is spread evenly.
 */
export function detectBottleneck(columnCounts: Int32Array): i32 {
  const n: i32 = columnCounts.length;
  if (n < 2) return -1;

  let maxIdx: i32 = 0;
  let total: i32 = 0;
  for (let i: i32 = 0; i < n; i++) {
    const c: i32 = unchecked(columnCounts[i]);
    total += c;
    if (c > unchecked(columnCounts[maxIdx])) maxIdx = i;
  }

  const max: i32 = unchecked(columnCounts[maxIdx]);
  if (max <= 1) return -1;
  const restAvg: f64 = <f64>(total - max) / <f64>(n - 1);
  if (restAvg <= 0) return maxIdx; // all work piled in one column
  return <f64>max >= restAvg * BOTTLENECK_THRESHOLD ? maxIdx : -1;
}

/**
 * Open tasks at each sample time. `createdTimes[i]` pairs with
 * `completedTimes[i]`; a negative completion time means still open. O(N * D).
 */
export function burndownSeries(
  createdTimes: Float64Array,
  completedTimes: Float64Array,
  sampleTimes: Float64Array
): Int32Array {
  const days: i32 = sampleTimes.length;
  const n: i32 = createdTimes.length;
  const out = new Int32Array(days);
  for (let d: i32 = 0; d < days; d++) {
    const at: f64 = unchecked(sampleTimes[d]);
    let open: i32 = 0;
    for (let i: i32 = 0; i < n; i++) {
      const done: f64 = unchecked(completedTimes[i]);
      if (unchecked(createdTimes[i]) <= at && (done < 0 || done > at)) open++;
    }
    unchecked((out[d] = open));
  }
  return out;
}
