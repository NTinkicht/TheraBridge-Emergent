import type { Goal, HomeActivity, PlanVersion } from './clinical';

// Read-model only: these are DIFFERENCES in draft definitions, never
// calculations of clinical change or automatic plan-version continuity.
export type ChangeKind = 'added' | 'removed' | 'changed' | 'unchanged';
export interface GoalDifference {
  key: string;
  kind: ChangeKind;
  previous: Goal | null;
  current: Goal | null;
  // If a definition changed, measurements from the previous version must
  // NOT be presented as measurements of the current version.
  definitionChanged: boolean;
}
export interface ActivityDifference {
  templateId: string;
  kind: ChangeKind;
  previous: HomeActivity | null;
  current: HomeActivity | null;
}
export interface PlanDifference {
  from: number;
  to: number;
  summaryChanged: boolean;
  goals: GoalDifference[];
  activities: ActivityDifference[];
}

const ordered = (a: string, b: string) => a.localeCompare(b);
const goalIdentity = (g: Goal) => [g.title, g.measure, g.baseline, g.target] as const;
// Compare immutable clinical content, not the current mutable activity library.
// Ignore snapshot revision/time metadata; those are not activity instructions.
const snapshotIdentity = (a: HomeActivity) => {
  const s = a.snapshot;
  return s ? JSON.stringify({
    title: s.title, service: s.service, ageBand: s.ageBand, minutes: s.minutes,
    materials: s.materials, steps: s.steps, safety: s.safety,
  }) : null;
};
const activityIdentity = (a: HomeActivity) =>
  [a.goalKey ?? '', a.frequency, a.note ?? '', snapshotIdentity(a)] as const;
const changed = (before: readonly unknown[], after: readonly unknown[]) =>
  before.length !== after.length || before.some((field, i) => field !== after[i]);

// Both versions MUST be from one already-authorized, same-service therapy
// plan returned by ClinicalService.workspace(). Never fetch across plans here.
export function comparePlanVersions(previous: PlanVersion, current: PlanVersion): PlanDifference {
  const oldGoals = new Map(previous.goals.map(g => [g.key, g]));
  const newGoals = new Map(current.goals.map(g => [g.key, g]));
  const goals: GoalDifference[] = [...new Set([...oldGoals.keys(), ...newGoals.keys()])]
    .sort(ordered).map(key => {
      const a = oldGoals.get(key) ?? null, b = newGoals.get(key) ?? null;
      const definitionChanged = !!a && !!b && changed(goalIdentity(a), goalIdentity(b));
      return { key, previous: a, current: b, definitionChanged,
        kind: !a ? 'added' : !b ? 'removed' : definitionChanged ? 'changed' : 'unchanged' };
    });
  const oldActivities = new Map(previous.homeActivities.map(a => [a.templateId, a]));
  const newActivities = new Map(current.homeActivities.map(a => [a.templateId, a]));
  const activities: ActivityDifference[] = [...new Set([...oldActivities.keys(), ...newActivities.keys()])]
    .sort(ordered).map(templateId => {
      const a = oldActivities.get(templateId) ?? null, b = newActivities.get(templateId) ?? null;
      return { templateId, previous: a, current: b,
        kind: !a ? 'added' : !b ? 'removed' : changed(activityIdentity(a), activityIdentity(b)) ? 'changed' : 'unchanged' };
    });
  return { from: previous.number, to: current.number, summaryChanged: previous.summary !== current.summary, goals, activities };
}
