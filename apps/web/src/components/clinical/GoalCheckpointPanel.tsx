'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/design/ui';
import { centerLocalDay } from '@/lib/goal-review';
import { clinicalApi, type PlanVersion, type Workspace } from '@/lib/clinical';

type Run = (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;
const input = 'mt-1 min-h-[44px] w-full rounded-control border border-border-light bg-surface-white px-3 py-2 text-[13px]';

export function GoalCheckpointPanel({ centerId, version, ws, editable, run }: {
  centerId: string; version: PlanVersion; ws: Workspace; editable: boolean; run: Run;
}) {
  const [goalKey, setGoalKey] = useState('');
  const [reviewedOn, setReviewedOn] = useState(() => centerLocalDay(ws.timezone, new Date()) ?? '');
  const [summary, setSummary] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const observations = ws.observations.filter(o => o.planVersionId === version.id && o.goalKey === goalKey);
  const checkpoints = version.goalCheckpoints ?? [];
  const chosenGoal = version.goals.find(g => g.key === goalKey);
  const canSave = editable && !busy && !!chosenGoal && !!reviewedOn &&
    summary.trim().length >= 10 && selected.length <= 20;
  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      const ok = await run(() => clinicalApi.goalCheckpoint(centerId, version.id, {
        goalKey, reviewedOn, summary: summary.trim(), observationIds: selected, version: version.version,
      }), 'Internal goal review checkpoint recorded. This is not a clinical approval.');
      if (ok) { setSummary(''); setSelected([]); }
    } finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-card border border-border-light bg-surface-subtle p-4"
    aria-label="Goal review checkpoints" data-testid="goal-checkpoint-panel">
    <h3 className="flex items-center gap-2 text-[15px] font-semibold">
      <ClipboardCheck size={17} className="text-brand-action" aria-hidden="true" />Clinician review checkpoints
    </h3>
    <p className="text-[12px] text-brand-inkMuted">
      Saved clinician statements tied to the exact goal version and explicitly selected observation IDs.
      Checkpoints are separate from supervisor comments, progress scores, and clinical approval.
      No automatic inference or family sharing.
    </p>
    {checkpoints.length ? <ol className="space-y-2" data-testid="goal-checkpoint-history">
      {checkpoints.map((item, i) => <li key={item.at + '-' + i}
        className="rounded-control border border-border-light bg-surface-white p-3 text-[13px]"
        data-testid={`goal-checkpoint-record-${i}`}>
        <p className="font-semibold">{version.goals.find(g => g.key === item.goalKey)?.title ?? item.goalKey} · {item.reviewedOn}</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{item.summary}</p>
        <p className="mt-1 break-all text-[12px] text-brand-inkMuted">
          {item.observationIds.length} explicitly linked observation(s){item.observationIds.length ? ': ' + item.observationIds.join(', ') : ' · No observation references selected'}.
          Internal draft only; not verified or approved.
        </p>
      </li>)}
    </ol> : <p className="text-[12px] text-brand-inkMuted" data-testid="goal-checkpoint-empty">No clinician review checkpoints recorded for this plan version.</p>}
    {editable && <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="block text-[12px] font-semibold">Reviewed goal
          <select className={input} value={goalKey} disabled={busy} data-testid="goal-checkpoint-goal"
            onChange={e => { setGoalKey(e.target.value); setSelected([]); }}>
            <option value="">Select a current version goal</option>
            {version.goals.map(g => <option key={g.key} value={g.key}>{g.title}</option>)}
          </select>
        </label>
        <label className="block text-[12px] font-semibold">Review date
          <input className={input} type="date" value={reviewedOn} disabled={busy}
            data-testid="goal-checkpoint-date" onChange={e => setReviewedOn(e.target.value)} />
        </label>
      </div>
      {goalKey && <fieldset className="space-y-2 rounded-control border border-border-light bg-surface-white p-3"
        data-testid="goal-checkpoint-sources">
        <legend className="text-[12px] font-semibold">Explicit observation references (optional; maximum 20)</legend>
        {!observations.length && <p className="text-[12px] text-brand-inkMuted">No observations for this exact goal and version. A narrative review may still be recorded.</p>}
        <div className="max-h-[220px] space-y-1 overflow-auto">
          {observations.map(o => <label key={o.id} className="flex min-h-[44px] items-center gap-2 text-[12px]">
            <input type="checkbox" checked={selected.includes(o.id)} disabled={busy || (selected.length >= 20 && !selected.includes(o.id))}
              onChange={e => setSelected(prev => e.target.checked ? [...prev, o.id] : prev.filter(id => id !== o.id))} />
            <span className="break-words">{o.observedOn} · Recorded {o.value} · {o.id}</span>
          </label>)}
        </div>
      </fieldset>}
      <label className="block text-[12px] font-semibold">Your completed review note (not an outcome assessment by the system)
        <textarea className={input} rows={3} maxLength={1000} value={summary} disabled={busy}
          data-testid="goal-checkpoint-summary" onChange={e => setSummary(e.target.value)}
          placeholder="What records did you inspect and what should be reviewed next?" />
      </label>
      <Button size="sm" disabled={!canSave} onClick={() => void save()} data-testid="goal-checkpoint-save">
        Record internal checkpoint
      </Button>
    </>}
  </section>;
}
