'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Baby, ChevronRight, ClipboardList, Search } from 'lucide-react';
import { PageTitle, Workspace, useLoad } from '@/components/centers/kit';
import { Card, Pill } from '@/components/design/ui';
import { DisclosureSection, TaskStepper } from '@/components/design/workspace-patterns';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { SessionInfo } from '@/lib/auth';
import { opsApi } from '@/lib/operations';

function List({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => opsApi.children(centerId, {}), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [query, setQuery] = useState('');
  const [service, setService] = useState('');
  // Filter only the current authorized API projection. Never manufacture a child
  // record or show stale results from a previous centre/role.
  const services = useMemo(() => Array.from(new Set(
    (data?.items ?? []).flatMap(child => child.services),
  )).sort(), [data]);
  const filtered = useMemo(() => (data?.items ?? []).filter(child => {
    const name = `${child.preferredName ?? child.firstName} ${child.lastName}`.toLocaleLowerCase();
    return (!service || child.services.includes(service)) &&
      (!query.trim() || name.includes(query.trim().toLocaleLowerCase()));
  }), [data, query, service]);
  const isSupervisor = session.activeContext?.type === 'center' &&
    session.activeContext.role === 'CLINICAL_SUPERVISOR';

  return (
    <div className="space-y-5" data-testid="m5-therapist-workspace">
      <PageTitle title={isSupervisor ? 'Clinical oversight' : 'Start with a child'}
        body="Choose a child from your authorized caseload to continue a session, review progress, update a draft plan or prepare a report. Synthetic drafts only; signing and release are unavailable."
        testId="clinical-title" />
      <TaskStepper label="Internal clinical drafting workflow" steps={[
        { id: 'child', label: 'Choose a child', status: 'current', description: 'Authorized caseload only' },
        { id: 'session', label: 'Session evidence', status: 'pending', description: 'Record and save drafts' },
        { id: 'plan', label: 'Goals and progress', status: 'pending', description: 'Review versioned goals' },
        { id: 'release', label: 'Clinical sign / release', status: 'blocked', description: 'Report drafts remain available; signing and release unavailable' },
      ]} />
      <DisclosureSection title="How clinical drafting works" summary="Sessions → goals and evidence → report draft; safety gates remain closed">
        <p className="text-sm text-brand-inkMuted">Select an authorized child to open their existing session, therapy-plan, progress and report sections. Editing, submitting for internal review and draft saving retain the current permission and version checks. Never interpret a saved draft as a signed or family-released clinical record.</p>
      </DisclosureSection>
      <Card className="space-y-3 p-4 sm:p-5" testId="clinical-caseload-filters">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Choose a child to continue work</h2>
          {data && <Pill tone="info">{filtered.length} of {data.items.length} children shown</Pill>}
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">Find a child
            <span className="relative mt-1 block">
              <Search size={16} className="pointer-events-none absolute left-3 top-3 text-brand-inkMuted" aria-hidden="true" />
              <input type="search" value={query} onChange={event => setQuery(event.target.value)}
                placeholder="Search assigned names" data-testid="clinical-caseload-search"
                className="min-h-11 w-full rounded-control border border-border-light bg-surface-white py-2 pl-9 pr-3 text-sm focus-visible:outline-2 focus-visible:outline-brand-action" />
            </span>
          </label>
          <label className="block text-sm font-medium">Specialty
            <select value={service} onChange={event => setService(event.target.value)}
              data-testid="clinical-caseload-service"
              className="mt-1 min-h-11 w-full rounded-control border border-border-light bg-surface-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-brand-action">
              <option value="">All authorized services</option>
              {services.map(s => <option key={s} value={s}>{serviceLabel(s)}</option>)}
            </select>
          </label>
        </div>
      </Card>
      {failed && <ErrorState onRetry={() => void reload()} testId="clinical-list-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={3} testId="clinical-list-loading" /></Card>}
      {data && !data.items.length && <EmptyState icon={Baby} title="No children assigned"
        body="Children assigned to you appear here." testId="clinical-list-empty" />}
      {data && data.items.length > 0 && filtered.length === 0 && <EmptyState icon={Search}
        title="No children match these filters" body="Clear the search or select another specialty. No other records have been loaded."
        testId="clinical-filter-empty" />}
      {data && filtered.length > 0 && (
        <Card className="divide-y divide-border-light" testId="clinical-list">
          {filtered.map(c => (
            <Link key={c.id} href={`/app/clinical/${c.id}`}
              className="flex min-h-16 items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-brand-action"
              data-testid={`clinical-child-${c.id}`}>
              <span className="min-w-0">
                <span className="block font-semibold">{c.preferredName ?? c.firstName} {c.lastName}</span>
                <span className="text-[13px] text-brand-inkMuted">{c.services.map(serviceLabel).join(', ')}</span>
                <span className="block text-xs text-brand-action">Open sessions, plans, progress and report drafts</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </Card>
      )}
      <div className="flex items-start gap-2 text-xs text-brand-inkMuted">
        <ClipboardList size={16} aria-hidden="true" />
        No treatment decisions or completed encounters are inferred from this directory.
      </div>
    </div>
  );
}

export default function ClinicalPage() {
  return <Workspace active="clinical" permission="center.clinical.read" deniedText="The clinical workspace is available to therapists and clinical supervisors.">{(s, onError) => <List key={s.activeContext?.type === 'center' ? s.activeContext.centerId : 'no-center'} session={s} onError={onError} />}</Workspace>;
}
