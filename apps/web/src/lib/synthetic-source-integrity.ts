/** M3-AI04: source provenance for offline fictional assistance. Never an authorization token. */
export interface SyntheticSourceRef {
  readonly scope: string;
  readonly kind: 'assessment' | 'goal' | 'session-count' | 'plan-goal' | 'activity-template';
  readonly id: string;
  readonly revision: string;
  /** Deterministic value snapshot, NOT a cryptographic signature. */
  readonly snapshot: string;
  readonly validation: 'REFERENCED_NOT_VERIFIED';
}

export type SourceIntegrity = 'CURRENT' | 'MISSING' | 'CHANGED' | 'OUT_OF_SCOPE' | 'DUPLICATE';

export const syntheticScope = (centerId: string, childId: string, service: string) =>
  JSON.stringify([centerId, childId, service]);

export function inspectSyntheticSources(pinned: readonly SyntheticSourceRef[], current: readonly SyntheticSourceRef[], expectedScope: string): {
  status: SourceIntegrity;
  issues: { kind: SourceIntegrity; id: string }[];
} {
  const issues: { kind: SourceIntegrity; id: string }[] = [];
  const available = new Map(current.filter(r => r.scope === expectedScope).map(r => [r.kind + ':' + r.id, r]));
  const seen = new Set<string>();
  for (const ref of pinned) {
    const key = ref.kind + ':' + ref.id;
    if (ref.scope !== expectedScope) issues.push({ kind: 'OUT_OF_SCOPE', id: key });
    if (seen.has(key)) issues.push({ kind: 'DUPLICATE', id: key });
    seen.add(key);
    const now = available.get(key);
    if (!now) issues.push({ kind: 'MISSING', id: key });
    else if (ref.revision !== now.revision || ref.snapshot !== now.snapshot ||
      ref.validation !== 'REFERENCED_NOT_VERIFIED' || now.validation !== 'REFERENCED_NOT_VERIFIED') {
      issues.push({ kind: 'CHANGED', id: key });
    }
  }
  if (!pinned.length) issues.push({ kind: 'MISSING', id: 'no-sources' });
  return { status: issues[0]?.kind ?? 'CURRENT', issues };
}
