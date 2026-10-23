import type { Workspace } from './clinical';

// Read-only evidence bucketing; observations are never interpolated or converted
// into automated clinical conclusions. Dates are date-only, so UTC is used to
// define ISO weeks (Monday) rather than the viewer's computer timezone.
export type Granularity = 'week' | 'month';
export type Observation = Workspace['observations'][number];
export interface PeriodSummary {
  periodStart: string;
  periodEnd: string;
  count: number;
  min: number;
  max: number;
  average: number;
  latest: number;
  latestOn: string;
  sourceIds: string[];
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function periodStart(date: string, interval: Granularity): string {
  if (!DATE.test(date) || iso(new Date(date + 'T00:00:00.000Z')) !== date) throw Error('Invalid observed date');
  if (interval === 'month') return date.slice(0, 7) + '-01';
  const d = new Date(date + 'T00:00:00.000Z');
  const days = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - days);
  return iso(d);
}

export function summarizeObservations(
  observations: Observation[], planVersionId: string, goalKey: string, interval: Granularity,
): PeriodSummary[] {
  // Never conflate reused goal keys from different plan versions.
  const filtered = observations
    .filter(o => o.planVersionId === planVersionId && o.goalKey === goalKey && Number.isFinite(o.value) && DATE.test(o.observedOn))
    .sort((a, b) => a.observedOn.localeCompare(b.observedOn) || a.id.localeCompare(b.id));
  const periods = new Map<string, Observation[]>();
  for (const o of filtered) {
    const key = periodStart(o.observedOn, interval);
    periods.set(key, [...(periods.get(key) ?? []), o]);
  }
  return Array.from(periods, ([start, items]) => {
    const first = new Date(start + 'T00:00:00.000Z');
    const end = new Date(first);
    if (interval === 'week') end.setUTCDate(first.getUTCDate() + 6);
    else { end.setUTCMonth(first.getUTCMonth() + 1); end.setUTCDate(0); }
    const values = items.map(x => x.value);
    return {
      periodStart: start, periodEnd: iso(end), count: items.length,
      min: Math.min(...values), max: Math.max(...values),
      average: Number((values.reduce((a,b) => a+b, 0) / values.length).toFixed(2)),
      latest: items[items.length - 1].value, latestOn: items[items.length - 1].observedOn,
      sourceIds: items.map(x => x.id),
    };
  }).sort((a,b) => a.periodStart.localeCompare(b.periodStart));
}

export function currentGoals(ws: Workspace) {
  return ws.plans.flatMap(p => {
    const current = p.versions.find(v => !['SUPERSEDED', 'WITHDRAWN'].includes(v.status));
    if (!current) return [];
    return current.goals.map(g => ({...g, planId: p.id, planTitle: p.title, service: p.service, planVersionId: current.id, planVersionNumber: current.number, status: current.status}));
  });
}

/** Historical goals are always read-only and retain their own exact plan-version identity. */
export function historicalGoals(ws: Workspace) {
  return ws.plans.flatMap(p => {
    const active = p.versions.find(v => !['SUPERSEDED', 'WITHDRAWN'].includes(v.status));
    return p.versions.filter(v => v.id !== active?.id).flatMap(v =>
      v.goals.map(g => ({
        ...g, planId: p.id, planTitle: p.title, service: p.service,
        planVersionId: v.id, planVersionNumber: v.number, status: v.status,
      })),
    );
  });
}
