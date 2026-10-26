import type { Workspace } from './clinical';

// All inputs come exclusively from a pre-authorized Child 360 clinical Workspace.
// Dates describe existing records; they are not proof of outcome, attendance,
// clinical approval, family delivery or causal progress.
export type ClinicalTimelineKind = 'SESSION' | 'ASSESSMENT' | 'OBSERVATION' | 'PLAN_VERSION' | 'GOAL_REVIEW';
export type ClinicalTimelineTab = 'plan' | 'assessments' | 'sessions' | 'progress';
export interface ClinicalTimelineEvent {
  id: string;
  date: string;
  kind: ClinicalTimelineKind;
  title: string;
  detail: string;
  service: string | null;
  tab: ClinicalTimelineTab;
  planVersionId?: string;
  goalKey?: string;
}
const datePart = (value: string | undefined | null) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

export function child360Timeline(ws: Workspace): ClinicalTimelineEvent[] {
  const events: ClinicalTimelineEvent[] = [];
  const versions = new Map<string, { service: string; number: number; goals: Map<string, string> }>();
  for (const plan of ws.plans) for (const version of plan.versions) {
    versions.set(version.id, {
      service: plan.service, number: version.number,
      goals: new Map(version.goals.map(goal => [goal.key, goal.title])),
    });
    const versionDate = datePart(version.updatedAt);
    if (versionDate) events.push({
      id: 'plan-' + version.id, date: versionDate, kind: 'PLAN_VERSION',
      title: 'Plan-version record',
      detail: `Plan v${version.number} · ${version.status.replaceAll('_', ' ').toLowerCase()} · last updated ${versionDate}`,
      service: plan.service, tab: 'plan', planVersionId: version.id,
    });
    for (const [index, checkpoint] of (version.goalCheckpoints ?? []).entries()) {
      if (checkpoint.kind !== 'GOAL_CHECKPOINT') continue;
      const recorded = datePart(checkpoint.at);
      // Use server-recorded event time for ordering, not a clinician-entered
      // backdated review day. Show both dates without interpreting them.
      if (!recorded) continue;
      events.push({
        id: 'goal-review-' + version.id + '-' + index, date: recorded, kind: 'GOAL_REVIEW',
        title: 'Clinician goal-review entry',
        detail: `Plan v${version.number} · ${version.goals.find(g => g.key === checkpoint.goalKey)?.title ?? 'Goal link unavailable'} · reviewed on ${checkpoint.reviewedOn} (clinician entered)`,
        service: plan.service, tab: 'plan', planVersionId: version.id, goalKey: checkpoint.goalKey,
      });
    }
  }
  for (const note of ws.notes) {
    const date = datePart(note.sessionDate);
    if (!date) continue;
    events.push({
      id: 'session-' + note.id, date, kind: 'SESSION', title: 'Session note',
      detail: note.executionStatus === 'COMPLETED' ? 'Completed unsigned session record' : 'In-progress session draft',
      service: note.service, tab: 'sessions',
    });
  }
  for (const assessment of ws.assessments) {
    const date = datePart(assessment.assessedOn);
    if (!date) continue;
    events.push({
      id: 'assessment-' + assessment.id, date, kind: 'ASSESSMENT', title: 'Assessment draft',
      detail: 'Recorded assessment · not a signed clinical conclusion',
      service: assessment.service, tab: 'assessments',
    });
  }
  for (const observation of ws.observations) {
    const date = datePart(observation.observedOn);
    if (!date) continue;
    const version = versions.get(observation.planVersionId);
    const goalTitle = version?.goals.get(observation.goalKey);
    events.push({
      id: 'observation-' + observation.id, date, kind: 'OBSERVATION',
      title: 'Recorded goal observation',
      detail: version
        ? `Plan v${version.number} · ${goalTitle ?? 'Goal link unavailable in this version'} · recorded value ${observation.value} (no interpretation)`
        : 'Plan version unavailable within this authorized workspace · no attribution inferred',
      service: version?.service ?? null, tab: 'progress',
      planVersionId: observation.planVersionId, goalKey: observation.goalKey,
    });
  }
  return events.sort((a, b) =>
    b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

export function filterChild360Timeline(events: readonly ClinicalTimelineEvent[],
  kind: ClinicalTimelineKind | 'ALL', service: string) {
  return events.filter(e => (kind === 'ALL' || e.kind === kind) &&
    (service === 'ALL' || e.service === service));
}
