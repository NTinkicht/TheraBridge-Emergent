import type { Goal, PlanVersion, Workspace } from './clinical';

// An existing goal key is NOT evidence that a goal carries unchanged clinical
// meaning across plan versions. Each row contains its own exact-version sources.
type Observation = Workspace['observations'][number];
type Checkpoint = NonNullable<PlanVersion['goalCheckpoints']>[number];
export interface GoalVersionEvidence {
  versionId: string;
  versionNumber: number;
  versionStatus: PlanVersion['status'];
  currentVersion: boolean;
  goalKey: string;
  title: string;
  measure: Goal['measure'];
  baseline: number;
  target: number;
  horizon: Goal['horizon'] | null;
  targetOn: string | null;
  reviewOn: string | null;
  observations: Observation[];
  checkpoints: Checkpoint[];
  sameKeyOlderVersion: number | null;
  definitionDifferences: string[];
}
export interface PlanGoalHistory {
  planId: string;
  title: string;
  service: string;
  rows: GoalVersionEvidence[];
}
const compareDefinition = (earlier: Goal, later: Goal): string[] => {
  const fields: (keyof Pick<Goal, 'title' | 'measure' | 'baseline' | 'target' | 'horizon' | 'targetOn' | 'reviewOn'>)[] =
    ['title', 'measure', 'baseline', 'target', 'horizon', 'targetOn', 'reviewOn'];
  return fields.filter(field => (earlier[field] ?? null) !== (later[field] ?? null));
};

export function goalVersionContext(ws: Pick<Workspace, 'plans' | 'observations'>): PlanGoalHistory[] {
  // Index once, by BOTH source version and source goal identity, never by
  // goal key alone. Do not change or synthesize any observation.
  const observations = new Map<string, Observation[]>();
  for (const observation of ws.observations) {
    const id = observation.planVersionId + '|' + observation.goalKey;
    observations.set(id, [...(observations.get(id) ?? []), observation]);
  }
  return ws.plans.map(plan => {
    const versions = [...plan.versions].sort((a, b) => b.number - a.number || a.id.localeCompare(b.id));
    const current = versions.find(v => !['SUPERSEDED', 'WITHDRAWN'].includes(v.status));
    const rows = versions.flatMap((version, index) => version.goals.map(goal => {
      const earlier = versions.slice(index + 1)
        .find(candidate => candidate.goals.some(other => other.key === goal.key));
      const priorGoal = earlier?.goals.find(other => other.key === goal.key);
      const sourceKey = version.id + '|' + goal.key;
      return {
        versionId: version.id, versionNumber: version.number,
        versionStatus: version.status, currentVersion: version.id === current?.id,
        goalKey: goal.key, title: goal.title, measure: goal.measure,
        baseline: goal.baseline, target: goal.target,
        horizon: goal.horizon ?? null, targetOn: goal.targetOn ?? null,
        reviewOn: goal.reviewOn ?? null,
        observations: [...(observations.get(sourceKey) ?? [])].sort((a, b) =>
          a.observedOn.localeCompare(b.observedOn) || a.id.localeCompare(b.id)),
        checkpoints: [...(version.goalCheckpoints ?? [])].filter(entry =>
          entry.kind === 'GOAL_CHECKPOINT' && entry.goalKey === goal.key)
          .sort((a, b) => a.at.localeCompare(b.at) || a.reviewedOn.localeCompare(b.reviewedOn)),
        sameKeyOlderVersion: earlier?.number ?? null,
        definitionDifferences: priorGoal ? compareDefinition(priorGoal, goal) : [],
      };
    }));
    return { planId: plan.id, title: plan.title, service: plan.service, rows };
  }).filter(plan => plan.rows.length > 0);
}
