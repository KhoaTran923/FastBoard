export interface AnalyticsEngine {
  /** Tasks completed per period; `boundaries` = P+1 sorted period edges. */
  velocity(completedTimes: Float64Array, boundaries: Float64Array): number[];
  /** Mean tasks-per-period of a velocity series. */
  averageVelocity(velocity: number[]): number;
  /** Periods needed to finish `remaining` tasks (-1 when velocity <= 0). */
  forecastPeriods(remaining: number, avgVelocity: number): number;
  /** Index of the overloaded column, or -1 when work is spread evenly. */
  bottleneck(columnCounts: number[]): number;
  /** Open tasks at each sample time (negative completed time = still open). */
  burndown(
    createdTimes: Float64Array,
    completedTimes: Float64Array,
    sampleTimes: Float64Array
  ): number[];
}

const BOTTLENECK_THRESHOLD = 1.5;

export const jsAnalytics: AnalyticsEngine = {
  velocity(completedTimes, boundaries) {
    const periods = boundaries.length - 1;
    if (periods <= 0) return [];
    const counts = new Array<number>(periods).fill(0);
    const lo = boundaries[0];
    const hi = boundaries[periods];
    for (let i = 0, n = completedTimes.length; i < n; i++) {
      const t = completedTimes[i];
      if (t < lo || t >= hi) continue;
      let a = 0;
      let b = periods - 1;
      while (a < b) {
        const mid = (a + b + 1) >> 1;
        if (boundaries[mid] <= t) a = mid;
        else b = mid - 1;
      }
      counts[a]++;
    }
    return counts;
  },

  averageVelocity(velocity) {
    if (velocity.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < velocity.length; i++) sum += velocity[i];
    return sum / velocity.length;
  },

  forecastPeriods(remaining, avgVelocity) {
    if (avgVelocity <= 0) return -1;
    if (remaining <= 0) return 0;
    return remaining / avgVelocity;
  },

  bottleneck(columnCounts) {
    const n = columnCounts.length;
    if (n < 2) return -1;
    let maxIdx = 0;
    let total = 0;
    for (let i = 0; i < n; i++) {
      total += columnCounts[i];
      if (columnCounts[i] > columnCounts[maxIdx]) maxIdx = i;
    }
    const max = columnCounts[maxIdx];
    if (max <= 1) return -1;
    const restAvg = (total - max) / (n - 1);
    if (restAvg <= 0) return maxIdx;
    return max >= restAvg * BOTTLENECK_THRESHOLD ? maxIdx : -1;
  },

  burndown(createdTimes, completedTimes, sampleTimes) {
    const out = new Array<number>(sampleTimes.length).fill(0);
    const n = createdTimes.length;
    for (let d = 0; d < sampleTimes.length; d++) {
      const at = sampleTimes[d];
      let open = 0;
      for (let i = 0; i < n; i++) {
        if (createdTimes[i] <= at && (completedTimes[i] < 0 || completedTimes[i] > at)) open++;
      }
      out[d] = open;
    }
    return out;
  },
};
