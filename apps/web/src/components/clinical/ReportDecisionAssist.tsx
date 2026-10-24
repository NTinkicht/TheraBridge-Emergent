'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/design/ui';
import { FormAlert } from '@/components/auth/Field';
import { errorText } from '@/components/centers/kit';
import { reportsApi, type EvidenceReview, type EvidenceReviewSection } from '@/lib/reports';

const SECTIONS = ['assessment', 'goals', 'sessions'] as const;
const TITLES: Record<EvidenceReviewSection, string> = {
  assessment: 'Recorded assessments',
  goals: 'Recorded goals and observations',
  sessions: 'Recorded session activity',
};
type Draft = { text: string; sourceRef: string };
const empty: Draft = { text: '', sourceRef: '' };
const VALIDATION_MESSAGE = 'Enter your own reviewed statement and explicitly select its source first.';

/**
 * Every click writes a server-owned, immutable decision and shares its report
 * version transaction. Never present source identity as semantic/clinical fact
 * validation. All text is the clinician's assertion, not a released report.
 */
export function ReportDecisionAssist({ centerId, reportId, getVersion, flush, onCommitted, onError }: {
  centerId: string; reportId: string; getVersion: () => number;
  flush: () => Promise<boolean>; onCommitted: () => Promise<void>; onError: (e: unknown) => void;
}) {
  const [view, setView] = useState<EvidenceReview | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<EvidenceReviewSection, Draft>>({
    assessment: { ...empty }, goals: { ...empty }, sessions: { ...empty },
  });
  const [pending, setPending] = useState<Record<string, { key: string; payload: string }>>({});
  useEffect(() => {
    let alive = true;
    reportsApi.decisions(centerId, reportId)
      .then(data => { if (alive) { setView(data); setFailure(null); } })
      .catch(e => { if (alive) setFailure(errorText(e, onError) || 'Unable to load saved review decisions.'); });
    return () => { alive = false; };
  }, [centerId, reportId, onError]);

  async function submit(section: EvidenceReviewSection, action: 'APPLIED' | 'OMITTED' | 'RECONSIDERED') {
    if (!view || busy) return;
    const choice = drafts[section];
    if (action === 'APPLIED' && (!choice.text.trim() || !choice.sourceRef)) {
      setFailure(VALIDATION_MESSAGE);
      return;
    }
    setFailure(null);
    setBusy(true);
    try {
      if (!(await flush())) {
        setFailure('Report draft changes could not be saved. Resolve the save error before recording a decision.');
        return;
      }
      const body = {
        section, action, version: getVersion(),
        proposalFingerprint: view.sources[section].proposalFingerprint,
        ...(action === 'APPLIED' ? { claims: [{ text: choice.text.trim(), sourceRefs: [choice.sourceRef] }] } : {}),
      };
      const canonical = JSON.stringify(body);
      const previous = pending[section];
      const key = previous?.payload === canonical ? previous.key : crypto.randomUUID();
      setPending(old => ({ ...old, [section]: { payload: canonical, key } }));
      const result = await reportsApi.recordDecision(centerId, reportId, { ...body, idempotencyKey: key });
      if (result.claimValidation !== 'REFERENCED_NOT_VERIFIED' || !result.persisted)
        throw new Error('Decision receipt lacks the required non-validation marker.');
      setPending(old => { const next = { ...old }; delete next[section]; return next; });
      // Parent reload remounts the editor at its new persisted report version.
      await onCommitted();
    } catch (e) {
      const msg = errorText(e, onError);
      setFailure(msg || 'The decision was not confirmed. Your reviewed wording is still on screen; retry using the same request.');
    } finally {
      setBusy(false);
    }
  }

  if (failure && !view) return <div role="alert" className="text-status-danger" data-testid="report-decisions-load-error">
    {failure} <Button size="sm" variant="secondary" onClick={() => void reportsApi.decisions(centerId, reportId).then(data => { setView(data); setFailure(null); }).catch(e => setFailure(errorText(e, onError) || 'Unable to load review history.'))}>Retry loading</Button>
  </div>;
  if (!view) return <p className="text-[13px] text-brand-inkMuted" role="status" data-testid="report-decisions-loading">Loading saved evidence decisions…</p>;
  return (
    <div className="space-y-3" data-testid="report-decisions-persistent">
      <p className="rounded-control bg-status-cautionSurface p-3 text-[13px]">
        <strong>Referenced, not verified.</strong> The system checks evidence identity, authorization and freshness, not the clinical truth of your wording. Recorded decisions are non-clinical drafts and are not approvals or family releases.
      </p>
      {failure && <FormAlert tone="danger" testId="report-decisions-error">{failure}</FormAlert>}
      {SECTIONS.map(section => {
        const history = view.latest[section];
        const chosen = drafts[section];
        const sources = view.sources[section].sources;
        const omitted = history?.action === 'OMITTED';
        const applied = history?.action === 'APPLIED';
        const staleness = history?.status === 'REQUIRES_REVIEW';
        return <section key={section} className="space-y-2 rounded-control border border-border-light bg-white p-3" data-testid={`report-suggestion-${section}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[14px] font-semibold">{TITLES[section]}</h4>
            <span className="text-[12px] font-semibold text-brand-inkMuted" data-testid={`report-assist-decision-${section}`}>
              {staleness ? 'Evidence or draft text changed — review required'
                : applied ? 'Added to draft (source-referenced only)'
                : omitted ? 'Omitted (saved)'
                : history?.action === 'RECONSIDERED' ? 'Reconsidered (saved)' : 'Awaiting decision'}
            </span>
          </div>
          {history && <p className="text-[12px] text-brand-inkMuted" data-testid={`report-decision-history-${section}`}>
            Last saved decision: {history.action.toLowerCase()} · revision {history.reportRevision} · {history.status.replaceAll('_', ' ').toLowerCase()}. Claim accuracy is not machine-verified.
          </p>}
          {staleness && <p role="alert" className="text-[13px] text-status-caution">The recorded references or report text have changed. Review the available current sources before making a new decision; earlier decisions remain in the audit history.</p>}
          {omitted ? <Button size="sm" variant="secondary" disabled={busy}
            data-testid={`report-assist-restore-${section}`} onClick={() => void submit(section, 'RECONSIDERED')}>Reconsider omitted suggestion</Button>
          : !applied ? <>
            <label className="block text-[13px] font-semibold">
              Supporting source (required)
              <select className="mt-1 min-h-[44px] w-full rounded-control border border-border-strong bg-white p-2 text-[13px]"
                aria-label={`Source for ${section} claim`} data-testid={`report-assist-source-${section}`}
                value={chosen.sourceRef} onChange={e => { setFailure(f => f === VALIDATION_MESSAGE ? null : f); setDrafts(old => ({ ...old, [section]: { ...old[section], sourceRef: e.target.value } })); }}>
                <option value="">Select a recorded source</option>
                {sources.map(source => <option key={source.ref} value={source.ref}>{source.label}</option>)}
              </select>
            </label>
            <label className="block text-[13px] font-semibold">
              Your own reviewed factual statement
              <textarea className="mt-1 w-full rounded-control border border-border-strong bg-white p-2 text-[14px]"
                rows={3} maxLength={1200} aria-label={`Review factual ${section} passage`}
                data-testid={`report-assist-edit-${section}`} value={chosen.text}
                onChange={e => { setFailure(f => f === VALIDATION_MESSAGE ? null : f); setDrafts(old => ({ ...old, [section]: { ...old[section], text: e.target.value } })); }}/>
            </label>
            <p className="text-[12px] text-brand-inkMuted">Use the exact recorded value and unit for observation claims. Do not infer a diagnosis or trend. The server saves the decision and draft text atomically.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={busy} data-testid={`report-assist-omit-${section}`}
                onClick={() => void submit(section, 'OMITTED')}>Omit and record</Button>
              <Button size="sm" variant="secondary" disabled={busy || !chosen.text.trim() || !chosen.sourceRef}
                data-testid={`report-assist-apply-${section}`} onClick={() => void submit(section, 'APPLIED')}>Append and record decision</Button>
            </div>
          </> : <p className="text-[12px] text-brand-inkMuted">
            {applied ? 'Edit the draft section below to correct a saved passage. The audit history remains immutable.' : 'Review the available evidence before recording a new decision.'}
          </p>}
        </section>;
      })}
    </div>
  );
}
