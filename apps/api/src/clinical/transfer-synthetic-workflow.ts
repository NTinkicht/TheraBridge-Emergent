/**
 * TB-EM-052 synthetic workflow model.
 * This pure decision engine never reads clinical records or writes assignments.
 * It is deliberately NOT a clinical authorization or production transfer endpoint.
 * Owner baseline: NTinkicht/TheraBridge PR #47 (v1.1, OD-1..OD-8).
 */
import { TRANSFER_DEVELOPMENT_POLICY, proposalExpiresAt } from './transfer-development-policy';

export type TransferKind = 'PLANNED' | 'TEMPORARY' | 'EMERGENCY' | 'SESSION_ONLY';
export type TransferStatus = 'PROPOSED' | 'ACCEPTED' | 'APPROVED' | 'COMMITTED' | 'CANCELLED' | 'EXPIRED' | 'UNASSIGNED_HOLD';
export type ActorRole = 'CENTER_ADMIN' | 'COORDINATOR' | 'THERAPIST' | 'CLINICAL_SUPERVISOR';
export type OpenItemDisposition = 'FINALIZED_BY_AUTHOR' | 'QUARANTINED' | 'REASSIGNED_FOR_REVIEW';

export interface OpenItem {
  id: string;
  authorMembershipId: string;
  kind: 'SESSION_NOTE' | 'REPORT' | 'DICTATION' | 'AI_DRAFT' | 'MESSAGE' | 'APPOINTMENT';
  disposition?: OpenItemDisposition;
}

export interface TransferProposal {
  id: string;
  centerId: string;
  childId: string;
  specialty: string;
  fromMembershipId: string;
  toMembershipId: string;
  kind: TransferKind;
  version: number;
  status: TransferStatus;
  createdAt: string;
  effectiveAt: string;
  expiresAt: string;
  acceptedVersion?: number;
  approvedVersion?: number;
  approvedBy?: string;
  openItems: OpenItem[];
  handbackAt?: string;
  emergencyReviewRequired: boolean;
}

export interface TransferActor {
  userId: string;
  membershipId: string;
  centerId: string;
  role: ActorRole;
  active: boolean;
  specialtyQualified: boolean;
  allowedChildIds: readonly string[];
}

export interface TransferContext {
  now: Date;
  fromAssignmentActive: boolean;
  incomingActive: boolean;
  childActive: boolean;
  centerActive: boolean;
  guardianScopeCleared: boolean;
  safeguardingCleared: boolean;
  previewRevoked: boolean;
}

export class TransferDenied extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const requireThat = (condition: boolean, code: string): void => {
  if (!condition) throw new TransferDenied(code);
};

function checkScope(proposal: TransferProposal, actor: TransferActor, context: TransferContext): void {
  requireThat(actor.active && context.centerActive, 'ACTOR_OR_CENTER_INACTIVE');
  requireThat(actor.centerId === proposal.centerId, 'NOT_FOUND');
  requireThat(actor.allowedChildIds.includes(proposal.childId), 'NOT_FOUND');
  requireThat(Number.isFinite(context.now.getTime()), 'INVALID_TIME');
}

function checkFresh(proposal: TransferProposal, context: TransferContext): void {
  requireThat(context.now.getTime() < new Date(proposal.expiresAt).getTime(), 'PROPOSAL_EXPIRED');
  requireThat(context.childActive && context.fromAssignmentActive && context.incomingActive, 'STALE_ASSIGNMENT');
}

function validateProposalInvariants(input: Pick<TransferProposal,
  'centerId' | 'childId' | 'specialty' | 'fromMembershipId' | 'toMembershipId' |
  'createdAt' | 'effectiveAt' | 'handbackAt' | 'kind' | 'emergencyReviewRequired'>): void {
  requireThat(input.fromMembershipId !== input.toMembershipId, 'SAME_THERAPIST');
  requireThat(!!input.toMembershipId && !!input.fromMembershipId &&
    !!input.centerId && !!input.childId && !!input.specialty, 'INVALID_SCOPE');
  requireThat(Number.isFinite(new Date(input.createdAt).getTime()), 'INVALID_TIME');
  requireThat(Number.isFinite(new Date(input.effectiveAt).getTime()), 'INVALID_TIME');
  requireThat(input.kind !== 'TEMPORARY' || !!input.handbackAt, 'COVERAGE_EXPIRY_REQUIRED');
  if (input.handbackAt !== undefined)
    requireThat(Number.isFinite(new Date(input.handbackAt).getTime()), 'INVALID_TIME');
  if (input.kind === 'TEMPORARY')
    requireThat(new Date(input.handbackAt!).getTime() > new Date(input.effectiveAt).getTime(),
      'INVALID_COVERAGE_WINDOW');
  requireThat(input.kind !== 'EMERGENCY' || input.emergencyReviewRequired, 'EMERGENCY_REVIEW_REQUIRED');
}

