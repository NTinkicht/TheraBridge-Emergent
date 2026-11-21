// M4-08 source-executing synthetic-release decision tests: no real guardian,
// consent, health record, notification destination or clinical activation.
import {FamilyReleaseService} from '../src/clinical/family-release.service';
const clinician:any={userId:'synthetic-user',membershipId:'synthetic-member',role:'THERAPIST'};
const guardian:any={...clinician,role:'GUARDIAN'};
const snapshot=(extra:any={})=>({
 id:'snapshot-1',kind:'PLAN',centerId:'center-1',childId:'child-1',
 documentId:'plan-1',content:{service:'speech',title:'Fictional plan',goals:[],homeActivities:[]},
 ...extra
});
const approval=(extra:any={})=>({
 id:'approval-1',snapshotId:'snapshot-1',centerId:'center-1',childId:'child-1',
 purpose:'FAMILY_PLAN',kind:'PLAN',rendering:{kind:'PLAN',title:'Fictional'},
 renderingHash:'incorrect-intentional-hash',...extra
});
const release=(extra:any={})=>({
 id:'grant-1',centerId:'center-1',childId:'child-1',guardianLinkId:'guardian-1',
 approvalId:'approval-1',purpose:'FAMILY_PLAN',status:'ACTIVE',...extra
});
const create=()=>{
 const tx:any={
  governanceSnapshot:{findFirst:jest.fn().mockResolvedValue(snapshot())},
  syntheticFamilyApproval:{findFirst:jest.fn().mockResolvedValue(approval()),create:jest.fn().mockResolvedValue({id:'approved-new'})},
  syntheticFamilyGrant:{findFirst:jest.fn().mockResolvedValue(null),create:jest.fn().mockResolvedValue(release()),updateMany:jest.fn().mockResolvedValue({count:1}),findMany:jest.fn().mockResolvedValue([])},
  planVersion:{findFirst:jest.fn().mockResolvedValue({status:'IN_REVIEW'})},
  progressReport:{findFirst:jest.fn().mockResolvedValue({status:'IN_REVIEW'})},
  guardianLink:{findMany:jest.fn().mockResolvedValue([])},
  child:{findFirst:jest.fn().mockResolvedValue({firstName:'Fictional',lastName:'Child'})},
  membership:{findFirst:jest.fn().mockResolvedValue({id:'synthetic-member'})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:'event'})},
  $queryRaw:jest.fn().mockResolvedValue([]),
  syntheticFamilyConsent:{findFirst:jest.fn().mockResolvedValue(null),create:jest.fn().mockResolvedValue({id:'consent-1',status:'ACTIVE'})}
 };
 const db:any={$transaction:jest.fn((fn:any)=>fn(tx))};
 const service=new FamilyReleaseService(db);
 jest.spyOn(service as any,'synthetic').mockResolvedValue(undefined);
 jest.spyOn(service as any,'clinician').mockResolvedValue(undefined);
 jest.spyOn(service as any,'guardian').mockResolvedValue({id:'guardian-1',familyReleaseRestriction:'CLEAR'});
 jest.spyOn(service as any,'recipient').mockResolvedValue({id:'guardian-1'});
 jest.spyOn(service as any,'consentActive').mockResolvedValue(true);
 jest.spyOn(service as any,'isLatestSubmittedSnapshot').mockResolvedValue(true);
 return {service,db,tx};
};
const grantDto={approvalId:'approval-1',guardianLinkId:'guardian-1'};
const approveDto={snapshotId:'snapshot-1'};
describe('family approval only accepts current immutable submitted clinical source',()=>{
 it.each([null,snapshot({kind:'OTHER'})])('rejects missing or unsupported snapshot kind %j',async entry=>{
  const {service,tx}=create();tx.governanceSnapshot.findFirst.mockResolvedValue(entry);
  await expect(service.approve('center-1',clinician,approveDto as any)).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it('rejects snapshots missing specialty before clinician access',async()=>{
  const {service,tx}=create();
  tx.governanceSnapshot.findFirst.mockResolvedValue(snapshot({content:{title:'No specialty'}}));
  await expect(service.approve('center-1',clinician,approveDto as any)).rejects.toMatchObject({status:422});
  expect((service as any).clinician).not.toHaveBeenCalled();
 });
 it('rejects draft preview snapshot that was not latest clinical submission',async()=>{
  const {service,tx}=create();
  jest.mocked((service as any).isLatestSubmittedSnapshot).mockResolvedValue(false);
  await expect(service.approve('center-1',clinician,approveDto as any)).rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it.each([null,{status:'WITHDRAWN'},{status:'DRAFT'}])('refuses absent or no-longer-reviewed plan %j',async item=>{
  const {service,tx}=create();tx.planVersion.findFirst.mockResolvedValue(item);
  await expect(service.approve('center-1',clinician,approveDto as any)).rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyApproval.create).not.toHaveBeenCalled();
 });
 it('checks actual report review status from the report table',async()=>{
  const {service,tx}=create();
  tx.governanceSnapshot.findFirst.mockResolvedValue(snapshot({kind:'REPORT',documentId:'report-1'}));
  tx.progressReport.findFirst.mockResolvedValue(null);
  await expect(service.approve('center-1',clinician,approveDto as any)).rejects.toMatchObject({status:409});
  expect(tx.planVersion.findFirst).not.toHaveBeenCalled();
 });
});
describe('release issuance checks each exact approval and recipient boundary',()=>{
 it('refuses unknown approval before any grant writes',async()=>{
  const {service,tx}=create();tx.syntheticFamilyApproval.findFirst.mockResolvedValue(null);
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('refuses approval pointing to deleted or other-child snapshot',async()=>{
  const {service,tx}=create();tx.governanceSnapshot.findFirst.mockResolvedValue(null);
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:404});
 });
 it('requires new approval when a newer submission has superseded the snapshot',async()=>{
  const {service,tx}=create();
  jest.mocked((service as any).isLatestSubmittedSnapshot).mockResolvedValue(false);
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it.each([null,{status:'DRAFT'},{status:'WITHDRAWN'}])('rejects missing or stale source %j',async src=>{
  const {service,tx}=create();tx.planVersion.findFirst.mockResolvedValue(src);
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:409});
 });
 it('rejects a report approval whose associated report has been replaced',async()=>{
  const {service,tx}=create();
  tx.governanceSnapshot.findFirst.mockResolvedValue(snapshot({kind:'REPORT',documentId:'report-1'}));
  tx.progressReport.findFirst.mockResolvedValue({status:'SUPERSEDED'});
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:409});
  expect(tx.planVersion.findFirst).not.toHaveBeenCalled();
 });
 it('refuses a snapshot that lacks an explicit specialty',async()=>{
  const {service,tx}=create();
  tx.governanceSnapshot.findFirst.mockResolvedValue(snapshot({content:{title:'No service'}}));
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:404});
 });
 it('never grants without current recipient-specific consent',async()=>{
  const {service,tx}=create();
  jest.mocked((service as any).consentActive).mockResolvedValue(false);
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:403});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('denies changed rendering hash instead of substituting a new document',async()=>{
  const {service,tx}=create();
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
});
describe('existing grant states are immutable and new access is never inferred',()=>{
 // A separate unit fixture skips the renderer hash precondition only by using
 // the actual production familyRenderingHash, rather than stubbing the guard.
 let realHash:(v:any)=>string;
 beforeAll(()=>{realHash=require('../src/clinical/family-release-rendering').familyRenderingHash;});
 const validApproval=()=>approval({renderingHash:realHash(approval().rendering)});
 it.each(['REVOKED','WITHDRAWN','SUPERSEDED'])('never reactivates an existing %s grant',async status=>{
  const {service,tx}=create();
  tx.syntheticFamilyApproval.findFirst.mockResolvedValue(validApproval());
  tx.syntheticFamilyGrant.findFirst.mockResolvedValue(release({status}));
  await expect(service.grant('center-1',clinician,grantDto as any)).rejects.toMatchObject({status:409});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
 });
 it('reuses an active exact-recipient grant without duplicate event or write',async()=>{
  const {service,tx}=create();
  tx.syntheticFamilyApproval.findFirst.mockResolvedValue(validApproval());
  tx.syntheticFamilyGrant.findFirst.mockResolvedValue(release());
  expect(await service.grant('center-1',clinician,grantDto as any))
   .toMatchObject({id:'grant-1',synthetic:true,status:'ACTIVE'});
  expect(tx.syntheticFamilyGrant.create).not.toHaveBeenCalled();
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('returns synthetic notice only after an actual grant and two capture-only events',async()=>{
  const {service,tx}=create();
  tx.syntheticFamilyApproval.findFirst.mockResolvedValue(validApproval());
  const result=await service.grant('center-1',clinician,grantDto as any);
  expect(result).toMatchObject({id:'grant-1',synthetic:true,status:'ACTIVE'});
  expect(tx.syntheticFamilyGrant.create).toHaveBeenCalledTimes(1);
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(2);
 });
});
describe('synthetic consent history and removal are versioned and scoped',()=>{
 it('records first consent revision without revoking any grant',async()=>{
  const {service,tx}=create();
  const result=await service.consent('center-1',guardian,{childId:'child-1',purpose:'FAMILY_PLAN'} as any,false);
  expect(result.status).toBe('ACTIVE');
  expect(tx.syntheticFamilyConsent.create.mock.calls[0][0].data.revision).toBe(1);
  expect(tx.syntheticFamilyGrant.updateMany).not.toHaveBeenCalled();
 });
 it('withdrawal increments revision and revokes both active and superseded grants',async()=>{
  const {service,tx}=create();
  tx.syntheticFamilyConsent.findFirst.mockResolvedValue({revision:4});
  tx.syntheticFamilyConsent.create.mockResolvedValue({id:'revoked-consent',status:'REVOKED'});
  const result=await service.consent('center-1',guardian,{childId:'child-1',purpose:'FAMILY_PLAN'} as any,true);
  expect(result.status).toBe('REVOKED');
  expect(tx.syntheticFamilyConsent.create.mock.calls[0][0].data.revision).toBe(5);
  expect(tx.syntheticFamilyGrant.updateMany.mock.calls[0][0].where.status.in).toEqual(['ACTIVE','SUPERSEDED']);
 });
 it('marks malformed missing grant-change reason before starting any transaction',async()=>{
  const {service,db}=create();
  await expect(service.change('center-1',clinician,'grant-1',{status:'REVOKED',reason:'  '} as any))
   .rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('does not claim revocation of a missing grant',async()=>{
  const {service,tx}=create();
  await expect(service.change('center-1',clinician,'missing',{status:'REVOKED',reason:'Synthetic'} as any))
   .rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyGrant.updateMany).not.toHaveBeenCalled();
 });
 it('refuses transition when approval or clinical source is no longer present',async()=>{
  const {service,tx}=create();
  tx.syntheticFamilyGrant.findFirst.mockResolvedValue(release());
  tx.syntheticFamilyApproval.findFirst.mockResolvedValue(null);
  await expect(service.change('center-1',clinician,'grant-1',{status:'REVOKED',reason:'Synthetic'} as any))
   .rejects.toMatchObject({status:404});
 });
 it('detects stale concurrent change without falsely marking access removed',async()=>{
  const {service,tx}=create();
  tx.syntheticFamilyGrant.findFirst.mockResolvedValue(release());
  tx.syntheticFamilyGrant.updateMany.mockResolvedValue({count:0});
  await expect(service.change('center-1',clinician,'grant-1',{status:'SUPERSEDED',reason:'Synthetic'} as any))
   .rejects.toMatchObject({status:409});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('never supersedes already superseded grant but permits explicit revocation',async()=>{
  const {service,tx}=create();
  tx.syntheticFamilyGrant.findFirst.mockResolvedValue(release({status:'SUPERSEDED'}));
  await service.change('center-1',clinician,'grant-1',{status:'SUPERSEDED',reason:'Synthetic'} as any);
  expect(tx.syntheticFamilyGrant.updateMany.mock.calls[0][0].where.status.in).toEqual(['ACTIVE']);
  await service.change('center-1',clinician,'grant-1',{status:'REVOKED',reason:'Synthetic'} as any);
  expect(tx.syntheticFamilyGrant.updateMany.mock.calls[1][0].where.status.in).toEqual(['ACTIVE','SUPERSEDED']);
 });
});
describe('eligible guardian recipients never gain clinical source access from list endpoints',()=>{
 it('rejects an absent approval for recipient enumeration',async()=>{
  const {service,tx}=create();tx.syntheticFamilyApproval.findFirst.mockResolvedValue(null);
  await expect(service.recipients('center-1',clinician,'missing')).rejects.toMatchObject({status:404});
 });
 it('refuses a linked snapshot missing its specialty',async()=>{
  const {service,tx}=create();tx.governanceSnapshot.findFirst.mockResolvedValue(snapshot({content:{title:'no specialty'}}));
  await expect(service.recipients('center-1',clinician,'approval-1')).rejects.toMatchObject({status:404});
 });
 it('reports restricted guardian as ineligible without querying consent',async()=>{
  const {service,tx}=create();
  tx.guardianLink.findMany.mockResolvedValue([{id:'restricted',displayName:'Fictional',familyReleaseRestriction:'RESTRICTED'}]);
  const result=await service.recipients('center-1',clinician,'approval-1');
  expect(result.items).toEqual([{id:'restricted',displayName:'Fictional',eligible:false}]);
  expect((service as any).consentActive).not.toHaveBeenCalled();
 });
 it('checks individual consent for eligible guardian and never assumes it',async()=>{
  const {service,tx}=create();
  tx.guardianLink.findMany.mockResolvedValue([{id:'clear',displayName:'Fictional',familyReleaseRestriction:'CLEAR'}]);
  jest.mocked((service as any).consentActive).mockResolvedValue(false);
  const result=await service.recipients('center-1',clinician,'approval-1');
  expect(result.items[0].eligible).toBe(false);
  expect((service as any).consentActive).toHaveBeenCalledTimes(1);
 });
 it('refuses grants listing when approval was removed',async()=>{
  const {service,tx}=create();tx.syntheticFamilyApproval.findFirst.mockResolvedValue(null);
  await expect(service.grantsForApproval('center-1',clinician,'missing')).rejects.toMatchObject({status:404});
 });
 it('refuses grants listing when snapshot lacks specialty',async()=>{
  const {service,tx}=create();tx.governanceSnapshot.findFirst.mockResolvedValue(null);
  await expect(service.grantsForApproval('center-1',clinician,'approval-1')).rejects.toMatchObject({status:404});
 });
});
