import { useState, useEffect, useMemo } from 'react';
import { STAGES } from '../constants.js';
import jobRepository from '../services/jobRepository.js';

const WEEKS = 8;
const ACTIVE_STAGES = new Set(['Opportunity', 'Applied', 'Screening', 'Interviewing', 'Offer']);

const weekLabelFormatter = new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric' });

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 px-4 py-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

// Column with a 4px rounded data-end (top) and a square baseline
function columnPath(x, w, baseline, h) {
  if (h <= 0) return '';
  const r = Math.min(4, h / 2, w / 2);
  return [
    `M ${x} ${baseline}`,
    `v ${-(h - r)}`,
    `q 0 ${-r} ${r} ${-r}`,
    `h ${w - 2 * r}`,
    `q ${r} 0 ${r} ${r}`,
    `v ${h - r}`,
    'Z',
  ].join(' ');
}

function WeeklyChart({ weeks }) {
  const width = 480;
  const height = 150;
  const chartTop = 18; // room for cap labels
  const baseline = height - 18; // room for week labels
  const band = width / weeks.length;
  const barW = Math.min(24, band - 8);
  const max = Math.max(1, ...weeks.map((w) => w.count));
  const scale = (baseline - chartTop) / max;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Applications per week">
      <line
        x1="0" y1={baseline} x2={width} y2={baseline}
        className="stroke-zinc-950/10 dark:stroke-white/10"
        strokeWidth="1"
      />
      {weeks.map((w, i) => {
        const x = i * band + (band - barW) / 2;
        const h = Math.round(w.count * scale);
        return (
          <g key={w.label}>
            {w.count > 0 && (
              <path d={columnPath(x, barW, baseline, h)} className="fill-mauve-500 dark:fill-mauve-400 hover:opacity-80 transition-opacity">
                <title>{`Week of ${w.label}: ${w.count}`}</title>
              </path>
            )}
            {/* every cap is labeled, so no y-axis is needed */}
            {w.count > 0 && (
              <text
                x={x + barW / 2}
                y={baseline - h - 5}
                textAnchor="middle"
                className="fill-zinc-600 dark:fill-zinc-300"
                fontSize="11"
              >
                {w.count}
              </text>
            )}
            <text
              x={i * band + band / 2}
              y={height - 4}
              textAnchor="middle"
              className="fill-zinc-400 dark:fill-zinc-500"
              fontSize="10"
            >
              {w.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function StatsView({ jobs }) {
  // null = fetch failed (migration not applied yet) → hide history-based stats
  const [events, setEvents] = useState(null);

  useEffect(() => {
    let cancelled = false;
    jobRepository.getAllJobEvents()
      .then((data) => { if (!cancelled) setEvents(data); })
      .catch(() => { if (!cancelled) setEvents(null); });
    return () => { cancelled = true; };
  }, []);

  const tiles = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((j) => !j.archivedAt && ACTIVE_STAGES.has(j.stage)).length;
    const offers = jobs.filter((j) => j.stage === 'Offer' || j.stage === 'Accepted').length;
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const recent = jobs.filter((j) => j.dateApplied && new Date(j.dateApplied + 'T00:00:00') >= monthAgo).length;
    return { total, active, offers, recent };
  }, [jobs]);

  const weeks = useMemo(() => {
    const buckets = [];
    const thisWeek = startOfWeek(new Date());
    for (let i = WEEKS - 1; i >= 0; i--) {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - i * 7);
      buckets.push({ start, label: weekLabelFormatter.format(start), count: 0 });
    }
    for (const job of jobs) {
      if (!job.dateApplied) continue;
      const applied = new Date(job.dateApplied + 'T00:00:00');
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (applied >= buckets[i].start) {
          const weekEnd = new Date(buckets[i].start);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (applied < weekEnd) buckets[i].count++;
          break;
        }
      }
    }
    return buckets;
  }, [jobs]);

  const stageCounts = useMemo(() => {
    const counts = STAGES.map((stage) => ({
      stage,
      count: jobs.filter((j) => j.stage === stage).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    return { counts, max };
  }, [jobs]);

  // Average days spent in a stage, from completed intervals between
  // consecutive events of the same job
  const timeInStage = useMemo(() => {
    if (!events || events.length === 0) return null;
    const byJob = new Map();
    for (const e of events) {
      if (!byJob.has(e.jobId)) byJob.set(e.jobId, []);
      byJob.get(e.jobId).push(e);
    }
    const samples = new Map(); // stage -> [days]
    for (const list of byJob.values()) {
      for (let i = 0; i < list.length - 1; i++) {
        const days = (new Date(list[i + 1].createdAt) - new Date(list[i].createdAt)) / 86400000;
        const stage = list[i].toStage;
        if (!samples.has(stage)) samples.set(stage, []);
        samples.get(stage).push(days);
      }
    }
    if (samples.size === 0) return [];
    return STAGES
      .filter((s) => samples.has(s))
      .map((s) => {
        const list = samples.get(s);
        return { stage: s, avg: list.reduce((a, b) => a + b, 0) / list.length, n: list.length };
      });
  }, [events]);

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">Add jobs to see stats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total jobs" value={tiles.total} />
        <StatTile label="Active pipeline" value={tiles.active} />
        <StatTile label="Applied last 30 days" value={tiles.recent} />
        <StatTile label="Offers" value={tiles.offers} />
      </div>

      {/* Applications per week */}
      <section className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
          Applications per week
        </h3>
        <WeeklyChart weeks={weeks} />
      </section>

      {/* Stage distribution */}
      <section className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 px-4 py-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
          Current stage distribution
        </h3>
        <div className="space-y-2">
          {stageCounts.counts.map(({ stage, count }) => (
            <div key={stage} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-zinc-600 dark:text-zinc-300">{stage}</span>
              <div className="flex-1 min-w-0">
                {count > 0 && (
                  <div
                    className="h-4 rounded-r bg-mauve-500 dark:bg-mauve-400"
                    style={{ width: `${(count / stageCounts.max) * 100}%` }}
                  />
                )}
              </div>
              <span className={`w-6 shrink-0 text-right text-xs tabular-nums ${count > 0 ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Time in stage — needs stage history data */}
      {timeInStage !== null && (
        <section className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-950/5 dark:ring-white/5 px-4 py-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
            Average time in stage
          </h3>
          {timeInStage.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Appears as jobs move between stages.
            </p>
          ) : (
            <div className="space-y-2">
              {timeInStage.map(({ stage, avg, n }) => (
                <div key={stage} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-zinc-600 dark:text-zinc-300">{stage}</span>
                  <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {avg < 1 ? '<1 day' : `${avg.toFixed(1)} days`}
                    <span className="text-zinc-400 dark:text-zinc-500"> · {n} move{n !== 1 ? 's' : ''}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
