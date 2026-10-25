import type { Workspace } from './clinical';

export type ReviewTiming = 'PAST_DUE' | 'DUE_TODAY' | 'COMING_UP' | 'SCHEDULED_LATER' | 'NOT_SCHEDULED' | 'DATE_UNAVAILABLE';
export type ReviewRow = {
  planId: string; planTitle: string; service: string; versionId: string; versionNumber: number;
  goalKey: string; goalTitle: string; horizon?: 'SHORT_TERM' | 'LONG_TERM';
  reviewOn?: string; targetOn?: string; timing: ReviewTiming;
  observationCount: number; linkedActivityCount: number;
};

// Centre-local DATE strings (rather than browser locale) prevent tomorrow
// in one timezone from being classified as overdue elsewhere.
export function centerLocalDay(timezone: string, at: Date): string | null {
  try {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const pick = (name: string) => parts.find(p => p.type === name)?.value ?? '';
  return [pick('year'), pick('month'), pick('day')].join('-');
  } catch { return null; } // invalid historic timezones must not crash Child 360.
}

// Find the next centre-local date transition, including DST 23/25-hour days.
// Never substitute the user's timezone. Called only by the review worklist.
export function nextReviewDayDelay(timezone: string, at: Date): number | null {
  const current = centerLocalDay(timezone, at);
  if (!current) return null;
  const start = at.getTime();
  let low = start, high = start + 26 * 60 * 60 * 1000;
  if (centerLocalDay(timezone, new Date(high)) === current) return null;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (centerLocalDay(timezone, new Date(mid)) === current) low = mid;
    else high = mid;
  }
  return Math.max(1, high - start + 20);
}

const dayEpoch = (day: string) => Date.parse(day + 'T00:00:00Z');
export function reviewTiming(reviewOn: string | undefined, today: string | null): ReviewTiming {
  if (!reviewOn || !/^\d{4}-\d{2}-\d{2}$/.test(reviewOn) ||
      !Number.isFinite(dayEpoch(reviewOn)) ||
      new Date(dayEpoch(reviewOn)).toISOString().slice(0, 10) !== reviewOn) return 'NOT_SCHEDULED';
  if (!today) return 'DATE_UNAVAILABLE';
  const offset = (dayEpoch(reviewOn) - dayEpoch(today)) / 86_400_000;
  if (offset < 0) return 'PAST_DUE';
  if (offset === 0) return 'DUE_TODAY';
  return offset <= 14 ? 'COMING_UP' : 'SCHEDULED_LATER';
}

export const REVIEW_TEXT: Record<ReviewTiming, string> = {
  PAST_DUE: 'Review date passed', DUE_TODAY: 'Review scheduled today',
  COMING_UP: 'Review within 14 days', SCHEDULED_LATER: 'Review scheduled later',
  NOT_SCHEDULED: 'No review date set', DATE_UNAVAILABLE: 'Review timing unavailable',
};
const ORDER: ReviewTiming[] = ['PAST_DUE', 'DUE_TODAY', 'COMING_UP', 'SCHEDULED_LATER', 'NOT_SCHEDULED', 'DATE_UNAVAILABLE'];

export function goalReviewRows(ws: Pick<Workspace, 'plans' | 'observations'>, today: string | null): ReviewRow[] {
  return ws.plans.flatMap(plan => {
    // Only the current plan version is actionable; historical goal keys
    // may have different definitions and cannot be silently re-used.
    const current = plan.versions[0];
    if (!current) return [];
    return current.goals.map(goal => ({
      planId: plan.id, planTitle: plan.title, service: plan.service,
      versionId: current.id, versionNumber: current.number, goalKey: goal.key,
      goalTitle: goal.title, horizon: goal.horizon, reviewOn: goal.reviewOn,
      targetOn: goal.targetOn, timing: reviewTiming(goal.reviewOn, today),
      observationCount: ws.observations.filter(o => o.planVersionId === current.id && o.goalKey === goal.key).length,
      linkedActivityCount: current.homeActivities.filter(a => a.goalKey === goal.key).length,
    }));
  }).sort((a,b) =>
    ORDER.indexOf(a.timing) - ORDER.indexOf(b.timing) ||
    (a.reviewOn ?? '9999-12-31').localeCompare(b.reviewOn ?? '9999-12-31') ||
    a.planTitle.localeCompare(b.planTitle) ||
    a.goalKey.localeCompare(b.goalKey));
}

export const goalReviewAnchor = (planId: string, goalKey: string) => 'goal-review-' + planId + '-' + goalKey;
