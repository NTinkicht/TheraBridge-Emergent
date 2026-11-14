import {GovernanceService} from '../src/clinical/governance.service';
const now=new Date('2026-11-13T12:00:00Z');
const author:any={role:'THERAPIST',userId:'user-a',membershipId:'member-a'};
const supervisor:any={...author,role:'CLINICAL_SUPERVISOR',userId:'supervisor'};
const document=(extra:any={})=>({
 kind:'PLAN',documentId:'doc',childId:'child',service:'speech',
 sourceVersion:3,status:'DRAFT',authorId:'user-a',title:'Synthetic plan',
 content:{goals:[{key:'g1'}],sections:{summary:'Synthetic summary'}},
 notes:[],...extra
});
function setup(extra:any={}){
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([]),
  membership:{findFirst:jest.fn().mockResolvedValue({id:'member-a',status:'ACTIVE'})},
  planVersion:{updateMany:jest.fn().mockResolvedValue({count:1}),count:jest.fn().mockResolvedValue(0)},
  progressReport:{updateMany:jest.fn().mockResolvedValue({count:1})},
  reportVersion:{findFirst:jest.fn().mockResolvedValue(null),aggregate:jest.fn().mockResolvedValue({_max:{number:null}}),
    create:jest.fn().mockResolvedValue({})},
  reportSuggestionDecision:{findMany:jest.fn().mockResolvedValue([])},
  governanceHistory:{create:jest.fn().mockResolvedValue({id:1})},
  user:{findUniqueOrThrow:jest.fn().mockResolvedValue({displayName:'Synthetic clinician'})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:1})},
  ...extra
 };
 const db:any={$transaction:jest.fn((fn:any)=>fn(tx))};
 const trial:any={now:jest.fn(()=>now),assertWritable:jest.fn().mockResolvedValue(undefined)};
 const clinical:any={},reports:any={};
 const service=new GovernanceService(db,trial,clinical,reports);
 jest.spyOn(service as any,'document').mockResolvedValue(document());
 jest.spyOn(service as any,'freeze').mockResolvedValue({
  id:'snapshot-a',kind:'PLAN',centerId:'center-a',childId:'child',documentId:'doc',
  sourceVersion:3,evidence:{},content:{}
 });
 return {service,tx,db,trial};
}
const call=(service:GovernanceService,viewer:any,action:string,reason='Synthetic reason')=>
 service.transition('center-a',viewer,'PLAN','doc',{action,reason,version:3} as any);
