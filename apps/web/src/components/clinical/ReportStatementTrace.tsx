'use client';

import Link from 'next/link';
import { FileCheck2, Link2Off } from 'lucide-react';
import type { ReportVersion, StatementTrace } from '@/lib/reports';

const TITLES: Record<StatementTrace['section'], string> = {
  assessment: 'Assessment', goals: 'Goals and observations', sessions: 'Sessions',
};
function sourceGoal(v: ReportVersion, ref: string) {
  if (ref.startsWith('planVersion:')) {
    const m = /^planVersion:([0-9a-f-]{36}):goal:([a-z0-9-]{1,40})$/i.exec(ref);
    return m ? { version: m[1], goal: m[2] } : null;
  }
  if (ref.startsWith('observation:')) {
    const id = ref.slice('observation:'.length);
    for (const g of v.evidence.goals) {
      if ([...(g.prior ? [g.prior] : []), ...g.points].some(p => p.observationId === id)
        && g.planVersionId) return { version: g.planVersionId, goal: g.key };
    }
  }
  if (ref.startsWith('goalCheckpoint:')) {
    const record = (v.evidence.checkpoints ?? []).find(c => c.ref === ref);
    if (record) return { version: record.planVersionId, goal: record.goalKey };
  }
  return null;
}

export function ReportStatementTrace({ version, childId }: { version: ReportVersion; childId: string }) {
  const traced = version.statementTrace ?? [];
  return <section className="space-y-3 rounded-control border border-border-light bg-surface-subtle p-4"
    aria-label="Saved statement evidence trace" data-testid="saved-statement-trace">
    <div className="flex items-center gap-2">
      <FileCheck2 size={17} className="text-brand-action" aria-hidden="true" />
      <h3 className="text-[15px] font-semibold">Saved statement source links</h3>
    </div>
    <p className="text-[12px] text-brand-inkMuted">This is an internal, unreleased snapshot. Matching hashes establish that the clinician-recorded passage and sources were saved together; they do not establish the clinical accuracy or adequacy of the statements.</p>
    {!traced.length && <p className="text-[13px] text-brand-inkMuted" data-testid="statement-trace-empty">
      No clinician-applied, source-linked statements were recorded for this snapshot.
    </p>}
    {traced.map(section => <div key={section.section}
      className="space-y-2 rounded-control border border-border-light bg-surface-white p-3"
      data-testid={`statement-trace-section-${section.section}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[14px] font-semibold">{TITLES[section.section]}</h4>
        <span className="text-[12px] text-brand-inkMuted" data-testid={`statement-trace-status-${section.section}`}>
          {section.status === 'LINKED_TO_SAVED_TEXT' ? 'Saved statement and source fingerprints match' :
            section.status === 'SECTION_EDITED' ? 'Section text changed after linking — references not attributed' :
            section.status === 'PASSAGE_MISMATCH' ? 'Recorded passage cannot be matched to this saved text' :
            'A recorded source differs from the saved evidence'}
        </span>
      </div>
      {section.status !== 'LINKED_TO_SAVED_TEXT' ?
        <p className="flex items-start gap-2 text-[12px] text-status-caution" role="status">
          <Link2Off size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          No source is presented as supporting the saved wording. Re-review the report’s recorded evidence before making new claims.
        </p> :
        <ol className="space-y-3" data-testid={`statement-trace-claims-${section.section}`}>
          {section.claims.map(c => <li key={c.index} className="space-y-2 border-t border-border-light pt-2">
            <p className="text-[12px] font-semibold">Statement {c.index} · clinician authored</p>
            <p className="whitespace-pre-wrap break-words text-[13px]">{c.text}</p>
            <p className="text-[12px] font-semibold text-brand-inkMuted">Recorded source references</p>
            <ul className="space-y-1">
              {c.sources.map(source => {
                const g = sourceGoal(version, source.ref);
                return <li key={source.ref} className="break-words text-[12px]" data-testid="statement-trace-source">
                  {g ? <Link className="text-brand-action underline"
                    href={`/app/clinical/${childId}#plan?version=${encodeURIComponent(g.version)}&goal=${encodeURIComponent(g.goal)}`}>
                    {source.label} · Inspect exact plan goal (permission required)
                  </Link> : <span>{source.label}</span>}
                </li>;
              })}
            </ul>
          </li>)}
        </ol>}
    </div>)}
  </section>;
}
