// M4-08: execute actual synthetic-only family release authorization helpers
// with fictional records; never invoke production consent or signing.
import { FamilyReleaseService } from '../src/clinical/family-release.service';
const viewer:any={role:'THERAPIST',userId:'fictional-user',membershipId:'member-1'};
const supervisor:any={...viewer,role:'CLINICAL_SUPERVISOR'};
const guardian:any={...viewer,role:'GUARDIAN'};
const oldFlag=process.env.TB_FAMILY_RELEASE_SYNTHETIC,oldEnv=process.env.DEPLOYMENT_ENV;
beforeEach(()=>{process.env.TB_FAMILY_RELEASE_SYNTHETIC='true';process.env.DEPLOYMENT_ENV='local';});
afterAll(()=>{if(oldFlag===undefined)delete process.env.TB_FAMILY_RELEASE_SYNTHETIC;else process.env.TB_FAMILY_RELEASE_SYNTHETIC=oldFlag;
 if(oldEnv===undefined)delete process.env.DEPLOYMENT_ENV;else process.env.DEPLOYMENT_ENV=oldEnv;});
function setup(){
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([]),
  center:{findFirst:jest.fn().mockResolvedValue({syntheticFamilyReleaseEnabled:true})},
  membership:{findFirst:jest.fn().mockResolvedValue({id:'member-1',status:'ACTIVE'})},
  child:{findFirst:jest.fn().mockResolvedValue({id:'child',services:['speech']})},
  careAssignment:{findFirst:jest.fn().mockResolvedValue({id:'assignment'})},
  guardianLink:{findFirst:jest.fn().mockResolvedValue({id:'link-1',userId:'fictional-user',familyReleaseRestriction:'CLEAR'})},
  syntheticFamilyConsent:{findFirst:jest.fn().mockResolvedValue({status:'ACTIVE'})},
  governanceHistory:{findFirst:jest.fn().mockResolvedValue({snapshotId:'snapshot-a'})}
 };
 const db:any={$transaction:jest.fn((fn:any)=>fn(tx))};
 const service=new FamilyReleaseService(db);
 return {tx,db,service};
}
const invoke=(service:FamilyReleaseService,method:string,...args:any[])=> (service as any)[method](...args);
describe('synthetic release remains fail-closed outside owner-controlled demo flags',()=>{
 it('refuses unset runtime synthetic flag',async()=>{
  delete process.env.TB_FAMILY_RELEASE_SYNTHETIC;
  const {service,tx}=setup();
  await expect(invoke(service,'synthetic',tx,'center-a')).rejects.toMatchObject({status:403});
 });
 it.each(['production','staging'])('refuses %s even if synthetic flag is true',async env=>{
  process.env.DEPLOYMENT_ENV=env;
  const {service,tx}=setup();
  await expect(invoke(service,'synthetic',tx,'center-a')).rejects.toMatchObject({status:403});
 });
 it('refuses inactive center without any center-scoped capability grant',async()=>{
  const {service,tx}=setup();tx.center.findFirst.mockResolvedValue(null);
  await expect(invoke(service,'synthetic',tx,'center-a')).rejects.toMatchObject({status:403});
 });
 it('refuses center with synthetic family release flag disabled',async()=>{
  const {service,tx}=setup();tx.center.findFirst.mockResolvedValue({syntheticFamilyReleaseEnabled:false});
  await expect(invoke(service,'synthetic',tx,'center-a')).rejects.toMatchObject({status:403});
 });
 it('allows only explicitly configured local synthetic scope',async()=>{
  const {service,tx}=setup();
  await expect(invoke(service,'synthetic',tx,'center-a')).resolves.toBeUndefined();
  expect(tx.center.findFirst.mock.calls[0][0].where).toEqual({id:'center-a',status:'ACTIVE'});
 });
});
describe('synthetic clinician authorization is live, scoped and role-specific',()=>{
 it('refuses guardian approval, even if current child exists',async()=>{
  const {service,tx}=setup();
  await expect(invoke(service,'clinician',tx,'center-a',guardian,'child','speech')).rejects.toMatchObject({status:403});
  expect(tx.child.findFirst).not.toHaveBeenCalled();
 });
 it('refuses revoked therapist membership rather than trusting viewer role',async()=>{
  const {service,tx}=setup();tx.membership.findFirst.mockResolvedValue(null);
  await expect(invoke(service,'clinician',tx,'center-a',viewer,'child','speech')).rejects.toMatchObject({status:403});
  expect(tx.child.findFirst).not.toHaveBeenCalled();
 });
 it('refuses missing child without exposing other center metadata',async()=>{
  const {service,tx}=setup();tx.child.findFirst.mockResolvedValue(null);
  await expect(invoke(service,'clinician',tx,'center-a',viewer,'child','speech')).rejects.toMatchObject({status:404});
 });
 it('refuses removed child specialty when active-service approval is requested',async()=>{
  const {service,tx}=setup();tx.child.findFirst.mockResolvedValue({id:'child',services:['occupational']});
  await expect(invoke(service,'clinician',tx,'center-a',viewer,'child','speech',true)).rejects.toMatchObject({status:403});
  expect(tx.careAssignment.findFirst).not.toHaveBeenCalled();
 });
 it('does not block a revocation-only path when specialty was removed',async()=>{
  const {service,tx}=setup();tx.child.findFirst.mockResolvedValue({id:'child',services:['occupational']});
  await expect(invoke(service,'clinician',tx,'center-a',viewer,'child','speech',false)).resolves.toBeUndefined();
 });
 it('refuses therapist whose actual care assignment was revoked',async()=>{
  const {service,tx}=setup();tx.careAssignment.findFirst.mockResolvedValue(null);
  await expect(invoke(service,'clinician',tx,'center-a',viewer,'child','speech',true)).rejects.toMatchObject({status:403});
  expect(tx.careAssignment.findFirst.mock.calls[0][0].where).toMatchObject({
   centerId:'center-a',childId:'child',membershipId:'member-1',service:'speech',endedAt:null
  });
 });
 it('supervisor with active membership has no fabricated care assignment requirement',async()=>{
  const {service,tx}=setup();
  await expect(invoke(service,'clinician',tx,'center-a',supervisor,'child','speech',true)).resolves.toBeUndefined();
  expect(tx.careAssignment.findFirst).not.toHaveBeenCalled();
 });
});
describe('synthetic guardian, grant recipient and consent boundaries',()=>{
 it('refuses therapist pretending to access guardian consent',async()=>{
  const {service,tx}=setup();
  await expect(invoke(service,'guardian',tx,'center-a',viewer,'child')).rejects.toMatchObject({status:403});
 });
 it('refuses a guardian whose link is missing or removed',async()=>{
  const {service,tx}=setup();tx.guardianLink.findFirst.mockResolvedValue(null);
  await expect(invoke(service,'guardian',tx,'center-a',guardian,'child')).rejects.toMatchObject({status:404});
 });
 it('refuses restricted guardian new consent/grants',async()=>{
  const {service,tx}=setup();tx.guardianLink.findFirst.mockResolvedValue({id:'link-1',familyReleaseRestriction:'RESTRICTED'});
  await expect(invoke(service,'guardian',tx,'center-a',guardian,'child')).rejects.toMatchObject({status:404});
 });
 it('allows an existing restricted guardian to withdraw access',async()=>{
  const {service,tx}=setup();tx.guardianLink.findFirst.mockResolvedValue({id:'link-1',familyReleaseRestriction:'RESTRICTED'});
  const link=await invoke(service,'guardian',tx,'center-a',guardian,'child',true);
  expect(link.id).toBe('link-1');
 });
 it('refuses an unlinked or unassigned synthetic recipient',async()=>{
  const {service,tx}=setup();tx.guardianLink.findFirst.mockResolvedValue(null);
  await expect(invoke(service,'recipient',tx,'center-a','child','guardian-1')).rejects.toMatchObject({status:404});
 });
 it('refuses an unactivated guardian account even when link exists',async()=>{
  const {service,tx}=setup();tx.membership.findFirst.mockResolvedValue(null);
  await expect(invoke(service,'recipient',tx,'center-a','child','guardian-1')).rejects.toMatchObject({status:404});
 });
 it('denies a family release recipient link with no associated user',async()=>{
  const {service,tx}=setup();tx.guardianLink.findFirst.mockResolvedValue({id:'link-1',userId:null});
  await expect(invoke(service,'recipient',tx,'center-a','child','guardian-1')).rejects.toMatchObject({status:404});
 });
 it('accepts only active recipient, active guardian role and scoped link',async()=>{
  const {service,tx}=setup();
  const result=await invoke(service,'recipient',tx,'center-a','child','guardian-1');
  expect(result.id).toBe('link-1');
  expect(tx.membership.findFirst.mock.calls[0][0].where).toMatchObject({
   centerId:'center-a',userId:'fictional-user',status:'ACTIVE'
  });
 });
 it('denies consent on missing or withdrawn latest revision',async()=>{
  for(const consent of [null,{status:'WITHDRAWN'}]){
   const {service,tx}=setup();tx.syntheticFamilyConsent.findFirst.mockResolvedValue(consent);
   expect(await invoke(service,'consentActive',tx,'center-a','child','link-1','FAMILY_REPORT')).toBe(false);
  }
 });
 it('recognizes only the latest active consent revision',async()=>{
  const {service,tx}=setup();
  expect(await invoke(service,'consentActive',tx,'center-a','child','link-1','FAMILY_REPORT')).toBe(true);
  expect(tx.syntheticFamilyConsent.findFirst.mock.calls[0][0].orderBy).toEqual({revision:'desc'});
 });
 it('refuses outdated approval snapshots even if they belong to the same document',async()=>{
  const {service,tx}=setup();tx.governanceHistory.findFirst.mockResolvedValue({snapshotId:'newer'});
  expect(await invoke(service,'isLatestSubmittedSnapshot',tx,'center-a',{
   id:'snapshot-a',childId:'child',kind:'REPORT',documentId:'report-1'
  })).toBe(false);
 });
 it('denies when no submitted snapshot exists',async()=>{
  const {service,tx}=setup();tx.governanceHistory.findFirst.mockResolvedValue(null);
  expect(await invoke(service,'isLatestSubmittedSnapshot',tx,'center-a',{
   id:'snapshot-a',childId:'child',kind:'PLAN',documentId:'plan-1'
  })).toBe(false);
 });
 it('accepts exact latest-submission identity for subsequent clinical checks only',async()=>{
  const {service,tx}=setup();
  expect(await invoke(service,'isLatestSubmittedSnapshot',tx,'center-a',{
   id:'snapshot-a',childId:'child',kind:'PLAN',documentId:'plan-1'
  })).toBe(true);
 });
});
