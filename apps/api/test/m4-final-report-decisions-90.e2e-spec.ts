// M4-08 >=90% source-executing factual report suggestion review.
// Original implementation, fake transaction; never a clinical approval/release.
import {createHash} from 'node:crypto';
import {ReportDecisionsService} from '../src/clinical/report-decisions.service';
import {suggestionSources} from '../src/clinical/report-source-catalog';
import {PrismaService} from '../src/prisma/prisma.service';
import {ClinicalService} from '../src/clinical/clinical.service';
import {ReportsService} from '../src/clinical/reports.service';
const center='fictional-center',childId='fictional-child',reportId='fictional-report';
const member='fictional-therapist',user='fictional-user';
const now=new Date('2026-11-11T12:00:00Z');
const actor={role:'THERAPIST',membershipId:member,userId:user} as any;
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report=(more:Record<string,unknown>={})=>({
 id:reportId,centerId:center,childId,service:'speech',status:'DRAFT',
 membershipId:member,version:3,sections:{assessment:'',goals:'',sessions:''},
 periodStart:new Date('2026-11-01'),periodEnd:new Date('2026-11-11'),...more
});
const evidence=(more:Record<string,unknown>={})=>({
 period:{from:'2026-11-01',to:'2026-11-11'},assessments:[
  {id:'assessment-a',assessedOn:'2026-11-10',summary:'Fictional assessment evidence'}
 ],goals:[{planVersionId:'plan-v1',key:'g1',title:'Fictional goal',measure:'count',
  baseline:1,target:5,prior:null,points:[{
   observationId:'fictional-obs',date:'2026-11-10',value:3,note:'Recorded fictional count'
  }]}],checkpoints:[],sessions:{drafts:1,completedVisits:2},...more
});
const make=()=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:'lock'}]),
  centerEvent:{create:jest.fn().mockResolvedValue({id:'evt'})},
  membership:{findFirst:jest.fn().mockResolvedValue({id:member})},
  progressReport:{
   findFirst:jest.fn().mockResolvedValue(report()),
   updateMany:jest.fn().mockResolvedValue({count:1})
  },
  reportSuggestionDecision:{
   findUnique:jest.fn().mockResolvedValue(null),
   findMany:jest.fn().mockResolvedValue([]),
   findFirst:jest.fn().mockResolvedValue(null),
   create:jest.fn(async({data}:any)=>({id:'decision-new',...data}))
  }
 };
 const db:any={...tx};
 const clinical:any={
  child:jest.fn().mockResolvedValue({id:childId}),
  write:jest.fn(async(_center:string,_actor:any,_child:string,_service:string,fn:any)=>fn(tx,now))
 };
 const reports:any={evidence:jest.fn().mockResolvedValue(evidence())};
 const service=new ReportDecisionsService(db as PrismaService,
  clinical as ClinicalService,reports as ReportsService);
 const fingerprint=(section:'assessment'|'goals'|'sessions')=>hash(
  suggestionSources(evidence() as any,reportId,section).map(s=>({ref:s.ref,fingerprint:s.fingerprint}))
 );
 const dto=(more:Record<string,unknown>={})=>({
  section:'assessment',action:'OMITTED',version:3,proposalFingerprint:fingerprint('assessment'),
  idempotencyKey:'synthetic-decision-key',reason:'Fictional omission',claims:[],...more
 }) as any;
 return {tx,db,clinical,reports,service,fingerprint,dto};
};
describe('M4-08 report suggestion listing never claims verified narratives',()=>{
 it('missing report denies source discovery before fetching evidence',async()=>{
  const {service,tx,reports}=make();tx.progressReport.findFirst.mockResolvedValueOnce(null);
  await expect(service.list(center,actor,reportId)).rejects.toMatchObject({status:404});
  expect(reports.evidence).not.toHaveBeenCalled();
 });
 it('evidence listing is limited to real clinical report and therapist specialty',async()=>{
  const {service,tx,clinical,reports}=make();
  const r=await service.list(center,actor,reportId);
  expect(r).toMatchObject({synthetic:true,released:false,clinicalAuthorization:false,
   claimValidation:'REFERENCED_NOT_VERIFIED',decisions:[]});
  expect(r.sources.assessment.sources).toHaveLength(1);
  expect(clinical.child).toHaveBeenCalledWith(tx,center,actor,childId,'speech');
  expect(reports.evidence).toHaveBeenCalledTimes(1);
 });
 it('stale evidence manifest or changed clinician narrative triggers review without claiming support',async()=>{
  const {service,tx}=make();
  tx.reportSuggestionDecision.findMany.mockResolvedValueOnce([{
   id:'old-decision',section:'assessment',action:'APPLIED',label:'NON_CLINICAL_DRAFT',
   generator:'DETERMINISTIC_V1',actorUserId:user,reportRevision:3,reason:null,
   createdAt:now,claimMap:[],sourceManifest:[],sourceHash:'old-hash',sectionHash:'old-hash'
  }]);
  const r=await service.list(center,actor,reportId);
  expect(r.decisions[0]).toMatchObject({status:'REQUIRES_REVIEW',
   reasons:['EVIDENCE_CHANGED','REPORT_TEXT_CHANGED']});
  expect(r.latest.assessment?.id).toBe('old-decision');
 });
 it('unchanged saved section and source fingerprint stays referential, not clinically verified',async()=>{
  const {service,tx,fingerprint}=make();
  tx.reportSuggestionDecision.findMany.mockResolvedValueOnce([{
   id:'decision-a',section:'assessment',action:'OMITTED',label:'NON_CLINICAL_DRAFT',
   generator:'DETERMINISTIC_V1',actorUserId:user,reportRevision:3,reason:null,
   createdAt:now,claimMap:[],sourceManifest:[],sourceHash:fingerprint('assessment'),
   sectionHash:hash('')
  }]);
  const r=await service.list(center,actor,reportId);
  expect(r.decisions[0].status).toBe('REFERENCES_UNCHANGED');
  expect(r.decisions[0].reasons).toEqual([]);
  expect(r.latest.goals).toBeNull();
 });
});
describe('M4-08 review decision permission, idempotency and source freshness are fail-closed',()=>{
 it('missing live specialty membership denies review before any ledger write',async()=>{
  const {service,tx,dto}=make();tx.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.decide(center,actor,reportId,dto())).rejects.toMatchObject({status:403});
  expect(tx.reportSuggestionDecision.create).not.toHaveBeenCalled();
 });
 it('deleted report after row lock denies review',async()=>{
  const {service,tx,dto}=make();tx.progressReport.findFirst
   .mockResolvedValueOnce(report()).mockResolvedValueOnce(null);
  await expect(service.decide(center,actor,reportId,dto())).rejects.toMatchObject({status:404});
 });
 it('another clinician cannot review notes of a report author',async()=>{
  const {service,tx,dto}=make();tx.progressReport.findFirst
   .mockResolvedValueOnce(report()).mockResolvedValueOnce(report({membershipId:'another'}));
  await expect(service.decide(center,actor,reportId,dto())).rejects.toMatchObject({status:403});
 });
 it('submitted report cannot accept draft suggestion decision or trigger signing',async()=>{
  const {service,tx,dto}=make();tx.progressReport.findFirst
   .mockResolvedValueOnce(report()).mockResolvedValueOnce(report({status:'IN_REVIEW'}));
  await expect(service.decide(center,actor,reportId,dto())).rejects.toMatchObject({status:409});
  expect(tx.reportSuggestionDecision.create).not.toHaveBeenCalled();
 });
 it('idempotency key collision with different request hash is denied before version mutation',async()=>{
  const {service,tx,dto}=make();
  tx.reportSuggestionDecision.findUnique.mockResolvedValueOnce({
   id:'historical',requestHash:'another-payload'
  });
  await expect(service.decide(center,actor,reportId,dto())).rejects.toMatchObject({status:409});
  expect(tx.progressReport.updateMany).not.toHaveBeenCalled();
 });
 it('matching earlier request returns original ledger receipt, no duplicate decision',async()=>{
  const {service,tx,dto}=make();
  const request=dto();const digest=hash({
   section:request.section,action:request.action,version:request.version,
   proposalFingerprint:request.proposalFingerprint,reason:request.reason??null,
   claims:request.claims??[]
  });
  tx.reportSuggestionDecision.findUnique.mockResolvedValueOnce({
   id:'previous',requestHash:digest,reportRevision:4,action:'OMITTED',section:'assessment'
  });
  const r=await service.decide(center,actor,reportId,request);
  expect(r).toMatchObject({id:'previous',version:4,replayed:true,persisted:true});
  expect(tx.reportSuggestionDecision.create).not.toHaveBeenCalled();
 });
 it('stale report version is rejected before re-reading clinical evidence',async()=>{
  const {service,dto,reports}=make();
  await expect(service.decide(center,actor,reportId,dto({version:2})))
   .rejects.toMatchObject({status:409});
  expect(reports.evidence).not.toHaveBeenCalled();
 });
 it('changed source fingerprint rejects new decision even with same report version',async()=>{
  const {service,tx,dto}=make();
  await expect(service.decide(center,actor,reportId,dto({
   proposalFingerprint:'old-evidence-hash'
  }))).rejects.toMatchObject({status:409});
  expect(tx.reportSuggestionDecision.create).not.toHaveBeenCalled();
 });
 it('non-applied disposition refuses to smuggle reviewed source claims',async()=>{
  const {service,dto,fingerprint}=make();
  await expect(service.decide(center,actor,reportId,dto({
   claims:[{text:'Fictional claim',sourceRefs:[
    suggestionSources(evidence() as any,reportId,'assessment')[0].ref
   ]}]
  }))).rejects.toMatchObject({status:422});
 });
 it('APPLIED requires at least one real clinician-reviewed source claim',async()=>{
  const {service,dto}=make();
  await expect(service.decide(center,actor,reportId,dto({
   action:'APPLIED',claims:[]
  }))).rejects.toMatchObject({status:422});
 });
 it('APPLIED rejects claim with no available exact ref or insufficient text',async()=>{
  const {service,dto}=make();
  await expect(service.decide(center,actor,reportId,dto({
   action:'APPLIED',claims:[{text:'a',sourceRefs:['assessment:foreign']}]
  }))).rejects.toMatchObject({status:422});
 });
 it('reconsideration is only allowed for a previously OMITTED suggestion',async()=>{
  const {service,dto,tx}=make();
  tx.reportSuggestionDecision.findFirst.mockResolvedValueOnce(null);
  await expect(service.decide(center,actor,reportId,dto({
   action:'RECONSIDERED'
  }))).rejects.toMatchObject({status:409});
 });
 it('previous omission permits explicit reconsideration without changing report text',async()=>{
  const {service,dto,tx}=make();tx.reportSuggestionDecision.findFirst.mockResolvedValueOnce({action:'OMITTED'});
  const r=await service.decide(center,actor,reportId,dto({action:'RECONSIDERED'}));
  expect(r).toMatchObject({action:'RECONSIDERED',persisted:true,replayed:false});
  expect(tx.progressReport.updateMany.mock.calls[0][0].data).not.toHaveProperty('sections');
 });
 it('omitted suggestion ledger stores only fingerprint and reason, never raw patient narrative',async()=>{
  const {service,dto,tx}=make();
  await service.decide(center,actor,reportId,dto({reason:'  Fictional omission reason  '}));
  expect(tx.reportSuggestionDecision.create.mock.calls[0][0].data)
   .toMatchObject({reason:'Fictional omission reason',label:'NON_CLINICAL_DRAFT',claimMap:[]});
  expect(tx.progressReport.updateMany.mock.calls[0][0].data)
   .not.toHaveProperty('sections');
 });
 it('verified source attribution creates only an editable draft, never clinical authorization',async()=>{
  const {service,dto,tx}=make();const ref=suggestionSources(
   evidence() as any,reportId,'assessment')[0].ref;
  const r=await service.decide(center,actor,reportId,dto({
   action:'APPLIED',claims:[{text:'Fictional clinician-recorded assessment',
    sourceRefs:[ref]}]
  }));
  expect(r).toMatchObject({action:'APPLIED',claimValidation:'REFERENCED_NOT_VERIFIED',
   persisted:true,replayed:false});
  expect(tx.progressReport.updateMany.mock.calls[0][0].data.sections.assessment)
   .toContain('Evidence references (internal draft; assessment):');
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
 });
 it('existing evidence references prevent accidental duplicate insertion',async()=>{
  const {service,dto,tx}=make();tx.progressReport.findFirst
   .mockResolvedValueOnce(report())
   .mockResolvedValueOnce(report({sections:{assessment:
    'Existing text\nEvidence references (internal draft; assessment):',goals:'',sessions:''}}));
  const ref=suggestionSources(evidence() as any,reportId,'assessment')[0].ref;
  await expect(service.decide(center,actor,reportId,dto({action:'APPLIED',
   claims:[{text:'Fictional assessment',sourceRefs:[ref]}]
  }))).rejects.toMatchObject({status:409});
 });
 it('overlong reviewed passage cannot modify clinical report sections',async()=>{
  const {service,dto,tx}=make();const ref=suggestionSources(
   evidence() as any,reportId,'assessment')[0].ref;
  await expect(service.decide(center,actor,reportId,dto({
   action:'APPLIED',claims:[{text:'F'.repeat(8100),sourceRefs:[ref]}]
  }))).rejects.toMatchObject({status:422});
  expect(tx.progressReport.updateMany).not.toHaveBeenCalled();
 });
 it('CAS race denies success after source validation, before ledger create',async()=>{
  const {service,dto,tx}=make();tx.progressReport.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.decide(center,actor,reportId,dto())).rejects.toMatchObject({status:409});
  expect(tx.reportSuggestionDecision.create).not.toHaveBeenCalled();
 });
});
describe('M4-08 quantitative goal claim consistency never asserts clinical efficacy',()=>{
 const goalSource=()=>suggestionSources(evidence() as any,reportId,'goals');
 it('goal claim cannot invent a quantitative outcome not on recorded sources',async()=>{
  const {service,dto,fingerprint}=make();const ref=goalSource()[0].ref;
  await expect(service.decide(center,actor,reportId,dto({
   action:'APPLIED',section:'goals',proposalFingerprint:fingerprint('goals'),
   claims:[{text:'Fictional measured 999 count',sourceRefs:[ref]}]
  }))).rejects.toMatchObject({status:422});
 });
 it('observation reference must include exact value and count unit',async()=>{
  const {service,dto,fingerprint}=make();
  const ref=goalSource().find(x=>x.ref.startsWith('observation:'))!.ref;
  await expect(service.decide(center,actor,reportId,dto({
   action:'APPLIED',section:'goals',proposalFingerprint:fingerprint('goals'),
   claims:[{text:'Fictional result without measured units',sourceRefs:[ref]}]
  }))).rejects.toMatchObject({status:422});
 });
 it('recorded observation with exact value and count passes only structural consistency',async()=>{
  const {service,dto,fingerprint}=make();
  const ref=goalSource().find(x=>x.ref.startsWith('observation:'))!.ref;
  const r=await service.decide(center,actor,reportId,dto({
   action:'APPLIED',section:'goals',proposalFingerprint:fingerprint('goals'),
   claims:[{text:'Fictional measured 3 counts',sourceRefs:[ref]}]
  }));
  expect(r).toMatchObject({persisted:true,claimValidation:'REFERENCED_NOT_VERIFIED'});
 });
});
