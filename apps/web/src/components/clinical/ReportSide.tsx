'use client';

import { useState } from 'react';
import { History, MessageSquareText } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { errorText } from '@/components/centers/kit';
import { GoalChart, STATUS_TEXT } from '@/components/clinical/GoalChart';
import { Button, Card, Pill } from '@/components/design/ui';
import { KIND_LABEL, SECTIONS, reportsApi, type ReportDetail, type ReportVersion } from '@/lib/reports';

const when = (s: string) => new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export function Evidence({ d }: { d: ReportDetail }) {
  const e = d.evidence;
  return (
    <Card className="space-y-3 p-5" testId="report-evidence">
      <h2 className="text-[16px] font-semibold">Recorded evidence</h2>
      <p className="text-[13px] text-brand-inkMuted">{e.period.from} to {e.period.to} · {e.assessments.length} assessments · {e.sessions.drafts} session drafts · {e.sessions.completedVisits} completed visits{e.plan ? ` · ${e.plan.title} v${e.plan.versionNumber}` : ''}</p>
      {!e.plan && <p className="text-[14px] text-brand-inkMuted" data-testid="evidence-no-plan">No therapy plan for this service yet, so there are no goals to report on.</p>}
      {e.goals.map((g) => (
        <div key={g.key} className="border-t border-border-light pt-3" data-testid={`evidence-goal-${g.key}`}>
          <p className="text-[14px] font-semibold">{g.title}</p>
          <GoalChart points={g.points} baseline={g.baseline} target={g.target} measure={g.measure} from={e.period.from} to={e.period.to} testId={`evidence-chart-${g.key}`} />
          <p className="text-[12px] text-brand-inkMuted">{g.status === 'recorded' ? `${g.points.length} ${STATUS_TEXT.recorded}` : STATUS_TEXT[g.status]}{g.prior ? ` · before the period: ${g.prior.value} (${g.prior.date})` : ''}</p>
        </div>
      ))}
    </Card>
  );
}

export function Review({ centerId, d, onReload, onError }: { centerId: string; d: ReportDetail; onReload: () => Promise<void>; onError: (e: unknown) => void }) {
  const [comment, setComment] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const send = async (returned: boolean) => {
    setErr(null);
    if (comment.trim().length < 3) return setErr('Write a comment of at least 3 characters.');
    try { await (returned ? reportsApi.giveBack : reportsApi.comment)(centerId, d.report.id, comment.trim()); setComment(''); await onReload(); }
    catch (e) { setErr(errorText(e, onError)); }
  };
  return (
    <Card className="space-y-3 p-5" testId="report-review">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold"><MessageSquareText size={16} aria-hidden="true" />Supervisor review</h2>
      {!d.report.reviewNotes.length && <p className="text-[14px] text-brand-inkMuted" data-testid="review-empty">No review comments yet.</p>}
      <ol className="space-y-2">
        {d.report.reviewNotes.map((n, i) => (
          <li key={i} className="rounded-control bg-surface-subtle p-3 text-[14px]" data-testid={`review-note-${i}`}>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-brand-inkMuted"><span className="font-semibold text-brand-ink">{n.byName}</span>{when(n.at)}{n.kind === 'returned' && <Pill tone="caution">Returned for revision</Pill>}</div>
            <p className="mt-1 whitespace-pre-wrap">{n.comment}</p>
          </li>
        ))}
      </ol>
      {d.canReview && (
        <div className="space-y-2">
          {err && <FormAlert tone="danger" testId="review-error">{err}</FormAlert>}
          <label className="block text-[14px] font-medium">Comment<textarea className="mt-1 w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px]" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} data-testid="review-comment" /></label>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void send(false)} data-testid="review-add-comment">Add comment</Button>
            <Button size="sm" onClick={() => void send(true)} data-testid="review-return">Return for revision</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function HistoryList({ centerId, d, onError, onCompare }: { centerId: string; d: ReportDetail; onError: (e: unknown) => void; onCompare: (v: ReportVersion) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const open = async (id: string) => {
    setBusy(id);
    try { onCompare(await reportsApi.version(centerId, id)); } catch (e) { errorText(e, onError); } finally { setBusy(null); }
  };
  return (
    <Card className="space-y-2 p-5" testId="report-history">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold"><History size={16} aria-hidden="true" />Draft history</h2>
      <p className="text-[12px] text-brand-inkMuted">Autosave keeps the working draft. Saved versions are kept unchanged.</p>
      <ol className="space-y-1.5">
        {d.versions.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border-light p-2.5 text-[13px]" data-testid={`history-${v.number}`}>
            <span><span className="font-semibold">Version {v.number}</span> · {KIND_LABEL[v.kind] ?? v.kind} · {v.author} · {when(v.createdAt)}</span>
            <Button size="sm" variant="ghost" onClick={() => void open(v.id)} disabled={busy === v.id} data-testid={`history-compare-${v.number}`}>Compare</Button>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function Compare({ v, current, onClose }: { v: ReportVersion; current: Record<string, string>; onClose: () => void }) {
  const changed = SECTIONS.filter(([k]) => (v.sections[k] ?? '') !== (current[k] ?? '')).length;
  return (
    <Card className="space-y-3 p-5" testId="report-compare">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold">Version {v.number} compared with the current draft</h2>
        <Button size="sm" variant="ghost" onClick={onClose} data-testid="compare-close">Close</Button>
      </div>
      <p className="text-[13px] text-brand-inkMuted" data-testid="compare-summary">{changed ? `${changed} of ${SECTIONS.length} sections changed since version ${v.number}.` : `No changes since version ${v.number}.`} Saved {when(v.createdAt)} by {v.author}.</p>
      {SECTIONS.map(([k, label]) => {
        const diff = (v.sections[k] ?? '') !== (current[k] ?? '');
        return (
          <div key={k} className="space-y-1" data-testid={`compare-section-${k}`}>
            <p className="flex items-center gap-2 text-[14px] font-semibold">{label}<Pill tone={diff ? 'caution' : 'neutral'}>{diff ? 'Changed' : 'Same'}</Pill></p>
            {diff && (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <p className="whitespace-pre-wrap rounded-control bg-surface-subtle p-2.5 text-[13px]"><span className="block text-[11px] font-semibold uppercase text-brand-inkMuted">Version {v.number}</span>{v.sections[k] || '(empty)'}</p>
                <p className="whitespace-pre-wrap rounded-control bg-status-infoSurface p-2.5 text-[13px]"><span className="block text-[11px] font-semibold uppercase text-brand-inkMuted">Current</span>{current[k] || '(empty)'}</p>
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
