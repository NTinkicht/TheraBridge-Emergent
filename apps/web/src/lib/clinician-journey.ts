import type { Workspace } from './clinical';

// Source-bound, non-clinical navigation summary. The clinical Workspace does
// not contain report versions; never invent report counts or review statuses.
export function clinicianJourneySummary(ws: Workspace) {
  const current = ws.plans.flatMap(plan => {
    const version = plan.versions.find(v => !['SUPERSEDED','WITHDRAWN'].includes(v.status));
    return version ? [{ planId:plan.id, versionId:version.id, goalKeys:version.goals.map(g=>g.key), activities:version.homeActivities }] : [];
  });
  const scopedObservations = ws.observations.filter(observation =>
    current.some(plan => plan.versionId === observation.planVersionId &&
      plan.goalKeys.includes(observation.goalKey)));
  return {
    currentPlanVersions: current.length,
    currentGoals: current.reduce((sum, plan) => sum + plan.goalKeys.length, 0),
    currentGoalObservations: scopedObservations.length,
    internalHomeActivities: current.reduce((sum, plan) => sum + plan.activities.length, 0),
    scheduledHomeActivities: current.reduce((sum, plan) =>
      sum + plan.activities.filter(activity => !!activity.schedule).length, 0),
  };
}
