'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, ClipboardCheck } from 'lucide-react';
import { Card, Button, Pill } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { Workspace } from '@/lib/clinical';
import { centerLocalDay, nextReviewDayDelay, goalReviewRows, goalReviewAnchor, REVIEW_TEXT, type ReviewTiming } from '@/lib/goal-review';

const tone: Record<ReviewTiming, 'caution' | 'info' | 'neutral'> = {
  PAST_DUE: 'caution', DUE_TODAY: 'caution', COMING_UP: 'info',
  SCHEDULED_LATER: 'neutral', NOT_SCHEDULED: 'neutral', DATE_UNAVAILABLE: 'caution',
};

export function GoalReviewWorklist({ ws }: { ws: Workspace }) {
  const [expanded, setExpanded] = useState(false);
  const [today, setToday] = useState<string | null>(() => centerLocalDay(ws.timezone, new Date()));
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (pending) clearTimeout(pending);
      const now = new Date();
      setToday(centerLocalDay(ws.timezone, now));
      const delay = nextReviewDayDelay(ws.timezone, now);
      if (delay !== null) pending = setTimeout(refresh, delay);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (pending) clearTimeout(pending);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ws.timezone]);
  const rows = goalReviewRows(ws, today);
  const due = rows.filter(r => r.timing === 'PAST_DUE' || r.timing === 'DUE_TODAY').length;
  const upcoming = rows.filter(r => r.timing === 'COMING_UP').length;
  const missing = rows.filter(r => r.timing === 'NOT_SCHEDULED').length;
  const visible = expanded ? rows : rows.slice(0, 12);
  const jump = (planId: string, goalKey: string) => {
    const el = document.getElementById(goalReviewAnchor(planId, goalKey));
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  };
  return <Card className="space-y-3 p-4 md:p-5" testId="goal-review-worklist">
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <CalendarClock size={19} className="shrink-0 text-brand-action" aria-hidden="true" />
        <h2 className="text-[18px] font-semibold">Goal review worklist</h2>
      </div>
      <span className="text-[12px] text-brand-inkMuted">Centre-local date: {today ?? 'Unavailable'}</span>
    </div>
    <p className="text-[13px] text-brand-inkMuted">
      Clinician-entered review dates for current plan versions. A date flag is a scheduling reminder only:
      it does not mean a goal was achieved, that observations are sufficient, or that a clinical review is approved.
    </p>
    {!today && <p role="status" className="rounded-control border border-border-light p-3 text-[12px] text-brand-inkMuted" data-testid="goal-review-timezone-invalid">The saved centre timezone is not recognized. Review timing is unavailable until centre settings are corrected; goals and plan editing remain accessible.</p>}
    <div className="flex flex-wrap gap-2 text-[12px]" data-testid="goal-review-summary">
      <Pill tone={due ? 'caution' : 'neutral'}>{due} due or past date</Pill>
      <Pill tone="info">{upcoming} within 14 days</Pill>
      <Pill tone="neutral">{missing} without review date</Pill>
    </div>
    {rows.length === 0 && <p className="text-[13px] text-brand-inkMuted" data-testid="goal-review-empty">
      No recorded goals in current plan versions yet.
    </p>}
    <ul className="space-y-2">
      {visible.map(row => <li key={row.versionId + ':' + row.goalKey}
        className="flex min-w-0 flex-col gap-2 rounded-control border border-border-light bg-surface-white p-3 sm:flex-row sm:items-center sm:justify-between"
        data-testid={'goal-review-row-' + row.goalKey}>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words text-[13px] font-semibold">{row.goalTitle}</span>
            <Pill tone={tone[row.timing]}>{REVIEW_TEXT[row.timing]}</Pill>
          </div>
          <p className="break-words text-[12px] text-brand-inkMuted">
            {row.planTitle} · {serviceLabel(row.service)} · Version {row.versionNumber}
            {' · '}{row.horizon === 'SHORT_TERM' ? 'Short-term' : row.horizon === 'LONG_TERM' ? 'Long-term' : 'Uncategorized'}
            {row.reviewOn ? ' · Review ' + row.reviewOn : ''}
            {row.targetOn ? ' · Target ' + row.targetOn : ''}
          </p>
          <p className="flex items-center gap-1 text-[12px] text-brand-inkMuted">
            <ClipboardCheck size={13} aria-hidden="true" />
            {row.observationCount} recorded observation(s) for this exact version · {row.linkedActivityCount} linked home activity(ies)
          </p>
        </div>
        <button type="button" className="min-h-[44px] shrink-0 self-start rounded-control border border-border-light px-3 text-[13px] font-semibold text-brand-action hover:bg-surface-subtle sm:self-center"
          onClick={() => jump(row.planId, row.goalKey)}
          data-testid={'goal-review-open-' + row.goalKey}>
          Inspect goal
        </button>
      </li>)}
    </ul>
    {rows.length > 12 && <Button size="sm" variant="secondary" onClick={() => setExpanded(v => !v)} data-testid="goal-review-show-all">
      {expanded ? 'Show first 12' : 'Show all ' + rows.length + ' goals'}
    </Button>}
    <p className="text-[12px] text-brand-inkMuted">
      This is an internal planning view only; review dates do not trigger notifications, clinical sign-off, or family access.
    </p>
  </Card>;
}
