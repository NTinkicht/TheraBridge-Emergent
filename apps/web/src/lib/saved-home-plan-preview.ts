import type { ActivitySchedule, Goal, PlanOrigin, PlanVersion, Template } from './clinical';

// Pure read projection over ONE already-authorized plan version returned by
// the clinical workspace. This is NOT a cryptographic freeze, report approval,
// clinical recommendation, family publication, or document release.
export interface SavedPlanActivity {
  templateId: string;
  title: string;
  durationMinutes: number | null;
  ageBand: string | null;
  materials: readonly string[];
  steps: readonly string[];
  safety: readonly string[];
  note: string;
  frequency: string;
  schedule: ActivitySchedule | null;
  goalKey: string | null;
  linkedGoalTitle: string | null;
  definitionSource: 'SAVED_SNAPSHOT' | 'CURRENT_LIBRARY' | 'MISSING';
}
export interface SavedPlanGoal {
  key: string; title: string; measure: Goal['measure'];
  baseline: number; target: number;
  horizon: Goal['horizon'] | null;
  targetOn: string | null;
  reviewOn: string | null;
  source: { sourcePlanVersionId: string; sourceGoalKey: string } | null;
}
export interface SavedPlanProjection {
  id: string; number: number; revision: number; status: PlanVersion['status'];
  summary: string; author: string; updatedAt: string;
  goals: SavedPlanGoal[];
  activities: SavedPlanActivity[];
  origin: { reportId: string; reportTitle: string; reportVersionNumber: number;
    goalMappingApplies: boolean } | null;
}
export function savedPlanProjection(
  version: PlanVersion, templates: readonly Template[], origin?: PlanOrigin | null,
): SavedPlanProjection {
  const actualGoalKeys = new Map(version.goals.map(g => [g.key, g.title]));
  const goalMappingApplies = !!origin && origin.originalPlanVersionId === version.id;
  return {
    id: version.id, number: version.number, revision: version.version,
    status: version.status, summary: version.summary, author: version.author,
    updatedAt: version.updatedAt,
    goals: version.goals.map(g => {
      const mapped = goalMappingApplies ? origin?.selectedGoals.find(s => s.planGoalKey === g.key) : null;
      return { key: g.key, title: g.title, measure: g.measure,
        baseline: g.baseline, target: g.target, horizon: g.horizon ?? null,
        targetOn: g.targetOn ?? null, reviewOn: g.reviewOn ?? null,
        source: mapped ? { sourcePlanVersionId: mapped.sourcePlanVersionId,
          sourceGoalKey: mapped.sourceGoalKey } : null };
    }),
    activities: version.homeActivities.map(a => {
      const library = templates.find(t => t.id === a.templateId);
      const definition = a.snapshot ?? library;
      return {
        templateId: a.templateId, title: definition?.title ?? 'Activity definition unavailable',
        durationMinutes: definition?.minutes ?? null, ageBand: definition?.ageBand ?? null,
        materials: definition?.materials ?? [], steps: definition?.steps ?? [],
        safety: definition?.safety ?? [], note: a.note ?? '', frequency: a.frequency,
        schedule: a.schedule ?? null,
        goalKey: a.goalKey ?? null, linkedGoalTitle: a.goalKey ? actualGoalKeys.get(a.goalKey) ?? null : null,
        definitionSource: a.snapshot ? 'SAVED_SNAPSHOT' as const :
          library ? 'CURRENT_LIBRARY' as const : 'MISSING' as const,
      };
    }),
    origin: origin ? { reportId: origin.reportId, reportTitle: origin.reportTitle,
      reportVersionNumber: origin.reportVersionNumber, goalMappingApplies } : null,
  };
}
