// M4-08 90% floor: execute the original synthetic-only family-release
// decision service, not a mocked copy. Fictional data and fail-closed gates.
import {FamilyReleaseService} from '../src/clinical/family-release.service';
import {familyRenderingHash,buildFamilyRendering} from '../src/clinical/family-release-rendering';
import {PrismaService} from '../src/prisma/prisma.service';
const center='fictional-center',childId='fictional-child',snapshotId='fictional-snapshot';
const supervisor={role:'CLINICAL_SUPERVISOR',userId:'fictional-clinician',membershipId:'fictional-membership'} as any;
const guardian={role:'GUARDIAN',userId:'fictional-guardian',membershipId:'fictional-guardian-membership'} as any;
const planContent={service:'speech',title:'Fictional plan',summary:'Clinician authored synthetic summary',
 goals:[{title:'Fictional supervised exercise'}],homeActivities:[{frequency:'Weekly',note:'Supervised at home'}],
 safeguarding:'not exposed'};
const snapshot={id:snapshotId,childId,kind:'PLAN',documentId:'fictional-version',content:planContent};
const rendering=buildFamilyRendering('PLAN',planContent);
const approval={id:'fictional-approval',snapshotId,childId,kind:'PLAN',purpose:'FAMILY_PLAN',
 rendering,renderingHash:familyRenderingHash(rendering)};
const grant={id:'fictional-grant',childId,guardianLinkId:'fictional-link',
 approvalId:'fictional-approval',purpose:'FAMILY_PLAN',status:'ACTIVE'};
const link={id:'fictional-link',userId:'fictional-guardian',displayName:'Fictional Guardian',
 familyReleaseRestriction:'CLEAR'};