export function createSyntheticProposal(input: Omit<TransferProposal,
  'version' | 'status' | 'expiresAt' | 'acceptedVersion' | 'approvedVersion' | 'approvedBy'>): TransferProposal {
  validateProposalInvariants(input);
  return {
    ...input,
    version: 1,
    status: 'PROPOSED',
    expiresAt: proposalExpiresAt(new Date(input.createdAt)).toISOString(),
    openItems: input.openItems.map(item => ({ ...item })),
  };
}

export function reviseSyntheticProposal(proposal: TransferProposal, next: Partial<
  Pick<TransferProposal, 'effectiveAt' | 'toMembershipId' | 'openItems' | 'handbackAt'>
>): TransferProposal {
  requireThat(['PROPOSED', 'ACCEPTED', 'APPROVED'].includes(proposal.status), 'REVISION_CLOSED');
  const revised: TransferProposal = {
    ...proposal, ...next,
    openItems: next.openItems?.map(item => ({ ...item })) ?? proposal.openItems,
    version: proposal.version + 1, status: 'PROPOSED',
    acceptedVersion: undefined, approvedVersion: undefined, approvedBy: undefined,
  };
  validateProposalInvariants(revised);
  return revised;
}

export function acceptSyntheticProposal(
  proposal: TransferProposal, actor: TransferActor, context: TransferContext, expectedVersion: number,
): TransferProposal {
  checkScope(proposal, actor, context);
  requireThat(proposal.version === expectedVersion, 'STALE_VERSION');
  requireThat(proposal.status === 'PROPOSED', 'INVALID_STATUS');
  requireThat(actor.role === 'THERAPIST' && actor.membershipId === proposal.toMembershipId &&
    actor.specialtyQualified, 'NOT_AUTHORIZED');
  checkFresh(proposal, context);
  return { ...proposal, status: 'ACCEPTED', acceptedVersion: proposal.version };
}

export function approveSyntheticProposal(
  proposal: TransferProposal, actor: TransferActor, context: TransferContext, expectedVersion: number,
): TransferProposal {
  checkScope(proposal, actor, context);
  requireThat(proposal.version === expectedVersion, 'STALE_VERSION');
  requireThat(proposal.status === 'ACCEPTED' && proposal.acceptedVersion === proposal.version, 'ACCEPTANCE_REQUIRED');
  requireThat(actor.role === 'CLINICAL_SUPERVISOR', 'CLINICAL_APPROVER_REQUIRED');
  checkFresh(proposal, context);
  requireThat(proposal.openItems.every(i => i.disposition !== undefined), 'OPEN_ITEMS_UNRESOLVED');
  return { ...proposal, status: 'APPROVED', approvedVersion: proposal.version, approvedBy: actor.userId };
}

export function assessSyntheticCommit(
  proposal: TransferProposal, actor: TransferActor, context: TransferContext, expectedVersion: number,
): TransferProposal {
  // This is a simulated decision only; never update assignment or access from it.
  checkScope(proposal, actor, context);
  requireThat(proposal.version === expectedVersion, 'STALE_VERSION');
  requireThat(proposal.status === 'APPROVED' &&
    proposal.acceptedVersion === proposal.version &&
    proposal.approvedVersion === proposal.version, 'APPROVAL_REQUIRED');
  requireThat(['CENTER_ADMIN', 'COORDINATOR'].includes(actor.role), 'OPERATIONAL_COMMITTER_REQUIRED');
  checkFresh(proposal, context);
  requireThat(context.guardianScopeCleared && context.safeguardingCleared, 'POLICY_GATES_BLOCKED');
  requireThat(proposal.openItems.every(i => i.disposition !== undefined), 'OPEN_ITEMS_UNRESOLVED');
  requireThat(context.previewRevoked, 'PREVIEW_NOT_REVOKED');
  requireThat(TRANSFER_DEVELOPMENT_POLICY.clinicalActivationEnabled === false, 'UNEXPECTED_ACTIVATION');
  // Never report COMMITTED while professional authorizations are missing.
  throw new TransferDenied('CLINICAL_ACTIVATION_BLOCKED');
}

