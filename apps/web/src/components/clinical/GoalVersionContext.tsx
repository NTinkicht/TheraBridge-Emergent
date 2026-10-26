'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GitCompareArrows, History } from 'lucide-react';
import { Card } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { Workspace } from '@/lib/clinical';
import { goalVersionContext } from '@/lib/goal-version-context';

const filterInput = 'mt-1 min-h-[44px] w-full rounded-control border border-border-light bg-surface-white px-3 py-2 text-[13px] focus-visible:outline-2 focus-visible:outline-brand-action';

/** Read-only; authorized workspace already scopes both versions and evidence. */
export function GoalVersionContext({ ws, onNavigate }: { ws: Workspace; onNavigate: () => void }) {
  const [service, setService] = useState('ALL');
  const plans = goalVersionContext(ws);
  const services = [...new Set(plans.map(plan => plan.service))].sort();
  const selected = plans.filter(plan => service === 'ALL' || plan.service === service);
  const rows = selected.reduce((sum, plan) => sum + plan.rows.length, 0);
  return <Card className="space-y-3 p-4 sm:p-5" testId="progress-goal-version-context">
    <div className="flex items-center gap-2">
      <GitCompareArrows size={18} className="shrink-0 text-brand-action" aria-hidden="true" />
      <h3 className="text-[17px] font-semibold">Goal definitions and review history</h3>
    </div>
    <p className="text-[12px] text-brand-inkMuted">
      Read-only context across authorized plan versions. Every measurement and review belongs to an exact
      plan-version ID and goal key. Matching goal keys or titles do not establish continuity between versions.
      Review dates, targets and recorded values are facts on file, not evidence of achievement or clinical effectiveness.
    </p>
    <label className="block max-w-xs text-[12px] font-semibold">
      Therapy specialty
      <select className={filterInput} value={service} onChange={e => setService(e.target.value)}
        data-testid="progress-context-service">
        <option value="ALL">All authorized specialties</option>
        {services.map(value => <option key={value} value={value}>{serviceLabel(value)}</option>)}
      </select>
    </label>
    <p className="text-[12px] text-brand-inkMuted" data-testid="progress-context-count">
      {rows} saved goal definition(s) in {selected.length} authorized plan(s).
    </p>
    {!rows && <p className="text-[13px]" data-testid="progress-context-empty">
      No saved goal definitions within this selected specialty.
    </p>}
    {selected.map(plan => <section key={plan.planId} className="space-y-2" data-testid="progress-context-plan">
      <h4 className="break-words text-[14px] font-semibold">
        {plan.title} · {serviceLabel(plan.service)}
      </h4>
      <div className="space-y-2">
        {plan.rows.map(row => <details key={row.versionId+'|'+row.goalKey}
          className="rounded-control border border-border-light bg-surface-subtle"
          data-testid="progress-context-goal">
          <summary className="min-h-[44px] cursor-pointer p-3 text-[13px] font-semibold focus-visible:outline-2 focus-visible:outline-brand-action">
            <span className="break-words">{row.title} · plan v{row.versionNumber} · {row.currentVersion ? 'current' : 'historical'}</span>
            <span className="mt-1 block text-[12px] font-normal text-brand-inkMuted">
              {row.versionStatus.replaceAll('_',' ')} · {row.observations.length} measurement(s) · {row.checkpoints.length} clinician review entry/entries
            </span>
          </summary>
          <div className="space-y-3 border-t border-border-light p-3 text-[12px]"
            data-testid="progress-context-details">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>Baseline {row.baseline} · target {row.target} ({row.measure})</p>
              <p>Objective: {row.horizon?.replace('_','-') ?? 'Not categorized'}
                {' · '}Target date: {row.targetOn ?? 'Not set'}
                {' · '}Next review: {row.reviewOn ?? 'Not set'}</p>
            </div>
            {row.sameKeyOlderVersion !== null &&
              <p className="rounded-control border border-border-light bg-surface-white p-3"
                data-testid="progress-context-version-boundary">
                Same identifier appeared in an older plan version (v{row.sameKeyOlderVersion}).
                {row.definitionDifferences.length
                  ? ' Recorded goal definition fields differ: '+row.definitionDifferences.join(', ')+'.'
                  : ' Recorded definition fields match, but evidence remains version-separated.'}
                {' '}No observation or clinician checkpoint is automatically transferred.
              </p>}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="min-w-0 space-y-2 rounded-control border border-border-light bg-surface-white p-3">
                <p className="font-semibold">Recorded measurements · {row.observations.length}</p>
                {row.observations.length ? <ul className="space-y-2" data-testid="progress-context-observations">
                  {row.observations.map(obs => <li key={obs.id} className="min-w-0 break-words">
                    <span className="font-semibold">{obs.observedOn}</span> · {obs.value} ({row.measure})
                    <span className="block break-all text-[11px] text-brand-inkMuted">Evidence ID: {obs.id}</span>
                    {obs.note && <span className="block whitespace-pre-wrap">{obs.note}</span>}
                  </li>)}
                </ul> : <p className="text-brand-inkMuted">No observations recorded for this exact goal version.</p>}
              </div>
              <div className="min-w-0 space-y-2 rounded-control border border-border-light bg-surface-white p-3">
                <p className="flex items-center gap-1 font-semibold"><History size={14} aria-hidden="true"/>Clinician goal-review entries · {row.checkpoints.length}</p>
                {row.checkpoints.length ? <ul className="space-y-3" data-testid="progress-context-checkpoints">
                  {row.checkpoints.map((entry,index) => <li key={entry.at+'|'+index} className="min-w-0 break-words">
                    <p className="font-semibold">Recorded {entry.at.slice(0,10)} · clinician-entered review date {entry.reviewedOn}</p>
                    <p className="whitespace-pre-wrap">{entry.summary}</p>
                    <p className="text-[11px] text-brand-inkMuted">{entry.observationIds.length} explicitly selected observation reference(s); not independently validated here.</p>
                  </li>)}
                </ul> : <p className="text-brand-inkMuted">No clinician review checkpoints saved for this exact goal version.</p>}
              </div>
            </div>
            <Link href={`/app/clinical/${encodeURIComponent(ws.child.id)}#plan?version=${encodeURIComponent(row.versionId)}&goal=${encodeURIComponent(row.goalKey)}`}
              data-testid="progress-context-open-goal"
              onClick={event => {
                // A same-page hash-only Next navigation can resolve AFTER the
                // Plan tab mounts. Set the exact target URL synchronously before
                // switching tabs; keep modified clicks as normal links.
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
                    event.button !== 0) return;
                event.preventDefault();
                const href = event.currentTarget.getAttribute('href');
                if (!href) return;
                window.history.pushState(null, '', href);
                onNavigate();
              }}
              className="inline-flex min-h-[44px] items-center font-semibold text-brand-action underline">
              Inspect this goal in its plan version
            </Link>
          </div>
        </details>)}
      </div>
    </section>)}
  </Card>;
}