const source={id:'fictional-version',status:'IN_REVIEW'};
const make=()=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:'fictional-lock'}]),
  center:{findFirst:jest.fn().mockResolvedValue({syntheticFamilyReleaseEnabled:true})},
  membership:{findFirst:jest.fn().mockResolvedValue({id:'active-member'})},
  child:{findFirst:jest.fn().mockResolvedValue({id:childId,status:'ACTIVE',services:['speech'],
   firstName:'Fictional',lastName:'Child'})},
  guardianLink:{findFirst:jest.fn().mockResolvedValue(link),findMany:jest.fn().mockResolvedValue([link])},
  careAssignment:{findFirst:jest.fn().mockResolvedValue({id:'assignment'})},
  governanceSnapshot:{findFirst:jest.fn().mockResolvedValue(snapshot)},
  governanceHistory:{findFirst:jest.fn().mockResolvedValue({snapshotId})},
  planVersion:{findFirst:jest.fn().mockResolvedValue(source)},
  progressReport:{findFirst:jest.fn().mockResolvedValue(source)},
  syntheticFamilyConsent:{
   findFirst:jest.fn().mockResolvedValue({status:'ACTIVE',revision:3}),
   create:jest.fn().mockResolvedValue({id:'fictional-consent',status:'ACTIVE'})
  },
  syntheticFamilyApproval:{
   findFirst:jest.fn().mockResolvedValue(approval),
   create:jest.fn().mockResolvedValue({id:'new-approval'})
  },
  syntheticFamilyGrant:{
   findFirst:jest.fn().mockResolvedValue(grant),
   findMany:jest.fn().mockResolvedValue([grant]),
   create:jest.fn().mockResolvedValue({...grant,id:'new-grant'}),
   updateMany:jest.fn().mockResolvedValue({count:1})
  },
  centerEvent:{create:jest.fn().mockResolvedValue({id:'synthetic-event'})}
 };
 const db:any={$transaction:jest.fn(async(fn:any)=>fn(tx))};
 return {tx,db,service:new FamilyReleaseService(db as PrismaService)};
};
const consentDto={childId,purpose:'FAMILY_PLAN'} as any;
let old:{flag:string|undefined;env:string|undefined};
beforeAll(()=>{old={flag:process.env.TB_FAMILY_RELEASE_SYNTHETIC,env:process.env.DEPLOYMENT_ENV};});
beforeEach(()=>{process.env.TB_FAMILY_RELEASE_SYNTHETIC='true';process.env.DEPLOYMENT_ENV='ci';});
afterAll(()=>{
 if(old.flag===undefined)delete process.env.TB_FAMILY_RELEASE_SYNTHETIC;else process.env.TB_FAMILY_RELEASE_SYNTHETIC=old.flag;
 if(old.env===undefined)delete process.env.DEPLOYMENT_ENV;else process.env.DEPLOYMENT_ENV=old.env;
});
describe('M4-08 approval is never a signature, and synthetic grant is recipient-scoped',()=>{
 it('disallows draft preview without exact submitted immutable snapshot',async()=>{
  const {service,tx}=make();tx.governanceHistory.findFirst.mockResolvedValueOnce(null);
  await expect(service.approve(center,supervisor,{snapshotId} as any)).rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it('disallows stale submitted snapshot rather than silently approving previous text',async()=>{
  const {service,tx}=make();tx.governanceHistory.findFirst.mockResolvedValueOnce({snapshotId:'newer-snapshot'});
  await expect(service.approve(center,supervisor,{snapshotId} as any)).rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it.each(['WITHDRAWN','FROZEN_INTERNAL','DRAFT'])('cannot approve a %s clinical source',async status=>{
  const {service,tx}=make();tx.planVersion.findFirst.mockResolvedValueOnce({status});
  await expect(service.approve(center,supervisor,{snapshotId} as any)).rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it('requires active child service even if historic clinician assignment exists',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce({services:['occupational']});
  await expect(service.approve(center,supervisor,{snapshotId} as any)).rejects.toMatchObject({status:403});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it('refuses approval after live clinician membership revocation',async()=>{
  const {service,tx}=make();tx.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.approve(center,supervisor,{snapshotId} as any)).rejects.toMatchObject({status:403});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it('therapist must still have exact active specialty assignment',async()=>{
  const {service,tx}=make();tx.careAssignment.findFirst.mockResolvedValueOnce(null);
  await expect(service.approve(center,{...supervisor,role:'THERAPIST'},{snapshotId} as any))
   .rejects.toMatchObject({status:403});
  expect(tx.careAssignment.findFirst).toHaveBeenCalledWith({where:{
   centerId:center,childId,membershipId:'fictional-membership',service:'speech',endedAt:null
  }});
 });
 it('idempotent approval only returns synthetic unsigned receipt',async()=>{
  const {service,tx}=make();
  const r=await service.approve(center,supervisor,{snapshotId} as any);
  expect(r).toMatchObject({id:'fictional-approval',kind:'PLAN',synthetic:true,signed:false});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it('new approval stores exact minimal family rendering, never sensitive internal fields',async()=>{
  const {service,tx}=make();tx.syntheticFamilyApproval.findFirst.mockResolvedValueOnce(null);
  const r=await service.approve(center,supervisor,{snapshotId} as any);
  expect(r).toMatchObject({id:'new-approval',signed:false,synthetic:true});
  const payload=tx.syntheticFamilyApproval.create.mock.calls[0][0].data;
  expect(payload.rendering).toEqual(rendering);
  expect(JSON.stringify(payload.rendering)).not.toContain('safeguarding');
  expect(payload.renderingHash).toBe(familyRenderingHash(rendering));
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('family.synthetic_approved');
 });
 it('grant cannot be issued against a superseded submission',async()=>{
  const {service,tx}=make();tx.governanceHistory.findFirst.mockResolvedValueOnce({snapshotId:'later'});
  await expect(service.grant(center,supervisor,{approvalId:approval.id,guardianLinkId:link.id} as any))
   .rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('grant denies revoked/currently withdrawn document',async()=>{
  const {service,tx}=make();tx.planVersion.findFirst.mockResolvedValueOnce({status:'WITHDRAWN'});
  await expect(service.grant(center,supervisor,{approvalId:approval.id,guardianLinkId:link.id} as any))
   .rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('grant requires nonmissing specialty on immutable approval source',async()=>{
  const {service,tx}=make();tx.governanceSnapshot.findFirst.mockResolvedValueOnce({
   ...snapshot,content:{...planContent,service:null}
  });
  await expect(service.grant(center,supervisor,{approvalId:approval.id,guardianLinkId:link.id} as any))
   .rejects.toMatchObject({status:404});
 });
 it('grant requires live recipient guardian membership after locking link',async()=>{
  const {service,tx}=make();tx.membership.findFirst
   .mockResolvedValueOnce({id:'clinician-live'})
   .mockResolvedValueOnce(null);
  await expect(service.grant(center,supervisor,{approvalId:approval.id,guardianLinkId:link.id} as any))
   .rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('grant requires current recipient-specific consent',async()=>{
  const {service,tx}=make();tx.syntheticFamilyConsent.findFirst.mockResolvedValueOnce({status:'REVOKED'});
  await expect(service.grant(center,supervisor,{approvalId:approval.id,guardianLinkId:link.id} as any))
   .rejects.toMatchObject({status:403});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('grant rejects tampered rendering hashes without releasing anything',async()=>{
  const {service,tx}=make();tx.syntheticFamilyApproval.findFirst.mockResolvedValueOnce({
   ...approval,renderingHash:'fictitious-invalid-hash'
  });
  await expect(service.grant(center,supervisor,{approvalId:approval.id,guardianLinkId:link.id} as any))
   .rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('already active identical grant is idempotent without issuing new notification',async()=>{
  const {service,tx}=make();const r=await service.grant(center,supervisor,{
   approvalId:approval.id,guardianLinkId:link.id
  } as any);
  expect(r).toMatchObject({id:'fictional-grant',status:'ACTIVE',synthetic:true});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it.each(['REVOKED','SUPERSEDED'])('cannot reopen previously %s synthetic grant',async status=>{
  const {service,tx}=make();tx.syntheticFamilyGrant.findFirst.mockResolvedValueOnce({...grant,status});
  await expect(service.grant(center,supervisor,{approvalId:approval.id,guardianLinkId:link.id} as any))
   .rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('new grant captures notice internally only; no external message is sent',async()=>{
  const {service,tx}=make();tx.syntheticFamilyGrant.findFirst.mockResolvedValueOnce(null);
  const r=await service.grant(center,supervisor,{approvalId:approval.id,guardianLinkId:link.id} as any);
  expect(r).toMatchObject({id:'new-grant',synthetic:true,noticeCaptured:expect.any(String)});
  expect(tx.syntheticFamilyGrant.create).toHaveBeenCalledTimes(1);
  expect(tx.centerEvent.create.mock.calls.map((c:any)=>c[0].data.type)).toEqual([
   'family.synthetic_released','family.synthetic_notice_captured'
  ]);
 });
});
describe('M4-08 guardian consent and recipient restrictions remain fail-closed',()=>{
 it('guardian on active unrestricted link records sequential consent revision',async()=>{
  const {service,tx}=make();tx.syntheticFamilyConsent.create.mockResolvedValueOnce({id:'consent-4',status:'ACTIVE'});
  const r=await service.consent(center,guardian,consentDto,false);
  expect(r).toEqual({synthetic:true,purpose:'FAMILY_PLAN',status:'ACTIVE'});
  expect(tx.syntheticFamilyConsent.create.mock.calls[0][0].data).toMatchObject({
   revision:4,status:'ACTIVE',actorUserId:guardian.userId,guardianLinkId:link.id
  });
  expect(tx.syntheticFamilyGrant.updateMany).not.toHaveBeenCalled();
 });
 it('first consent revision is one when previous consent does not exist',async()=>{
  const {service,tx}=make();tx.syntheticFamilyConsent.findFirst.mockResolvedValueOnce(null);
  await service.consent(center,guardian,consentDto,false);
  expect(tx.syntheticFamilyConsent.create.mock.calls[0][0].data.revision).toBe(1);
 });
 it('withdrawal revokes active and superseded grants within same transaction',async()=>{
  const {service,tx}=make();tx.syntheticFamilyConsent.create.mockResolvedValueOnce({id:'consent-5',status:'REVOKED'});
  const r=await service.consent(center,guardian,consentDto,true);
  expect(r.status).toBe('REVOKED');
  expect(tx.syntheticFamilyGrant.updateMany.mock.calls[0][0].where.status.in).toEqual(['ACTIVE','SUPERSEDED']);
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('family.synthetic_consent_withdrawn');
 });
 it('safeguarding-restricted guardian cannot add new consent',async()=>{
  const {service,tx}=make();tx.guardianLink.findFirst.mockResolvedValueOnce({...link,familyReleaseRestriction:'HOLD'});
  await expect(service.consent(center,guardian,consentDto,false)).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyConsent.create).not.toHaveBeenCalled();
 });
 it('safeguarding-restricted guardian may withdraw prior consent for safety',async()=>{
  const {service,tx}=make();tx.guardianLink.findFirst.mockResolvedValueOnce({...link,familyReleaseRestriction:'HOLD'});
  tx.syntheticFamilyConsent.create.mockResolvedValueOnce({status:'REVOKED'});
  const r=await service.consent(center,guardian,consentDto,true);
  expect(r.status).toBe('REVOKED');
  expect(tx.syntheticFamilyGrant.updateMany).toHaveBeenCalledTimes(1);
 });
 it('guardian cannot activate consent if the guardian link has been removed',async()=>{
  const {service,tx}=make();tx.guardianLink.findFirst.mockResolvedValueOnce(null);
  await expect(service.consent(center,guardian,consentDto,false)).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyConsent.create).not.toHaveBeenCalled();
 });
 it('recipient list reports eligible only when restriction is CLEAR and consent current',async()=>{
  const {service,tx}=make();tx.guardianLink.findMany.mockResolvedValueOnce([
   {...link,id:'link-allowed'}, {...link,id:'link-hold',familyReleaseRestriction:'HOLD'}
  ]);
  const r=await service.recipients(center,supervisor,approval.id);
  expect(r.items).toEqual([
   {id:'link-allowed',displayName:link.displayName,eligible:true},
   {id:'link-hold',displayName:link.displayName,eligible:false}
  ]);
  expect(tx.syntheticFamilyConsent.findFirst).toHaveBeenCalledTimes(1);
 });
 it('recipient list renders false when purpose-specific consent has expired',async()=>{
  const {service,tx}=make();tx.syntheticFamilyConsent.findFirst.mockResolvedValueOnce(null);
  const r=await service.recipients(center,supervisor,approval.id);
  expect(r.items).toHaveLength(1);
  expect(r.items[0].eligible).toBe(false);
 });
});
describe('M4-08 synthetic release withdrawal and authorized recovery paths',()=>{
 it('active clinician may change grant to revoked with exact audit reason',async()=>{
  const {service,tx}=make();
  const r=await service.change(center,supervisor,grant.id,{status:'REVOKED',reason:'  Fictional withdrawal  '} as any);
  expect(r).toMatchObject({id:grant.id,status:'REVOKED',synthetic:true});
  expect(tx.syntheticFamilyGrant.updateMany.mock.calls[0][0].where.status.in).toEqual(['ACTIVE','SUPERSEDED']);
  expect(tx.centerEvent.create.mock.calls[0][0].data.meta.reason).toBe('Fictional withdrawal');
 });
 it('supersede only accepts ACTIVE and never permits second superseding operation',async()=>{
  const {service,tx}=make();
  const r=await service.change(center,supervisor,grant.id,{status:'SUPERSEDED',reason:'Fictional replacement'} as any);
  expect(r.status).toBe('SUPERSEDED');
  expect(tx.syntheticFamilyGrant.updateMany.mock.calls[0][0].where.status.in).toEqual(['ACTIVE']);
 });
 it('stale grant update cannot claim a successful revocation',async()=>{
  const {service,tx}=make();tx.syntheticFamilyGrant.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.change(center,supervisor,grant.id,{status:'REVOKED',reason:'Fictional withdrawal'} as any))
   .rejects.toMatchObject({status:409});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('recoverGrants does not expose source records if approvals disappeared',async()=>{
  const {service,tx}=make();tx.syntheticFamilyApproval.findFirst.mockResolvedValueOnce(null);
  const r=await service.recoverGrants(center,supervisor);
  expect(r.items).toEqual([]);
  expect(tx.guardianLink.findFirst).not.toHaveBeenCalled();
 });
 it('recoverGrants skips incomplete immutable provenance without exposing recipient',async()=>{
  const {service,tx}=make();tx.governanceSnapshot.findFirst.mockResolvedValueOnce(null);
  const r=await service.recoverGrants(center,supervisor);
  expect(r.items).toEqual([]);
 });
 it('recoverGrants includes exact active child and guardian names for authorized clinician',async()=>{
  const {service}=make();const r=await service.recoverGrants(center,supervisor);
  expect(r.items).toEqual([{
   id:grant.id,approvalId:approval.id,guardianLinkId:link.id,status:'ACTIVE',
   childId,childName:'Fictional Child',guardianName:'Fictional Guardian'
  }]);
 });
 it('recoverGrants filters missing child or guardian instead of leaking partial identities',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce(null);
  expect((await service.recoverGrants(center,supervisor)).items).toEqual([]);
  const next=make();next.tx.guardianLink.findFirst.mockResolvedValueOnce(null);
  expect((await next.service.recoverGrants(center,supervisor)).items).toEqual([]);
 });
 it('grantsForApproval returns exact read-only records even after service removal',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce({services:[]});
  const r=await service.grantsForApproval(center,supervisor,approval.id);
  expect(r.items).toEqual([{id:grant.id,guardianLinkId:grant.guardianLinkId,status:'ACTIVE'}]);
  expect(tx.syntheticFamilyGrant.findMany).toHaveBeenCalledWith({
   where:{centerId,approvalId:approval.id},
   select:{id:true,guardianLinkId:true,status:true},orderBy:{releasedAt:'desc'}
  });
 });
 it('grantsForApproval cannot enumerate missing approval',async()=>{
  const {service,tx}=make();tx.syntheticFamilyApproval.findFirst.mockResolvedValueOnce(null);
  await expect(service.grantsForApproval(center,supervisor,'missing')).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyGrant.findMany).not.toHaveBeenCalled();
 });
 it('read only returns internal synthetic rendering for exact active guardian and consent',async()=>{
  const {service,tx}=make();
  const r=await service.read(center,guardian,grant.id);
  expect(r).toMatchObject({id:grant.id,kind:'PLAN',status:'ACTIVE',synthetic:true,replaced:false,
   rendering,renderingHash:approval.renderingHash,childName:'Fictional Child'});
  expect(JSON.stringify(r)).not.toContain('safeguarding');
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('family.synthetic_document_read');
 });
 it('read rejects recipient mismatch and never sends data to different guardian link',async()=>{
  const {service,tx}=make();tx.guardianLink.findFirst.mockResolvedValueOnce({...link,id:'another-link'});
  await expect(service.read(center,guardian,grant.id)).rejects.toMatchObject({status:404});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('read rejects stale or withdrawn consent without returning rendering',async()=>{
  const {service,tx}=make();tx.syntheticFamilyConsent.findFirst.mockResolvedValueOnce({status:'REVOKED'});
  await expect(service.read(center,guardian,grant.id)).rejects.toMatchObject({status:404});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('read refuses revoked grant before touching recipient-specific private records',async()=>{
  const {service,tx}=make();tx.syntheticFamilyGrant.findFirst.mockResolvedValueOnce({...grant,status:'REVOKED'});
  await expect(service.read(center,guardian,grant.id)).rejects.toMatchObject({status:404});
  expect(tx.guardianLink.findFirst).not.toHaveBeenCalled();
 });
 it('mine filters stale foreign grants but includes only still authorized items',async()=>{
  const {service,tx}=make();
  tx.syntheticFamilyGrant.findMany.mockResolvedValueOnce([{id:'stale'},grant]);
  tx.syntheticFamilyGrant.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(grant);
  const r=await service.mine(center,guardian);
  expect(r).toMatchObject({synthetic:true,items:[{
   id:grant.id,kind:'PLAN',status:'ACTIVE',childId,childName:'Fictional Child'
  }]});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('mine returns empty list without matching links, never broadens tenant scope',async()=>{
  const {service,tx}=make();tx.guardianLink.findMany.mockResolvedValueOnce([]);
  tx.syntheticFamilyGrant.findMany.mockResolvedValueOnce([]);
  const r=await service.mine(center,guardian);
  expect(r.items).toEqual([]);
  expect(tx.syntheticFamilyGrant.findMany.mock.calls[0][0].where.guardianLinkId)
   .toEqual({in:[]});
 });
});
