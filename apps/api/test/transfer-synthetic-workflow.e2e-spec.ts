import {
  createSyntheticProposal, reviseSyntheticProposal, acceptSyntheticProposal,
  approveSyntheticProposal, assessSyntheticCommit, expireSyntheticProposal,
  departureFallback, TransferActor, TransferContext,
} from '../src/clinical/transfer-synthetic-workflow';

describe('TB-EM-052 fail-closed synthetic transfer lifecycle', () => {
  const now = new Date('2026-11-01T12:00:00.000Z');
  const child = 'synthetic-child', center = 'synthetic-center';
  const proposer: TransferActor = { userId:'admin', membershipId:'admin-member', centerId:center,
    role:'CENTER_ADMIN', active:true, specialtyQualified:false, allowedChildIds:[child] };
  const clinician: TransferActor = { userId:'new', membershipId:'new-member', centerId:center,
    role:'THERAPIST', active:true, specialtyQualified:true, allowedChildIds:[child] };
  const approver: TransferActor = { userId:'supervisor', membershipId:'supervisor-member', centerId:center,
    role:'CLINICAL_SUPERVISOR', active:true, specialtyQualified:true, allowedChildIds:[child] };
  const context: TransferContext = { now, fromAssignmentActive:true, incomingActive:true,
    childActive:true, centerActive:true, guardianScopeCleared:true,
    safeguardingCleared:true, previewRevoked:true };
  const make = (kind: 'PLANNED'|'TEMPORARY'|'EMERGENCY'|'SESSION_ONLY' = 'PLANNED') =>
    createSyntheticProposal({ id:'proposal', centerId:center, childId:child,
      specialty:'speech', fromMembershipId:'old-member', toMembershipId:'new-member',
      kind, createdAt:now.toISOString(), effectiveAt:'2026-11-05T12:00:00.000Z',
      handbackAt:kind==='TEMPORARY'?'2026-11-12T12:00:00.000Z':undefined,
      emergencyReviewRequired:kind==='EMERGENCY',
      openItems:[{id:'report',authorMembershipId:'old-member',kind:'REPORT',
        disposition:'QUARANTINED'}] });

  it('requires incoming acceptance bound to proposal version and a clinical approver', () => {
    const proposal=make();
    expect(() => acceptSyntheticProposal(proposal,proposer,context,1)).toThrow('NOT_AUTHORIZED');
    expect(() => acceptSyntheticProposal(proposal,clinician,context,2)).toThrow('STALE_VERSION');
    const accepted=acceptSyntheticProposal(proposal,clinician,context,1);
    expect(accepted.acceptedVersion).toBe(1);
    expect(() => approveSyntheticProposal(accepted,proposer,context,1)).toThrow('CLINICAL_APPROVER_REQUIRED');
    const approved=approveSyntheticProposal(accepted,approver,context,1);
    expect(approved).toMatchObject({status:'APPROVED',approvedVersion:1,approvedBy:'supervisor'});
    expect(() => assessSyntheticCommit(approved,proposer,context,1)).toThrow('CLINICAL_ACTIVATION_BLOCKED');
    expect(approved.status).toBe('APPROVED'); // assessment cannot mutate any assignment
  });

  it('invalidates acceptance and approval on every proposal revision', () => {
    const approved=approveSyntheticProposal(acceptSyntheticProposal(make(),clinician,context,1),approver,context,1);
    const revised=reviseSyntheticProposal(approved,{effectiveAt:'2026-11-06T12:00:00.000Z'});
    expect(revised).toMatchObject({version:2,status:'PROPOSED'});
    expect(revised.acceptedVersion).toBeUndefined();
    expect(revised.approvedVersion).toBeUndefined();
    expect(() => approveSyntheticProposal(revised,approver,context,2)).toThrow('ACCEPTANCE_REQUIRED');
  });

  it('denies cross-tenant, child-out-of-scope, revoked actors and stale assignments', () => {
    const proposal=make();
    expect(() => acceptSyntheticProposal(proposal,{...clinician,centerId:'other'},context,1)).toThrow('NOT_FOUND');
    expect(() => acceptSyntheticProposal(proposal,{...clinician,allowedChildIds:[]},context,1)).toThrow('NOT_FOUND');
    expect(() => acceptSyntheticProposal(proposal,{...clinician,active:false},context,1)).toThrow('ACTOR_OR_CENTER_INACTIVE');
    expect(() => acceptSyntheticProposal(proposal,clinician,{...context,incomingActive:false},1)).toThrow('STALE_ASSIGNMENT');
  });

  it('blocks unresolved open items even with incoming acceptance', () => {
    const pending=make();
    pending.openItems[0].disposition=undefined;
    const accepted=acceptSyntheticProposal(pending,clinician,context,1);
    expect(() => approveSyntheticProposal(accepted,approver,context,1)).toThrow('OPEN_ITEMS_UNRESOLVED');
  });

  it('never commits when guardian, safeguarding or preview access gates are unsatisfied', () => {
    const approved=approveSyntheticProposal(acceptSyntheticProposal(make(),clinician,context,1),approver,context,1);
    expect(() => assessSyntheticCommit(approved,proposer,{...context,guardianScopeCleared:false},1)).toThrow('POLICY_GATES_BLOCKED');
    expect(() => assessSyntheticCommit(approved,proposer,{...context,safeguardingCleared:false},1)).toThrow('POLICY_GATES_BLOCKED');
    expect(() => assessSyntheticCommit(approved,proposer,{...context,previewRevoked:false},1)).toThrow('PREVIEW_NOT_REVOKED');
    expect(() => assessSyntheticCommit(approved,clinician,context,1)).toThrow('OPERATIONAL_COMMITTER_REQUIRED');
  });

  it('expires pending proposals at seven days and forbids old acceptance', () => {
    const proposal=make();
    const later=new Date('2026-11-08T12:00:00.000Z');
    expect(expireSyntheticProposal(proposal,later).status).toBe('EXPIRED');
    expect(() => acceptSyntheticProposal(proposal,clinician,{...context,now:later},1)).toThrow('PROPOSAL_EXPIRED');
  });

  it('handles temporary coverage, emergency prerequisites, and OD-8 departure', () => {
    expect(make('TEMPORARY').handbackAt).toBeDefined();
    expect(make('EMERGENCY').emergencyReviewRequired).toBe(true);
    expect(() => createSyntheticProposal({...make('TEMPORARY'),handbackAt:undefined})).toThrow('COVERAGE_EXPIRY_REQUIRED');
    const fallback=departureFallback(make(),new Date('2026-11-05T12:00:00.000Z'));
    expect(fallback).toMatchObject({kind:'EMERGENCY',status:'UNASSIGNED_HOLD',
      emergencyReviewRequired:true});
    expect(fallback.approvedVersion).toBeUndefined();
    expect(departureFallback(make(),now).status).toBe('PROPOSED');
  });
});
