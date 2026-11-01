import { canonicalFingerprint } from '../common/fingerprints';

/** Only explicitly family-facing fields cross the internal-record boundary. */
export type FamilyRendering =
  | { kind: 'PLAN'; title: string; summary: string; goals: { title: string }[];
      homeActivities: { frequency: string; note: string }[] }
  | { kind: 'REPORT'; title: string; familySummary: string };

const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('INVALID_FAMILY_RENDERING');
  return v as Record<string, unknown>;
};
const text = (v: unknown, limit: number): string => {
  if (typeof v !== 'string' || v.trim().length === 0 || v.length > limit) throw new Error('INVALID_FAMILY_RENDERING');
  return v.trim();
};

/** Internal notes, evidence, safeguarding fields and arbitrary report sections are never copied. */
export function buildFamilyRendering(kind: 'PLAN' | 'REPORT', source: unknown): FamilyRendering {
  const s = record(source);
  if (kind === 'REPORT') {
    const sections = record(s.sections);
    return { kind, title: text(s.title, 120), familySummary: text(sections.familySummary, 4000) };
  }
  const goals = s.goals;
  const activities = s.homeActivities;
  if (!Array.isArray(goals) || goals.length > 12 || !Array.isArray(activities) || activities.length > 10)
    throw new Error('INVALID_FAMILY_RENDERING');
  return {
    kind, title: text(s.title, 120), summary: typeof s.summary === 'string' ? s.summary.slice(0, 4000) : '',
    goals: goals.map(g => ({ title: text(record(g).title, 300) })),
    homeActivities: activities.map(a => {
      const x = record(a);
      return { frequency: text(x.frequency, 80), note: typeof x.note === 'string' ? x.note.slice(0, 500) : '' };
    }),
  };
}

export function familyRenderingHash(rendering: FamilyRendering): string {
  return canonicalFingerprint(rendering);
}
