import type { HomeActivity, Template } from './clinical';

/**
 * Display-only definition for ONE activity in ONE already-authorized plan version.
 * Server-saved snapshots take precedence; mutable library fallback is explicitly
 * marked as such. A clinician note belongs to the plan activity, never template.
 */
export interface HomeActivityDefinition {
  title: string;
  minutes: number | null;
  ageBand: string | null;
  materials: readonly string[];
  steps: readonly string[];
  safety: readonly string[];
  source: 'SAVED_SNAPSHOT' | 'CURRENT_LIBRARY' | 'MISSING';
  note: string;
}
export function homeActivityDefinition(
  activity: HomeActivity, templates: readonly Template[],
): HomeActivityDefinition {
  const snapshot = activity.snapshot;
  const library = templates.find(t => t.id === activity.templateId);
  const definition = snapshot ?? library;
  return {
    title: definition?.title ?? 'Unavailable activity definition',
    minutes: definition?.minutes ?? null,
    ageBand: definition?.ageBand ?? null,
    materials: definition?.materials ?? [],
    steps: definition?.steps ?? [],
    safety: definition?.safety ?? [],
    source: snapshot ? 'SAVED_SNAPSHOT' : library ? 'CURRENT_LIBRARY' : 'MISSING',
    note: activity.note ?? '',
  };
}

export const MAX_THERAPIST_INSTRUCTION_LENGTH = 500;
