/** M3-AI05: session-scoped review of fictional suggestions. This is NOT clinical approval or a signature. */
export type SyntheticReviewPhase = 'UNREVIEWED' | 'EXAMINED' | 'ACKNOWLEDGED' | 'REJECTED';
export interface SyntheticHumanReview {
  readonly phase: SyntheticReviewPhase;
  readonly sourceRevision: string;
  readonly actorMembershipId: string;
  readonly recordedAt: string | null;
  readonly clinicalApproval: false;
  readonly released: false;
}
export type ReviewAction = 'EXAMINE' | 'ACKNOWLEDGE_DRAFT' | 'REJECT' | 'RESET';

export const newSyntheticReview = (sourceRevision: string, actorMembershipId: string): SyntheticHumanReview => ({
  phase: 'UNREVIEWED', sourceRevision, actorMembershipId, recordedAt: null,
  clinicalApproval: false, released: false,
});

/** Reject invalid transitions and stale/revoked authorization at the decision boundary. */
export function transitionSyntheticReview(
  current: SyntheticHumanReview,
  action: ReviewAction,
  actual: { sourceRevision: string; actorMembershipId: string; authorized: boolean; now: string },
): SyntheticHumanReview {
  if (action === 'RESET') return newSyntheticReview(actual.sourceRevision, actual.actorMembershipId);
  if (!actual.authorized || !actual.actorMembershipId ||
    current.actorMembershipId !== actual.actorMembershipId ||
    current.sourceRevision !== actual.sourceRevision) {
    throw new Error('Review context changed or is unauthorized. Regenerate the fictional proposal.');
  }
  if (action === 'EXAMINE' && current.phase === 'UNREVIEWED')
    return { ...current, phase: 'EXAMINED', recordedAt: actual.now };
  if (action === 'ACKNOWLEDGE_DRAFT' && current.phase === 'EXAMINED')
    return { ...current, phase: 'ACKNOWLEDGED', recordedAt: actual.now };
  if (action === 'REJECT' && ['UNREVIEWED', 'EXAMINED'].includes(current.phase))
    return { ...current, phase: 'REJECTED', recordedAt: actual.now };
  throw new Error('Invalid synthetic draft review transition.');
}
