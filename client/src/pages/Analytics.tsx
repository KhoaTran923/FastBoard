import { useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { Button, Spinner } from '../components/common/ui';
import { runAnalyticsBenchmark, useAnalytics, type BenchmarkResult } from '../hooks/useAnalytics';
import { useAuthStore } from '../stores/authStore';
import { useBoardStore } from '../stores/boardStore';
import type { Task } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const PURPLE = '#635fc7';
const PURPLE_SOFT = 'rgba(99, 95, 199, 0.35)';
const RED = '#ea5555';
const GREY = '#828fa3';
const GRID = 'rgba(130, 143, 163, 0.15)';

const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;
const VELOCITY_WEEKS = 8;
const BURNDOWN_DAYS = 30;
const MAX_PROJECTION_DAYS = 30;

const shortDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Monday 00:00 of the week containing `ms`. */
function startOfWeek(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return d.getTime() - dow * DAY;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-[0_4px_6px_rgba(54,78,126,0.1)] dark:bg-dark-grey">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[2.4px] text-medium-grey">
        {title}
      </h3>
      {children}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-[0_4px_6px_rgba(54,78,126,0.1)] dark:bg-dark-grey">
      <p className="text-xs font-bold text-medium-grey">{label}</p>
      <p className="mt-1 truncate text-xl font-bold text-black dark:text-white">{value}</p>
    </div>
  );
}

