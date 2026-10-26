'use client';

import { GitCompareArrows } from 'lucide-react';
import type { Evidence } from '@/lib/reports';
import { compareRecordedReportEvidence, type EvidenceRowStatus } from '@/lib/report-evidence-diff';

const statusText: Record<EvidenceRowStatus, string> = {
  UNCHANGED_REFERENCES: 'Same recorded source IDs, dates and values in both read models',
  DIFFERENT_REFERENCES: 'Recorded observation source references or values differ',
  DIFFERENT_DEFINITION: 'Saved goal definition differs from the current read model',
  NOT_IN_CURRENT: 'Exact saved goal version not present in current report evidence',
  ADDED_SINCE_SNAPSHOT: 'Goal version appears in current evidence, not in the saved snapshot',
  LEGACY_IDENTITY_UNAVAILABLE: 'Saved legacy goal has no exact plan-version identity',
  SOURCE_IDS_UNAVAILABLE: 'Source identifiers unavailable; equivalence cannot be established',
  NO_OBSERVATIONS: 'No observation records in either read model',
};

export function ReportEvidenceDiff({ saved, current }: { saved: Evidence; current: Evidence }) {
  const comparison = compareRecordedReportEvidence(saved,current);
  const differences = comparison.goals.filter(item =>
    item.status !== 'UNCHANGED_REFERENCES' && item.status !== 'NO_OBSERVATIONS');
  const hasAssessmentDiff = comparison.assessmentIdsOnlyInSaved.length > 0 ||
    comparison.assessmentIdsOnlyInCurrent.length > 0;
  return <details className="rounded-control border border-border-light bg-surface-subtle p-3"
    data-testid="report-evidence-diff">
    <summary className="min-h-[44px] cursor-pointer text-[14px] font-semibold focus-visible:outline-2 focus-visible:outline-brand-action">
      <span className="inline-flex items-center gap-2"><GitCompareArrows size={17} aria-hidden="true"/>
        Compare saved vs current evidence records</span>
      <span className="mt-1 block text-[12px] font-normal text-brand-inkMuted">
        {differences.length} goal source difference(s) or attribution gaps
        {hasAssessmentDiff ? ' · assessment references differ' : ''}
        {comparison.sessionsCountChanged ? ' · session counts differ' : ''}.
      </span>
    </summary>
    <div className="space-y-3 border-t border-border-light pt-3 text-[12px]">
      <p className="text-brand-inkMuted">
        Read-only comparison of the selected immutable report-version evidence with the current authorized
        report evidence read model. Changes or matches are source-record differences only, NOT clinical validation,
        longitudinal improvement, clinician approval, family publication or evidence adequacy.
      </p>
      {!comparison.samePeriod && <p className="rounded-control border border-border-light bg-surface-white p-3"
        data-testid="report-evidence-period-warning">
        The report period differs (saved {comparison.savedPeriod.from} to {comparison.savedPeriod.to};
        current {comparison.currentPeriod.from} to {comparison.currentPeriod.to}). Comparisons may represent
        different observation windows; do not assume continuity.
      </p>}
      <p data-testid="report-evidence-assessment-count">
        Assessment identifiers only in saved snapshot: {comparison.assessmentIdsOnlyInSaved.length};
        only in current evidence: {comparison.assessmentIdsOnlyInCurrent.length}.
      </p>
      <p data-testid="report-evidence-session-count">
        Session record counts {comparison.sessionsCountChanged ? 'differ' : 'match'} between these read models;
        counts are not attendance or treatment efficacy claims.
      </p>
      <div className="space-y-2" data-testid="report-evidence-goal-diffs">
        {comparison.goals.length === 0 ? <p>No goal definitions in these evidence snapshots.</p> :
          comparison.goals.map((goal,index)=><div key={goal.planVersionId+'|'+goal.key+'|'+index}
            className="rounded-control border border-border-light bg-surface-white p-3"
            data-testid="report-evidence-goal-diff">
            <p className="break-words text-[13px] font-semibold">{goal.title}</p>
            <p className="break-all text-brand-inkMuted">
              Saved goal: {goal.planVersionId ?? 'Legacy — version missing'} / {goal.key}
            </p>
            <p className="mt-1" data-testid="report-evidence-goal-status">{statusText[goal.status]}</p>
            <p className="text-brand-inkMuted">
              Recorded sources: {goal.savedSources} in selected saved version;
              {' '}{goal.currentSources} in current evidence.
            </p>
          </div>)}
      </div>
    </div>
  </details>;
}
