'use client';

import { useState } from 'react';
import { GitCompareArrows } from 'lucide-react';
import type { PlanVersion } from '@/lib/clinical';
import { checkpointTimeline, compareCheckpointReferences } from '@/lib/goal-checkpoint-compare';

const field = 'mt-1 min-h-[44px] w-full rounded-control border border-border-light bg-surface-white px-3 py-2 text-[13px]';

export function GoalCheckpointComparison({ version }: { version: PlanVersion }) {
  const [goalSelection, setGoalSelection] = useState('');
  const [earlierSelection, setEarlierSelection] = useState('');
  const [laterSelection, setLaterSelection] = useState('');
  const eligible = version.goals.filter(goal => checkpointTimeline(version, goal.key).length >= 2);
  const goalKey = eligible.some(goal => goal.key === goalSelection) ? goalSelection : (eligible[0]?.key ?? '');
  const timeline = goalKey ? checkpointTimeline(version, goalKey) : [];
  const earlier = timeline.some(entry => String(entry.index) === earlierSelection) ? earlierSelection :
    String(timeline[timeline.length - 2]?.index ?? '');
  const later = timeline.some(entry => String(entry.index) === laterSelection) ? laterSelection :
    String(timeline[timeline.length - 1]?.index ?? '');
  const comparison = earlier !== '' && later !== '' ?
    compareCheckpointReferences(version, Number(earlier), Number(later)) : null;

  return <section className="space-y-3 rounded-control border border-border-light bg-surface-white p-3"
    data-testid="checkpoint-compare" aria-label="Compare clinician goal review checkpoints">
    <h4 className="flex items-center gap-2 text-[14px] font-semibold">
      <GitCompareArrows size={16} className="text-brand-action" aria-hidden="true" />
      Compare recorded goal reviews
    </h4>
    <p className="text-[12px] text-brand-inkMuted">
      Read-only comparison within this exact plan version. Shows clinician notes and explicit source reference differences,
      not progress, treatment effectiveness, source accuracy, or approval. Reviews from different plan versions are never combined.
    </p>
    {!eligible.length ? <p className="text-[12px] text-brand-inkMuted" data-testid="checkpoint-compare-empty">
      Record at least two clinician checkpoints for the same goal and plan version to compare them.
    </p> : <>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[12px] font-semibold">Goal in this plan version
          <select className={field} value={goalKey} data-testid="checkpoint-compare-goal"
            onChange={e => { setGoalSelection(e.target.value); setEarlierSelection(''); setLaterSelection(''); }}>
            {eligible.map(goal => <option key={goal.key} value={goal.key}>{goal.title}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold">Earlier recorded checkpoint
          <select className={field} value={earlier} data-testid="checkpoint-compare-earlier"
            onChange={e => setEarlierSelection(e.target.value)}>
            {timeline.map(({ index, checkpoint }) => <option key={index} value={String(index)}>
              Review {checkpoint.reviewedOn} · recorded {checkpoint.at.slice(0, 10)} · #{index + 1}
            </option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold">Later recorded checkpoint
          <select className={field} value={later} data-testid="checkpoint-compare-later"
            onChange={e => setLaterSelection(e.target.value)}>
            {timeline.map(({ index, checkpoint }) => <option key={index} value={String(index)}>
              Review {checkpoint.reviewedOn} · recorded {checkpoint.at.slice(0, 10)} · #{index + 1}
            </option>)}
          </select>
        </label>
      </div>
      {!comparison ? <p role="status" className="text-[12px] text-status-caution"
        data-testid="checkpoint-compare-selection-warning">
        Select two different checkpoints in recorded chronological order, for the same goal.
      </p> : <>
        <div className="grid gap-3 md:grid-cols-2" data-testid="checkpoint-compare-notes">
          {([comparison.earlier, comparison.later] as const).map((entry, index) =>
            <article key={entry.index} className="min-w-0 rounded-control border border-border-light bg-surface-subtle p-3">
              <h5 className="text-[13px] font-semibold">{index === 0 ? 'Earlier' : 'Later'} clinician note</h5>
              <p className="text-[12px] text-brand-inkMuted">
                Reviewed on {entry.checkpoint.reviewedOn} · recorded {entry.checkpoint.at.slice(0, 10)}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-[13px]">{entry.checkpoint.summary}</p>
              <p className="mt-2 text-[12px] text-brand-inkMuted">
                {entry.checkpoint.observationIds.length} explicitly selected observation reference(s)
              </p>
            </article>)}
        </div>
        <div className="space-y-2 rounded-control border border-border-light p-3 text-[12px]"
          data-testid="checkpoint-compare-sources">
          <p className="font-semibold">Changes in explicitly selected source references (not clinical outcome)</p>
          {([
            ['Referenced in both reviews', comparison.shared],
            ['Only in earlier review', comparison.earlierOnly],
            ['Only in later review', comparison.laterOnly],
          ] as const).map(([label, ids], index) =>
            <div key={label} data-testid={`checkpoint-compare-source-group-${index}`}>
              <p className="font-medium">{label} · {ids.length}</p>
              {ids.length ? <ul className="list-inside list-disc break-all text-brand-inkMuted">
                {ids.map(id => <li key={id}>{id}</li>)}
              </ul> : <p className="text-brand-inkMuted">None</p>}
            </div>)}
        </div>
      </>}
    </>}
  </section>;
}
