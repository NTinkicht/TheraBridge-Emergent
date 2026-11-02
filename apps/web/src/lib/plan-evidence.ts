import type { Goal, PlanOrigin, Workspace } from './clinical';

// Display associations only, never infer treatment effectiveness. A reused
// goal key in another plan version must not borrow any observation.
type Observation = Workspace['observations'][number];
export function evidenceForGoal(observations: Observation[], versionId: string, goalKey: string) {
  const records = observations.filter(o => o.planVersionId === versionId && o.goalKey === goalKey)
    .sort((a, b) => a.observedOn.localeCompare(b.observedOn) || a.id.localeCompare(b.id));
  return { count: records.length, records };
}
export function sourceForGoal(origin: PlanOrigin | null | undefined, versionId: string, goalKey: string) {
  if (!origin || origin.originalPlanVersionId !== versionId) return null;
  return origin.selectedGoals.find(g => g.planGoalKey === goalKey) ?? null;
}
export function goalEvidenceRows(goals: Goal[], observations: Observation[], versionId: string,
  origin?: PlanOrigin | null) {
  return goals.map(goal => ({
    goal, ...evidenceForGoal(observations, versionId, goal.key),
    source: sourceForGoal(origin, versionId, goal.key),
  }));
}