/** Live WASM vs JS performance comparison. */
function BenchmarkCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState(false);

  async function run() {
    setRunning(true);
    setError(false);
    // Let the button repaint before the benchmark blocks the main thread
    await new Promise((r) => setTimeout(r, 50));
    try {
      setResult(await runAnalyticsBenchmark());
    } catch {
      setError(true);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card title="WASM vs JS — Performance">
      <p className="text-[13px] leading-relaxed text-medium-grey">
        Runs the full analytics workload (velocity, forecast, bottleneck, 90-day burndown) on 10,000
        synthetic tasks with the WebAssembly engine and the identical pure-JavaScript
        implementation.
      </p>

      {result && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-purple/10 px-4 py-3">
              <p className="text-xs font-bold text-purple">WebAssembly</p>
              <p className="text-lg font-bold text-black dark:text-white">
                {result.wasmMs.toFixed(2)} ms
              </p>
            </div>
            <div className="rounded-md bg-medium-grey/10 px-4 py-3">
              <p className="text-xs font-bold text-medium-grey">JavaScript</p>
              <p className="text-lg font-bold text-black dark:text-white">
                {result.jsMs.toFixed(2)} ms
              </p>
            </div>
          </div>
          <p className="pt-1 text-center text-sm font-bold text-black dark:text-white">
            {result.speedup >= 1
              ? `WASM is ${result.speedup.toFixed(2)}× faster`
              : `JS was faster this run (${(1 / result.speedup).toFixed(2)}×)`}
            <span className="font-medium text-medium-grey">
              {' '}
              · {result.taskCount.toLocaleString()} tasks / run
            </span>
          </p>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-bold text-red">Benchmark failed to run.</p>}

      <div className="mt-4">
        <Button onClick={() => void run()} disabled={running} fullWidth>
          {running ? 'Running…' : result ? 'Run again' : 'Run benchmark'}
        </Button>
      </div>
    </Card>
  );
}

export function Analytics() {
  const authStatus = useAuthStore((s) => s.status);
  const activeBoard = useBoardStore((s) => s.activeBoard);
  const { engine, wasmReady } = useAnalytics();

  // Anchor "today" once per mount to keep renders pure and axes stable
  const [now] = useState(() => Date.now());

  // Chart inputs are derived on the client and computed in WASM, no API calls
  const stats = useMemo(() => {
    if (!activeBoard) return null;
    const columns = activeBoard.columns;
    const tasks: Task[] = columns.flatMap((c) => c.tasks);

    const completedTimes = Float64Array.from(
      tasks.filter((t) => t.completed_at),
      (t) => new Date(t.completed_at!).getTime()
    );
    const open = tasks.length - completedTimes.length;

    // Velocity: the last 8 weeks, current (partial) week included
    const thisWeek = startOfWeek(now);
    const boundaries = Float64Array.from(
      { length: VELOCITY_WEEKS + 1 },
      (_, i) => thisWeek - (VELOCITY_WEEKS - 1 - i) * WEEK
    );
    const velocity = engine.velocity(completedTimes, boundaries);
    const weekLabels = Array.from(boundaries.slice(0, -1), shortDate);
    const avgVelocity = engine.averageVelocity(velocity);

    // Forecast: weeks to clear the open tasks at the average velocity
    const forecastWeeks = engine.forecastPeriods(open, avgVelocity);
    const forecastMs = forecastWeeks >= 0 ? now + forecastWeeks * WEEK : null;

    // Burndown: open tasks over the last 30 days, plus a dashed projection
    // from today down to zero at the forecast date
    const createdTimes = Float64Array.from(tasks, (t) => new Date(t.created_at).getTime());
    const doneTimes = Float64Array.from(tasks, (t) =>
      t.completed_at ? new Date(t.completed_at).getTime() : -1
    );
    const sampleTimes = Float64Array.from(
      { length: BURNDOWN_DAYS },
      (_, i) => now - (BURNDOWN_DAYS - 1 - i) * DAY
    );
    const burndown = engine.burndown(createdTimes, doneTimes, sampleTimes);

    const projectionDays = forecastMs
      ? Math.min(Math.ceil((forecastMs - now) / DAY), MAX_PROJECTION_DAYS)
      : 0;
    const dayLabels = [
      ...Array.from(sampleTimes, shortDate),
      ...Array.from({ length: projectionDays }, (_, i) => shortDate(now + (i + 1) * DAY)),
    ];
    const actualSeries: (number | null)[] = [
      ...burndown,
      ...Array.from({ length: projectionDays }, () => null),
    ];
    // Two anchored points (today, forecast end); spanGaps draws the line
    const projectedSeries: (number | null)[] = dayLabels.map(() => null);
    if (projectionDays > 0) {
      projectedSeries[BURNDOWN_DAYS - 1] = open;
      const reached = forecastMs! <= now + projectionDays * DAY;
      projectedSeries[dayLabels.length - 1] = reached
        ? 0
        : Math.round(open * (1 - (projectionDays * DAY) / (forecastMs! - now)));
    }

    // Open tasks per column + bottleneck detection
    const wip = columns.map((c) => c.tasks.filter((t) => !t.completed_at).length);
    const bottleneckIdx = engine.bottleneck(wip);

    return {
      total: tasks.length,
      open,
      completed: completedTimes.length,
      avgVelocity,
      forecastMs,
      velocity,
      weekLabels,
      dayLabels,
      actualSeries,
      projectedSeries,
      columnNames: columns.map((c) => c.name),
      wip,
      bottleneckIdx,
    };
  }, [activeBoard, engine, now]);

  if (authStatus !== 'authenticated' || !activeBoard || !stats) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        {authStatus === 'authenticated' && !activeBoard ? (
          <Spinner className="text-purple" />
        ) : (
          <p className="text-lg font-bold text-medium-grey">
            Sign in and select a board to see its analytics.
          </p>
        )}
      </div>
    );
  }

  const axisOptions = {
    ticks: { color: GREY, font: { family: "'Plus Jakarta Sans', sans-serif" } },
    grid: { color: GRID },
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ...axisOptions, grid: { display: false } },
      y: { ...axisOptions, beginAtZero: true, ticks: { ...axisOptions.ticks, precision: 0 } },
    },
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: GREY, boxWidth: 12 } } },
    scales: {
      x: {
        ...axisOptions,
        grid: { display: false },
        ticks: { ...axisOptions.ticks, maxTicksLimit: 10 },
      },
      y: { ...axisOptions, beginAtZero: true, ticks: { ...axisOptions.ticks, precision: 0 } },
    },
  };

  const bottleneckName = stats.bottleneckIdx >= 0 ? stats.columnNames[stats.bottleneckIdx] : null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white">
            Analytics — {activeBoard.name}
          </h2>
          <p className="text-[13px] text-medium-grey">
            Computed client-side, no API calls — burndown, velocity and bottleneck analysis.
          </p>
        </div>
        <span
          title={
            wasmReady
              ? 'Statistics computed by the AssemblyScript WASM module'
              : 'WASM module still loading — using the JavaScript fallback'
          }
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            wasmReady ? 'bg-purple/15 text-purple' : 'bg-medium-grey/15 text-medium-grey'
          }`}
        >
          {wasmReady ? '⚡ WASM engine' : 'JS fallback'}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total tasks" value={String(stats.total)} />
        <StatCard label="Open" value={String(stats.open)} />
        <StatCard label="Completed" value={String(stats.completed)} />
        <StatCard label="Avg velocity" value={`${stats.avgVelocity.toFixed(1)}/wk`} />
        <StatCard
          label="Forecast finish"
          value={
            stats.open === 0 ? 'Done 🎉' : stats.forecastMs ? shortDate(stats.forecastMs) : '—'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Velocity — tasks completed per week (last ${VELOCITY_WEEKS})`}>
          <div className="h-64">
            <Bar
              options={barOptions}
              data={{
                labels: stats.weekLabels,
                datasets: [
                  {
                    data: stats.velocity,
                    backgroundColor: PURPLE_SOFT,
                    borderColor: PURPLE,
                    borderWidth: 1.5,
                    borderRadius: 6,
                  },
                ],
              }}
            />
          </div>
        </Card>

        <Card title={`Burndown — open tasks (last ${BURNDOWN_DAYS} days + forecast)`}>
          <div className="h-64">
            <Line
              options={lineOptions}
              data={{
                labels: stats.dayLabels,
                datasets: [
                  {
                    label: 'Open tasks',
                    data: stats.actualSeries,
                    borderColor: PURPLE,
                    backgroundColor: 'rgba(99, 95, 199, 0.12)',
                    fill: true,
                    pointRadius: 0,
                    tension: 0.25,
                  },
                  {
                    label: 'Forecast',
                    data: stats.projectedSeries,
                    borderColor: GREY,
                    borderDash: [6, 6],
                    pointRadius: 3,
                    spanGaps: true,
                  },
                ],
              }}
            />
          </div>
        </Card>

        <Card title="Work in progress by column">
          <div className="h-56">
            <Bar
              options={barOptions}
              data={{
                labels: stats.columnNames,
                datasets: [
                  {
                    data: stats.wip,
                    backgroundColor: stats.wip.map((_, i) =>
                      i === stats.bottleneckIdx ? 'rgba(234, 85, 85, 0.4)' : PURPLE_SOFT
                    ),
                    borderColor: stats.wip.map((_, i) =>
                      i === stats.bottleneckIdx ? RED : PURPLE
                    ),
                    borderWidth: 1.5,
                    borderRadius: 6,
                  },
                ],
              }}
            />
          </div>
          <p className="mt-3 text-sm font-bold">
            {bottleneckName ? (
              <span className="text-red">
                ⚠ Bottleneck detected: “{bottleneckName}” holds {stats.wip[stats.bottleneckIdx]}{' '}
                open tasks.
              </span>
            ) : (
              <span className="text-medium-grey">No bottleneck — work is spread evenly.</span>
            )}
          </p>
        </Card>

        <BenchmarkCard />
      </div>
    </div>
  );
}
