import type { Workspace } from './clinical';
import { currentGoals } from './progress-analysis';

// Source-bound, non-clinical navigation summary. The clinical Workspace does
// not contain report versions; never invent report counts or review statuses.
export function clinicianJourneySummary(ws: Workspace) {
  const current = ws.plans.flatMap(plan => {
    const version = plan.versions.find(v => !['SUPERSEDED','WITHDRAWN'].includes(v.status));
    return version ? [{ planId:plan.id, versionId:version.id, activities:version.homeActivities }] : [];
  });
  const goals = currentGoals(ws);
  const scopedObservations = ws.observations.filter(observation =>
    goals.some(g => g.planVersionId === observation.planVersionId && g.key === observation.goalKey));
  return {
    currentPlanVersions: current.length,
    currentGoals: goals.length,
    currentGoalObservations: scopedObservations.length,
    internalHomeActivities: current.reduce((sum, plan) => sum + plan.activities.length, 0),
    scheduledHomeActivities: current.reduce((sum, plan) =>
      sum + plan.activities.filter(activity => !!activity.schedule).length, 0),
  };
}
