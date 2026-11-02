'use client';

import { Button } from '@/components/design/ui';
import { newSyntheticReview, transitionSyntheticReview, type SyntheticHumanReview } from '@/lib/synthetic-human-review';

export function SyntheticHumanReviewControls({ review, onReview, sourceRevision, actorMembershipId, authorized, onReject }: {
  review: SyntheticHumanReview | null;
  onReview: (next: SyntheticHumanReview) => void;
  sourceRevision: string;
  actorMembershipId: string;
  authorized: boolean;
  onReject: () => void;
}) {
  const fresh = !!review && review.sourceRevision === sourceRevision && review.actorMembershipId === actorMembershipId;
  const phase = fresh ? review.phase : 'UNREVIEWED';
  const act = (action: 'EXAMINE' | 'ACKNOWLEDGE_DRAFT' | 'REJECT') => {
    if (!authorized || !actorMembershipId) return;
    const starting = fresh && review ? review : newSyntheticReview(sourceRevision, actorMembershipId);
    try {
      const next = transitionSyntheticReview(starting, action, {
        sourceRevision, actorMembershipId, authorized, now: new Date().toISOString(),
      });
      onReview(next);
      if (next.phase === 'REJECTED') onReject();
    } catch { /* Stale/revoked reviews cannot be acknowledged. */ }
  };
  return <section className="space-y-2 rounded-control border border-border-light p-3" data-testid="synthetic-human-review">
    <p className="text-[13px] font-semibold">Human review of fictional proposal — {phase.replaceAll('_', ' ')}</p>
    <p className="text-[12px] text-brand-inkMuted">Review is local to this editing session; it is not a clinical signature, audit attestation, approval or family release. Changed evidence or edits require a new acknowledgement.</p>
    {review?.recordedAt && fresh && <p className="text-[12px] text-brand-inkMuted" data-testid="synthetic-review-time">Last review action: {review.recordedAt}</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={!authorized || !actorMembershipId || phase !== 'UNREVIEWED'}
        onClick={() => act('EXAMINE')} data-testid="synthetic-review-examine">Mark examined</Button>
      <Button size="sm" disabled={!authorized || !actorMembershipId || phase !== 'EXAMINED'}
        onClick={() => act('ACKNOWLEDGE_DRAFT')} data-testid="synthetic-review-acknowledge">Acknowledge fictional draft</Button>
      <Button size="sm" variant="ghost" disabled={!authorized || !actorMembershipId || phase === 'ACKNOWLEDGED'}
        onClick={() => act('REJECT')} data-testid="synthetic-review-reject">Reject proposal</Button>
    </div>
  </section>;
}
