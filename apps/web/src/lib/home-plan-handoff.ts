import type { ActivitySchedule, Goal, HomeActivity, Template } from './clinical';

/**
 * Clinician-facing planning aids only: never declares clinical readiness,
 * permission to release, or treatment safety. Uses already-authorized plan
 * data; no network, mutation, or patient outcome inference.
 */
export interface HandoffAttention { id: string; description: string; count: number }
export interface HandoffSummary {
  canSendSavedDraft: boolean;
  blockingReason: string | null;
  attention: HandoffAttention[];
  goalCount: number;
  activityCount: number;
}
export function homePlanHandoff(
  input: {
    summary: string;
    goals: readonly Goal[];
    activities: readonly HomeActivity[];
    templates: readonly Template[];
    hasUnsavedEdits: boolean;
    hasOtherPlanEdits: boolean;
    newlyAddedUnlinked: boolean;
  },
  validateSchedule: (schedule?: ActivitySchedule) => string | null,
): HandoffSummary {
  const { summary, goals, activities, templates, hasUnsavedEdits, hasOtherPlanEdits, newlyAddedUnlinked } = input;
  const attention: HandoffAttention[] = [];
  const record = (id: string, description: string, count: number) => {
    if (count > 0) attention.push({ id, description, count });
  };
  const validGoals = new Set(goals.filter(g => g.title.trim()).map(g => g.key));
  const availableTemplates = new Map(templates.map(t => [t.id, t]));
  record('summary', 'Draft plan summary is empty', summary.trim() ? 0 : 1);
  record('goals', 'Goals need a descriptive title', goals.filter(g => !g.title.trim()).length);
  record('no-goals', 'No goal definitions recorded', goals.length ? 0 : 1);
  record('no-activities', 'No home activities recorded', activities.length ? 0 : 1);
  record('goal-links', 'Activity has no matching goal in this draft', activities.filter(a =>
    !a.goalKey || !validGoals.has(a.goalKey)).length);
  record('schedule', 'Dated schedule is incomplete or invalid', activities.filter(a =>
    !!a.schedule && !!validateSchedule(a.schedule)).length);
  record('undated', 'Activity has only free-text frequency, not calendar dates', activities.filter(a => !a.schedule).length);
  record('template', 'Activity has no saved snapshot or visible library definition', activities.filter(a =>
    !a.snapshot && !availableTemplates.has(a.templateId)).length);
  record('legacy', 'Activity uses a mutable library definition, not a saved snapshot', activities.filter(a =>
    !a.snapshot && availableTemplates.has(a.templateId)).length);
  record('safety', 'Available activity definition has no safety notes', activities.filter(a => {
    const template = a.snapshot ?? availableTemplates.get(a.templateId);
    return !!template && !template.safety?.some(note => note.trim());
  }).length);
  record('dates', 'Goal does not have both target and next-review dates', goals.filter(g =>
    !g.targetOn || !g.reviewOn).length);
  const canSendSavedDraft = !hasUnsavedEdits && !hasOtherPlanEdits && !newlyAddedUnlinked;
  const blockingReason = hasUnsavedEdits || hasOtherPlanEdits
    ? 'Save or discard all pending plan edits before sending any plan for review.'
    : newlyAddedUnlinked ? 'Link each newly added activity to a goal, then save your draft.' : null;
  return { canSendSavedDraft, blockingReason, attention, goalCount: goals.length, activityCount: activities.length };
}