export function expireSyntheticProposal(proposal: TransferProposal, now: Date): TransferProposal {
  requireThat(Number.isFinite(now.getTime()), 'INVALID_TIME');
  if (proposal.status === 'COMMITTED' || proposal.status === 'CANCELLED') return proposal;
  return now.getTime() >= new Date(proposal.expiresAt).getTime()
    ? { ...proposal, status: 'EXPIRED' } : proposal;
}

export function departureFallback(proposal: TransferProposal, now: Date): TransferProposal {
  requireThat(Number.isFinite(now.getTime()), 'INVALID_TIME');
  if (proposal.kind !== 'PLANNED' || ['COMMITTED', 'CANCELLED', 'EXPIRED'].includes(proposal.status) ||
      now.getTime() < new Date(proposal.effectiveAt).getTime()) return proposal;
  // OD-8: remaining uncommitted units enter emergency handling; never claim transfer success.
  return { ...proposal, kind: 'EMERGENCY', status: 'UNASSIGNED_HOLD',
    acceptedVersion: undefined, approvedVersion: undefined, approvedBy: undefined,
    emergencyReviewRequired: true };
}

export interface SyntheticScheduledSession {
  id: string;
  startsAt: string;
  disposition?: 'CANCELLED' | 'RESCHEDULED' | 'SESSION_TAKEOVER';
}

export function emergencySessionReview(sessions: readonly SyntheticScheduledSession[], startedAt: Date): SyntheticScheduledSession[] {
  const from = startedAt.getTime();
  requireThat(Number.isFinite(from), 'INVALID_TIME');
  const to = from + TRANSFER_DEVELOPMENT_POLICY.p4EmergencySessionHorizonDays * 24 * 60 * 60 * 1000;
  return sessions.filter(session => {
    const when = new Date(session.startsAt).getTime();
    requireThat(Number.isFinite(when), 'INVALID_TIME');
    return when >= from && when < to;
  }).map(session => ({ ...session }));
}

export function temporaryCoverageExpiry(
  proposal: TransferProposal, now: Date, originalTherapistEligible: boolean,
): TransferProposal {
  requireThat(proposal.kind === 'TEMPORARY' && !!proposal.handbackAt, 'NOT_TEMPORARY_COVERAGE');
  requireThat(Number.isFinite(now.getTime()), 'INVALID_TIME');
  if (proposal.status !== 'COMMITTED' || now.getTime() < new Date(proposal.handbackAt!).getTime())
    return proposal;
  // Never automatically restore the outgoing clinician's access.
  return { ...proposal, status: 'UNASSIGNED_HOLD', version: proposal.version + 1,
    acceptedVersion: undefined, approvedVersion: undefined, approvedBy: undefined,
    emergencyReviewRequired: !originalTherapistEligible };
}

export interface SyntheticBatchResult {
  proposalId: string;
  childId: string;
  specialty: string;
  simulatedCommit: false;
  result: 'BLOCKED';
  reason: string;
}

/** Per-(child,specialty) results only. Never perform or claim a database commit. */
export function assessSyntheticBatch(
  proposals: readonly TransferProposal[], actor: TransferActor, contexts: ReadonlyMap<string, TransferContext>,
): SyntheticBatchResult[] {
  const seen = new Set<string>();
  return proposals.map(p => {
    const key = JSON.stringify([p.centerId, p.childId, p.specialty]);
    if (seen.has(key)) return { proposalId:p.id, childId:p.childId, specialty:p.specialty,
      simulatedCommit:false as const, result:'BLOCKED' as const, reason:'DUPLICATE_ASSIGNMENT_UNIT' };
    seen.add(key);
    try {
      const context = contexts.get(p.id);
      requireThat(!!context, 'MISSING_CONTEXT');
      assessSyntheticCommit(p, actor, context!, p.version);
      return { proposalId:p.id, childId:p.childId, specialty:p.specialty,
        simulatedCommit:false as const, result:'BLOCKED' as const, reason:'CLINICAL_ACTIVATION_BLOCKED' };
    } catch (error) {
      return { proposalId:p.id, childId:p.childId, specialty:p.specialty,
        simulatedCommit:false as const, result:'BLOCKED' as const,
        reason:error instanceof TransferDenied ? error.code : 'UNEXPECTED_ERROR' };
    }
  });
}
