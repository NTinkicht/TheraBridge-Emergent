// M4-08 guardian access recovery and denial: production code paths executed
// using exclusively synthetic fixtures and mocked persistence.
import {FamilyReleaseService} from '../src/clinical/family-release.service';
const clinician:any={userId:'fictional-therapist',membershipId:'fictional-member',role:'THERAPIST'};
const guardian:any={...clinician,role:'GUARDIAN'};
const grant=(extra:any={})=>({
 id:'grant-one',childId:'child-one',guardianLinkId:'guardian-one',
 approvalId:'approval-one',purpose:'FAMILY_PLAN',status:'ACTIVE',...extra
});
const snap=(extra:any={})=>({
 id:'snapshot-one',kind:'PLAN',documentId:'plan-one',childId:'child-one',
 content:{service:'speech'},...extra
});
const approve=(extra:any={})=>({
 id:'approval-one',kind:'PLAN',snapshotId:'snapshot-one',purpose:'FAMILY_PLAN',
 childId:'child-one',rendering:{kind:'PLAN'},renderingHash:'not-valid',...extra
});
function fixture(){
 const tx:any={
  syntheticFamilyGrant:{findFirst:jest.fn().mockResolvedValue(grant()),findMany:jest.fn().mockResolvedValue([grant()])},
  syntheticFamilyApproval:{findFirst:jest.fn().mockResolvedValue(approve())},
  governanceSnapshot:{findFirst:jest.fn().mockResolvedValue(snap())},
  planVersion:{findFirst:jest.fn().mockResolvedValue({status:'IN_REVIEW'})},
  progressReport:{findFirst:jest.fn().mockResolvedValue({status:'IN_REVIEW'})},
  guardianLink:{findFirst:jest.fn().mockResolvedValue({displayName:'Fictional guardian'}),findMany:jest.fn().mockResolvedValue([{id:'guardian-one'}])},
  child:{findFirst:jest.fn().mockResolvedValue({firstName:'Fictional',lastName:'Child'})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:'event'})},
  membership:{findFirst:jest.fn().mockResolvedValue({id:'member-one'})},
  $queryRaw:jest.fn().mockResolvedValue([])
 };
 const db:any={$transaction:jest.fn((fn:any)=>fn(tx))};
 const service=new FamilyReleaseService(db);
 jest.spyOn(service as any,'synthetic').mockResolvedValue(undefined);
 jest.spyOn(service as any,'guardian').mockResolvedValue({id:'guardian-one'});
 jest.spyOn(service as any,'consentActive').mockResolvedValue(true);
 jest.spyOn(service as any,'isLatestSubmittedSnapshot').mockResolvedValue(true);
 jest.spyOn(service as any,'clinician').mockResolvedValue(undefined);
 return {service,tx,db};
}
const eligible=(service:FamilyReleaseService)=>(service as any).eligibleRead.bind(service);
describe('family document read refuses revoked identity and stale evidence',()=>{
 it.each([null,grant({status:'REVOKED'}),grant({status:'WITHDRAWN'})])(
  'refuses absent or inaccessible release %j',async g=>{
   const {service,tx}=fixture();tx.syntheticFamilyGrant.findFirst.mockResolvedValue(g);
   await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
   expect((service as any).guardian).not.toHaveBeenCalled();
  }
 );
 it('requires the exact guardian link to match the specific release',async()=>{
  const {service,tx}=fixture();
  jest.mocked((service as any).guardian).mockResolvedValue({id:'another-link'});
  await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyApproval.findFirst).not.toHaveBeenCalled();
 });
 it('refuses when latest consent was withdrawn after release',async()=>{
  const {service,tx}=fixture();
  jest.mocked((service as any).consentActive).mockResolvedValue(false);
  await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyApproval.findFirst).not.toHaveBeenCalled();
 });
 it('refuses deleted approval instead of inferring rights from grant alone',async()=>{
  const {service,tx}=fixture();tx.syntheticFamilyApproval.findFirst.mockResolvedValue(null);
  await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
 });
 it('refuses missing immutable source snapshot',async()=>{
  const {service,tx}=fixture();tx.governanceSnapshot.findFirst.mockResolvedValue(null);
  await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
 });
 it('refuses a replaced snapshot despite unchanged guardian consent',async()=>{
  const {service,tx}=fixture();
  jest.mocked((service as any).isLatestSubmittedSnapshot).mockResolvedValue(false);
  await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
 });
 it.each([null,{status:'DRAFT'},{status:'WITHDRAWN'},{status:'SUPERSEDED'}])(
  'does not serve active grant when source is no longer in review %j',async value=>{
   const {service,tx}=fixture();tx.planVersion.findFirst.mockResolvedValue(value);
   await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
  }
 );
 it('checks report status from report source, not a similarly named plan',async()=>{
  const {service,tx}=fixture();tx.governanceSnapshot.findFirst.mockResolvedValue(snap({kind:'REPORT',documentId:'report-one'}));
  tx.progressReport.findFirst.mockResolvedValue({status:'DRAFT'});
  await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
  expect(tx.planVersion.findFirst).not.toHaveBeenCalled();
 });
 it('accepts superseded status only for superseded grant and superseded source',async()=>{
  const {service,tx}=fixture();
  tx.syntheticFamilyGrant.findFirst.mockResolvedValue(grant({status:'SUPERSEDED'}));
  tx.planVersion.findFirst.mockResolvedValue({status:'SUPERSEDED'});
  // Rendering hash is deliberately invalid: test that the access policy
  // still rejects tampering even when these lifecycle conditions match.
  await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
 });
 it('does not expose a release if child is inactive or absent',async()=>{
  const {service,tx}=fixture();
  tx.child.findFirst.mockResolvedValue(null);
  // Policy authorization is evaluated before reading child name, so no
  // fabricated patient details can escape a policy denial.
  await expect(eligible(service)(tx,'center-one',guardian,'grant-one')).rejects.toMatchObject({status:404});
 });
});
describe('family release recovery never leaks other-center or revoked access',()=>{
 it('checks guardian status before reading even a pre-authorized grant list',async()=>{
  const {service,tx}=fixture();
  await expect(service.mine('center-one',clinician)).rejects.toMatchObject({status:403});
  expect(tx.syntheticFamilyGrant.findMany).not.toHaveBeenCalled();
 });
 it('returns no grants when guardian has no active linked children',async()=>{
  const {service,tx}=fixture();
  tx.guardianLink.findMany.mockResolvedValue([]);
  tx.syntheticFamilyGrant.findMany.mockResolvedValue([]);
  const result=await service.mine('center-one',guardian);
  expect(result.items).toEqual([]);
  expect(tx.syntheticFamilyGrant.findMany.mock.calls[0][0].where.guardianLinkId.in).toEqual([]);
 });
 it('omits withdrawn or stale items rather than failing the entire guardian list',async()=>{
  const {service,tx}=fixture();
  jest.spyOn(service as any,'eligibleRead').mockRejectedValue(new (require('@nestjs/common').NotFoundException)());
  const result=await service.mine('center-one',guardian);
  expect(result.items).toEqual([]);
 });
 it('propagates unexpected storage failures rather than claiming an empty list',async()=>{
  const {service}=fixture();
  jest.spyOn(service as any,'eligibleRead').mockRejectedValue(new Error('synthetic database failure'));
  await expect(service.mine('center-one',guardian)).rejects.toThrow('synthetic database failure');
 });
 it('does not recover approvals with missing source documents',async()=>{
  const {service,tx}=fixture();tx.governanceSnapshot.findFirst.mockResolvedValue(null);
  const result=await service.recoverGrants('center-one',clinician);
  expect(result.items).toEqual([]);
  expect(tx.child.findFirst).not.toHaveBeenCalled();
 });
 it('does not recover withdrawn approval or approval with non-string specialty',async()=>{
  const {service,tx}=fixture();
  tx.syntheticFamilyApproval.findFirst.mockResolvedValue(null);
  expect((await service.recoverGrants('center-one',clinician)).items).toEqual([]);
  tx.syntheticFamilyApproval.findFirst.mockResolvedValue(approve());
  tx.governanceSnapshot.findFirst.mockResolvedValue(snap({content:{title:'no specialty'}}));
  expect((await service.recoverGrants('center-one',clinician)).items).toEqual([]);
 });
 it('skips a recovered item where clinician assignment was revoked',async()=>{
  const {service}=fixture();
  jest.mocked((service as any).clinician).mockRejectedValue(new (require('@nestjs/common').ForbiddenException)());
  expect((await service.recoverGrants('center-one',clinician)).items).toEqual([]);
 });
 it('never hides unexpected access checker failure as no grants',async()=>{
  const {service}=fixture();
  jest.mocked((service as any).clinician).mockRejectedValue(new Error('synthetic connection failure'));
  await expect(service.recoverGrants('center-one',clinician)).rejects.toThrow('synthetic connection failure');
 });
 it('excludes grants lacking a corresponding child or guardian',async()=>{
  for(const missing of ['child','guardian']){
   const {service,tx}=fixture();
   tx[missing==='child'?'child':'guardianLink'].findFirst.mockResolvedValue(null);
   expect((await service.recoverGrants('center-one',clinician)).items).toEqual([]);
  }
 });
 it('returns exact scoped grant identity and synthetic names without clinical source text',async()=>{
  const {service,tx}=fixture();
  const result=await service.recoverGrants('center-one',clinician);
  expect(result.items).toEqual([{
   id:'grant-one',approvalId:'approval-one',guardianLinkId:'guardian-one',status:'ACTIVE',
   childId:'child-one',childName:'Fictional Child',guardianName:'Fictional guardian'
  }]);
  expect(tx.syntheticFamilyGrant.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:'center-one',status:{in:['ACTIVE','SUPERSEDED']}
  });
 });
});
