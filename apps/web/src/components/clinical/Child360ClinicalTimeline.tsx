'use client';

import { useMemo, useState } from 'react';
import { History, ArrowRight } from 'lucide-react';
import { Card } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { Workspace } from '@/lib/clinical';
import {
  child360Timeline, filterChild360Timeline,
  type ClinicalTimelineKind, type ClinicalTimelineTab,
} from '@/lib/child360-timeline';

const types: { value: ClinicalTimelineKind | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All events' },
  { value: 'PLAN_VERSION', label: 'Plan versions' },
  { value: 'GOAL_REVIEW', label: 'Goal reviews' },
  { value: 'OBSERVATION', label: 'Observations' },
  { value: 'SESSION', label: 'Sessions' },
  { value: 'ASSESSMENT', label: 'Assessments' },
];
const labels: Record<ClinicalTimelineKind, string> = {
  PLAN_VERSION: 'Plan version', GOAL_REVIEW: 'Goal review', OBSERVATION: 'Observation',
  SESSION: 'Session', ASSESSMENT: 'Assessment',
};
const selectClass = 'mt-1 min-h-[44px] w-full rounded-control border border-border-light bg-surface-white px-3 py-2 text-[13px] focus-visible:outline-2 focus-visible:outline-brand-action';
const PAGE_SIZE = 12;

/** No new fetch: timeline sees only the already scoped clinician Workspace. */
export function Child360ClinicalTimeline({ ws, onNavigate }: {
  ws: Workspace; onNavigate: (tab: ClinicalTimelineTab) => void;
}) {
  const [kind, setKind] = useState<ClinicalTimelineKind | 'ALL'>('ALL');
  const [service, setService] = useState('ALL');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const events = useMemo(() => child360Timeline(ws), [ws]);
  const services = [...new Set(events.map(event => event.service).filter((value): value is string => !!value))].sort();
  const filtered = filterChild360Timeline(events, kind, service);
  const visible = filtered.slice(0, limit);
  const selectKind = (value: ClinicalTimelineKind | 'ALL') => { setKind(value); setLimit(PAGE_SIZE); };
  const selectService = (value: string) => { setService(value); setLimit(PAGE_SIZE); };
  return (
    <Card className="space-y-3 p-4 sm:p-5" testId="child360-clinical-timeline">
      <div className="flex items-center gap-2">
        <History size={18} className="shrink-0 text-brand-action" aria-hidden="true" />
        <h3 className="text-[17px] font-semibold">Clinical activity timeline</h3>
      </div>
      <p className="text-[12px] text-brand-inkMuted">
        Recorded plan-version updates, goal reviews, observations, unsigned session notes and assessment drafts
        from your authorized specialties only. This is a record history, not a clinical outcome or approval.
        Goal reviews are ordered by server-recorded entry date, not the clinician-entered review date.
        Family practice feedback and appointments are not treated as clinical evidence.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[12px] font-semibold">
          Event type
          <select className={selectClass} value={kind}
            onChange={event => selectKind(event.target.value as ClinicalTimelineKind | 'ALL')}
            data-testid="child360-timeline-kind">
            {types.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold">
          Therapy specialty
          <select className={selectClass} value={service}
            onChange={event => selectService(event.target.value)}
            data-testid="child360-timeline-service">
            <option value="ALL">All authorized specialties</option>
            {services.map(value => <option key={value} value={value}>{serviceLabel(value)}</option>)}
          </select>
        </label>
      </div>
      <p className="text-[12px] text-brand-inkMuted" data-testid="child360-timeline-count">
        Showing {visible.length} of {filtered.length} matching recorded event(s)
        {filtered.length !== events.length ? ` · ${events.length} total authorized events` : ''}.
      </p>
      {!events.length && <p className="text-[13px]" data-testid="child360-timeline-empty">
        No authorized clinical activity recorded.
      </p>}
      {!!events.length && !filtered.length && <p className="text-[13px]" data-testid="child360-timeline-filter-empty">
        No recorded events match these filters. Change the event type or specialty to view more records.
      </p>}
      {visible.length > 0 && <ol className="divide-y divide-border-light" data-testid="child360-timeline">
        {visible.map(event => <li key={event.id}
          className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3"
          data-testid="child360-timeline-event">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="break-words text-[14px] font-semibold">{event.title}</p>
            <p className="break-words text-[12px] text-brand-inkMuted">
              {event.date} · {labels[event.kind]} · {event.service ? serviceLabel(event.service) : 'Specialty unavailable'}
            </p>
            <p className="break-words text-[12px]">{event.detail}</p>
          </div>
          <button type="button" onClick={() => onNavigate(event.tab)}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-1 text-[12px] font-semibold text-brand-action hover:underline focus-visible:outline-2 focus-visible:outline-brand-action"
            aria-label={`Open ${event.tab} section for ${event.title} on ${event.date}`}>
            View section <ArrowRight size={14} aria-hidden="true"/>
          </button>
        </li>)}
      </ol>}
      {filtered.length > visible.length && <button type="button" data-testid="child360-timeline-more"
        onClick={() => setLimit(value => value + PAGE_SIZE)}
        className="min-h-[44px] rounded-control border border-border-light bg-surface-white px-4 py-2 text-[13px] font-semibold text-brand-action hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-brand-action">
        Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more records
      </button>}
    </Card>
  );
}