describe('M4-08 governance transition role, reason, version and state branches',()=>{
 it('requires nonblank rationale without writing a transaction',async()=>{
  const {service,db}=setup();
  await expect(call(service,author,'SUBMIT','   ')).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('rejects an expired center membership even if viewer claims therapist role',async()=>{
  const {service,tx}=setup();tx.membership.findFirst.mockResolvedValue(null);
  await expect(call(service,author,'SUBMIT')).rejects.toMatchObject({status:403});
  expect((service as any).document).not.toHaveBeenCalled();
 });
 it('rejects forged guardian role before reading any document',async()=>{
  const {service}=setup();
  await expect(call(service,{...author,role:'GUARDIAN'},'SUBMIT')).rejects.toMatchObject({status:403});
  expect((service as any).document).not.toHaveBeenCalled();
 });
 it('denies stale source version before snapshot generation',async()=>{
  const {service}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({sourceVersion:4}));
  await expect(call(service,author,'SUBMIT')).rejects.toMatchObject({status:409});
  expect((service as any).freeze).not.toHaveBeenCalled();
 });
 it('denies another therapist submitting the document',async()=>{
  const {service}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({authorId:'someone-else'}));
  await expect(call(service,author,'SUBMIT')).rejects.toMatchObject({status:403});
  expect((service as any).freeze).not.toHaveBeenCalled();
 });
 it('denies supervisor trying to freeze or submit an author-only document',async()=>{
  for(const action of ['FREEZE','SUBMIT','WITHDRAW']){
   const {service}=setup();
   await expect(call(service,supervisor,action)).rejects.toMatchObject({status:403});
   expect((service as any).freeze).not.toHaveBeenCalled();
  }
 });
 it('denies therapist attempting reviewer-only comment or return',async()=>{
  for(const action of ['COMMENT','RETURN']){
   const {service}=setup();
   await expect(call(service,author,action)).rejects.toMatchObject({status:403});
  }
 });
 it('refuses submitting a plan without goals',async()=>{
  const {service}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({content:{goals:[]}}));
  await expect(call(service,author,'SUBMIT')).rejects.toMatchObject({status:422});
 });
 it('refuses submitting report with empty clinician summary',async()=>{
  const {service}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({
   kind:'REPORT',content:{sections:{summary:'  '}}
  }));
  await expect(call(service,author,'SUBMIT')).rejects.toMatchObject({status:422});
 });
 it.each([
  ['SUBMIT','IN_REVIEW'],['RETURN','DRAFT'],['COMMENT','WITHDRAWN'],
  ['FREEZE','IN_REVIEW'],['REOPEN','WITHDRAWN'],['WITHDRAW','DRAFT']
 ])('refuses invalid transition %s from %s before saving snapshot',async(action,status)=>{
  const {service}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({status}));
  const actor=['RETURN','COMMENT'].includes(action)?supervisor:author;
  await expect(call(service,actor,action)).rejects.toMatchObject({status:409});
  expect((service as any).freeze).not.toHaveBeenCalled();
 });
 it('refuses a REPORT reopen when record is not withdrawn',async()=>{
  const {service}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({kind:'REPORT',status:'DRAFT'}));
  await expect(call(service,author,'REOPEN')).rejects.toMatchObject({status:409});
 });
 it('refuses a PLAN reopen even when document was withdrawn',async()=>{
  const {service}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({kind:'PLAN',status:'WITHDRAWN'}));
  await expect(call(service,author,'REOPEN')).rejects.toMatchObject({status:409});
 });
 it('denies optimistic-lock conflict before audit history or event',async()=>{
  const {service,tx}=setup();
  tx.planVersion.updateMany.mockResolvedValue({count:0});
  await expect(call(service,author,'SUBMIT')).rejects.toMatchObject({status:409});
  expect(tx.governanceHistory.create).not.toHaveBeenCalled();
 });
 it('preserves internal-only snapshot when author submits a valid plan',async()=>{
  const {service,tx}=setup();
  const r=await call(service,author,'SUBMIT');
  expect(r.status).toBe('IN_REVIEW');
  expect(r.version).toBe(4);
  expect(r.snapshotId).toBe('snapshot-a');
  expect(r.notice).toContain('not approved');
  expect(tx.governanceHistory.create).toHaveBeenCalledTimes(1);
 });
 it('records synthetic reviewer comments without granting clinical approval',async()=>{
  const {service,tx}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({status:'IN_REVIEW'}));
  const r=await call(service,supervisor,'COMMENT');
  expect(r.status).toBe('IN_REVIEW');
  expect(tx.planVersion.updateMany.mock.calls[0][0].data.reviewNotes).toBeDefined();
 });
 it('records an explicit return to revision',async()=>{
  const {service,tx}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({status:'IN_REVIEW'}));
  const r=await call(service,supervisor,'RETURN');
  expect(r.status).toBe('RETURNED_FOR_REVISION');
  expect(tx.planVersion.updateMany).toHaveBeenCalledTimes(1);
 });
 it('permits author withdrawal only from an actively reviewed document',async()=>{
  const {service,tx}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({status:'IN_REVIEW'}));
  const r=await call(service,author,'WITHDRAW');
  expect(r.status).toBe('WITHDRAWN');
  expect(tx.planVersion.updateMany).toHaveBeenCalledTimes(1);
 });
 it('keeps internal freeze distinct from production clinical approval',async()=>{
  const {service}=setup();
  const r=await call(service,author,'FREEZE');
  expect(r.status).toBe('FROZEN_INTERNAL');
  expect(r.notice).toContain('not approved');
 });
 it('reopens only author-owned withdrawn REPORT into draft',async()=>{
  const {service,tx}=setup();
  jest.mocked((service as any).document).mockResolvedValue(document({status:'WITHDRAWN',kind:'REPORT'}));
  const r=await call(service,author,'REOPEN');
  expect(r.status).toBe('DRAFT');
  expect(tx.progressReport.updateMany).toHaveBeenCalledTimes(1);
 });
});
