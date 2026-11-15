// M4-08 source-executing report governance negative and release-policy paths.
// The original service and Prisma-shaped transaction are used; all data fake.
import {GovernanceService} from '../src/clinical/governance.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
import {ClinicalService} from '../src/clinical/clinical.service';
import {ReportsService} from '../src/clinical/reports.service';
const center='fictional-centre',reportId='fictional-report',childId='fictional-child';
const author={role:'THERAPIST',userId:'fictional-author',membershipId:'fictional-member'} as any;
const reviewer={role:'CLINICAL_SUPERVISOR',userId:'fictional-reviewer',membershipId:'fictional-reviewer-member'} as any;
const report=(extra:Record<string,unknown>={})=>({
 id:reportId,centerId:center,childId,membershipId:'fictional-member',
 title:'Fictional review report',service:'speech',version:4,status:'DRAFT',
 periodStart:'2026-11-01',periodEnd:'2026-11-10',
 sections:{summary:'Fictional clinician-authored summary'},reviewNotes:[],...extra
});
const make=(item=report())=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:'lock'}]),
  membership:{
   findFirst:jest.fn().mockResolvedValue({id:'fictional-member'}),
   findUniqueOrThrow:jest.fn().mockResolvedValue({userId:'fictional-author'})
  },
  progressReport:{
   findFirst:jest.fn().mockResolvedValue(item),
   findUniqueOrThrow:jest.fn().mockResolvedValue(item),
   updateMany:jest.fn().mockResolvedValue({count:1})
  },
  planVersion:{count:jest.fn().mockResolvedValue(0)},
  reportVersion:{
   findFirst:jest.fn().mockResolvedValue(null),
   aggregate:jest.fn().mockResolvedValue({_max:{number:0}}),
   create:jest.fn().mockResolvedValue({id:'fictional-report-version'})
  },
  reportSuggestionDecision:{findMany:jest.fn().mockResolvedValue([])},
  child:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:childId,firstName:'Fictional',lastName:'Alex'})},
  governanceHistory:{
   findFirst:jest.fn().mockResolvedValue(null),
   create:jest.fn(async({data}:any)=>({id:'fictional-history',...data}))
  },
  governanceSnapshot:{create:jest.fn(async({data}:any)=>({id:'fictional-snapshot',...data}))},
  user:{findUniqueOrThrow:jest.fn().mockResolvedValue({displayName:'Fictional reviewer'})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:'fictional-event'})}
 };
 const db:any={$transaction:jest.fn(async(fn:any)=>fn(tx))};
 const trial:any={now:()=>new Date('2026-11-11T10:00:00Z'),assertWritable:jest.fn()};
 const clinical:any={child:jest.fn().mockResolvedValue({id:childId,service:'speech'})};
 const reports:any={evidence:jest.fn().mockResolvedValue({goals:[],plan:null,sessions:{drafts:0,completedVisits:0}})};
 return {tx,db,trial,reports,service:new GovernanceService(db as PrismaService,trial as TrialService,
   clinical as ClinicalService,reports as ReportsService)};
};
const dto=(action:string,extra:Record<string,unknown>={})=>({
 action,reason:'Fictional internally documented review',version:4,...extra
} as any);
describe('M4-08 real governance REPORT transitions cannot become clinical release',()=>{
 it('denies unknown and foreign reports before accessing protected review evidence',async()=>{
  const {service,tx}=make();
  tx.progressReport.findFirst.mockResolvedValueOnce(null);
  await expect(service.transition(center,author,'REPORT',reportId,dto('SUBMIT')))
   .rejects.toMatchObject({status:404});
  expect(tx.reportVersion.findFirst).not.toHaveBeenCalled();
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('report author must match live owning membership, not merely assigned specialty',async()=>{
  const {service,tx}=make();
  tx.membership.findUniqueOrThrow.mockResolvedValueOnce({userId:'another-author'});
  await expect(service.transition(center,author,'REPORT',reportId,dto('SUBMIT')))
   .rejects.toMatchObject({status:403});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('supervisor cannot author-submit an unsigned clinician report',async()=>{
  const {service,tx}=make();
  await expect(service.transition(center,reviewer,'REPORT',reportId,dto('SUBMIT')))
   .rejects.toMatchObject({status:403});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('empty clinician summary blocks report review without saving immutable proposal',async()=>{
  const {service,tx}=make(report({sections:{summary:'   '}}));
  await expect(service.transition(center,author,'REPORT',reportId,dto('SUBMIT')))
   .rejects.toMatchObject({status:422});
  expect(tx.reportVersion.findFirst).not.toHaveBeenCalled();
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('withdrawn plan referenced by saved report evidence blocks submission until new evidence saved',async()=>{
  const {service,tx}=make();
  const sourceId='11111111-1111-4111-8111-111111111111';
  tx.reportVersion.findFirst.mockResolvedValueOnce({evidence:{
   plan:{versionId:sourceId},
   plans:[{versionId:sourceId},{versionId:'malformed-id'}]
  }});
  tx.planVersion.count.mockResolvedValueOnce(1);
  await expect(service.transition(center,author,'REPORT',reportId,dto('SUBMIT')))
   .rejects.toMatchObject({status:409});
  expect(tx.planVersion.count).toHaveBeenCalledWith({where:{
   id:{in:[sourceId]},centerId:center,status:'WITHDRAWN',
   plan:{centerId:center,childId,service:'speech'}
  }});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
  expect(tx.progressReport.updateMany).not.toHaveBeenCalled();
 });
 it('saved evidence with invalid plan IDs cannot trigger out-of-scope withdrawn lookups',async()=>{
  const {service,tx}=make();
  tx.reportVersion.findFirst.mockResolvedValueOnce({evidence:{
   plan:{versionId:'not-a-uuid'},plans:[{versionId:123}]
  }});
  await service.transition(center,author,'REPORT',reportId,dto('SUBMIT'));
  expect(tx.planVersion.count).not.toHaveBeenCalled();
  expect(tx.reportVersion.create).toHaveBeenCalledTimes(1);
 });
 it('successful submit binds exactly applied decision IDs to immutable report version',async()=>{
  const {service,tx}=make();
  tx.reportSuggestionDecision.findMany.mockResolvedValueOnce([{id:'ledger-a'},{id:'ledger-b'}]);
  tx.reportVersion.aggregate.mockResolvedValueOnce({_max:{number:6}});
  const result=await service.transition(center,author,'REPORT',reportId,dto('SUBMIT'));
  expect(result).toMatchObject({status:'IN_REVIEW',version:5,number:7});
  const entry=tx.reportVersion.create.mock.calls[0][0].data;
  expect(entry).toMatchObject({centerId:center,reportId,kind:'SUBMITTED',number:7,authorId:'fictional-author'});
  expect(entry.evidence.statementDecisionIds).toEqual(['ledger-a','ledger-b']);
  expect(result.notice).toMatch(/not approved, signed or released/);
 });
 it('report reviewer returns with explicit reason without signing or releasing',async()=>{
  const {service,tx}=make(report({status:'IN_REVIEW'}));
  const outcome=await service.transition(center,reviewer,'REPORT',reportId,dto('RETURN',{
   reason:'  Fictional evidence question  '
  }));
  expect(outcome.status).toBe('RETURNED_FOR_REVISION');
  expect(tx.progressReport.updateMany.mock.calls[0][0].data.reviewNotes[0])
   .toMatchObject({kind:'returned',comment:'Fictional evidence question'});
  expect(tx.reportVersion.create).not.toHaveBeenCalled();
 });
 it('report author can reopen withdrawn report only into unsigned draft',async()=>{
  const {service,tx}=make(report({status:'WITHDRAWN'}));
  const result=await service.transition(center,author,'REPORT',reportId,dto('REOPEN'));
  expect(result.status).toBe('DRAFT');
  expect(result.notice).toMatch(/not approved/);
  expect(tx.reportVersion.create).not.toHaveBeenCalled();
 });
 it('failed report compare-and-swap cannot create report-version audit history',async()=>{
  const {service,tx}=make();
  tx.progressReport.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.transition(center,author,'REPORT',reportId,dto('SUBMIT')))
   .rejects.toMatchObject({status:409});
  expect(tx.governanceHistory.create).not.toHaveBeenCalled();
  expect(tx.reportVersion.create).not.toHaveBeenCalled();
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
});
