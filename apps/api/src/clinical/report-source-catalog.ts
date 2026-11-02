import { orderedJsonFingerprint as hash } from '../common/fingerprints';
import type { Evidence } from './reports.service';

// Clinical evidence identity is shared between the write gate and the
// immutable saved-version trace. Neither caller may claim semantic accuracy.
export type Section = 'assessment' | 'goals' | 'sessions';
export type Source = { ref: string; label: string; fingerprint: string; observed?: { value: number; measure: string }; goalNumbers?: number[] };

export function suggestionSources(e: Evidence, reportId: string, section: Section): Source[] {
  const sources: Source[] = [];
  if (section === 'assessment') {
    for (const a of e.assessments) sources.push({
      ref: `assessment:${a.id}`,
      label: `Assessment ${a.assessedOn}`,
      fingerprint: hash({ id: a.id, date: a.assessedOn, summary: a.summary }),
    });
  }
  if (section === 'goals') {
    for (const g of e.goals) {
      const version = g.planVersionId;
      const goalRef = `planVersion:${version}:goal:${g.key}`;
      sources.push({
        ref: goalRef, label: `Plan version ${version}, goal ${g.key}`,
        fingerprint: hash({ planVersionId: version, key: g.key, title: g.title, measure: g.measure,
          baseline: g.baseline, target: g.target }),
        goalNumbers: [g.baseline, g.target],
      });
      for (const p of [...(g.prior ? [g.prior] : []), ...g.points]) {
        if (!p.observationId) continue;
        sources.push({
          ref: `observation:${p.observationId}`,
          label: `Observation ${p.date}, goal ${g.key}`,
          fingerprint: hash({ observationId: p.observationId, planVersionId: version,
            goalKey: g.key, measure: g.measure, date: p.date, value: p.value,
            note: p.note, sessionNoteId: p.sessionNoteId ?? null }),
          observed: { value: p.value, measure: g.measure },
        });
      }
    }
  }
  if (section === 'goals') for (const checkpoint of e.checkpoints ?? []) {
    sources.push({
      ref: checkpoint.ref, label: `Goal-review checkpoint ${checkpoint.reviewedOn}, goal ${checkpoint.goalKey}`,
      fingerprint: checkpoint.fingerprint,
    });
  }
  if (section === 'sessions') sources.push({
    ref: `sessionSummary:${reportId}`,
    label: 'Recorded session and attendance counts in report period',
    fingerprint: hash({ reportId, period: e.period, sessions: e.sessions }),
  });
  return sources.sort((a, b) => a.ref.localeCompare(b.ref));
}
