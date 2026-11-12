// M4-08 90% floor: execute actual ReportsService source projection, time
// boundaries, exact plan-version evidence and staff scope. All records fake.
import {ReportsService,goalEvidence} from '../src/clinical/reports.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
import {ClinicalService} from '../src/clinical/clinical.service';
const center='fictional-center',childId='fictional-child';
const therapist={role:'THERAPIST',membershipId:'fictional-member',userId:'fictional-user'} as any;
const supervisor={...therapist,role:'CLINICAL_SUPERVISOR'};
const goal=(extra:Record<string,unknown>={})=>({
 key:'g1',title:'Fictional observed turn taking',measure:'count',baseline:1,target:8,...extra
});
const checkpoint=(extra:Record<string,unknown>={})=>({
 kind:'GOAL_CHECKPOINT',goalKey:'g1',reviewedOn:'2026-11-10',at:'2026-11-10T10:00:00Z',
 authorId:'fictional-user',summary:'Fictional internal review',observationIds:['fictional-obs'],...extra
});
const version=(extra:Record<string,unknown>={})=>({
 id:'plan-v1',number:1,status:'DRAFT',authorId:'fictional-user',goals:[goal()],
 reviewNotes:[checkpoint()],...extra
});
const plan=(extra:Record<string,unknown>={})=>({
 id:'plan-a',centerId:center,childId,service:'speech',title:'Synthetic therapy plan',
 versions:[version()],...extra
});
const observation=(extra:Record<string,unknown>={})=>({
 id:'fictional-obs',planVersionId:'plan-v1',goalKey:'g1',value:3,note:'Synthetic measurement',
 observedOn:new Date('2026-11-10T00:00:00Z'),sessionNoteId:null,...extra
});
const child=(extra:Record<string,unknown>={})=>({
 id:childId,centerId:center,status:'ACTIVE',firstName:'Fictional',lastName:'Alex',
 preferredName:null,services:['speech'],...extra
});
const make=()=>{
 const db:any={
  assessment:{findMany:jest.fn().mockResolvedValue([])},
  therapyPlan:{findMany:jest.fn().mockResolvedValue([plan()])},
  sessionNote:{count:jest.fn().mockResolvedValue(2)},
  appointment:{count:jest.fn().mockResolvedValue(1)},
  observation:{findMany:jest.fn().mockResolvedValue([observation()])},
  child:{findMany:jest.fn().mockResolvedValue([child()])},
  progressReport:{findMany:jest.fn().mockResolvedValue([])},
  membership:{findMany:jest.fn().mockResolvedValue([])},
  $queryRaw:jest.fn().mockResolvedValue([])
 };
 const clinical:any={
  therapistAssignments:jest.fn().mockResolvedValue([{
   childId,service:'speech',membershipId:'fictional-member'
  }]),
  assertActiveSupervisor:jest.fn().mockResolvedValue(undefined),
  child:jest.fn().mockResolvedValue(child())
 };
 const trial:any={now:()=>new Date('2026-11-11T12:00:00Z')};
 return {db,clinical,service:new ReportsService(db as PrismaService,trial as TrialService,
  clinical as ClinicalService)};
};
const start=new Date('2026-11-01T00:00:00Z'),end=new Date('2026-11-11T00:00:00Z');
describe('M4-08 report evidence is never inferred from historic, withdrawn or unrelated versions',()=>{
 it('no plan produces no invented goals, versions, observations or checkpoints',async()=>{
  const {db,service}=make();db.therapyPlan.findMany.mockResolvedValueOnce([]);
  const e=await service.evidence(db,center,childId,'speech',start,end);
  expect(e.goals).toEqual([]);expect(e.plans).toEqual([]);expect(e.plan).toBeNull();
  expect(e.checkpoints).toEqual([]);expect(db.observation.findMany).not.toHaveBeenCalled();
  expect(e.sessions).toEqual({drafts:2,completedVisits:1});
 });
 it('single active plan preserves exact version IDs and immutable measurement attribution',async()=>{
  const {db,service}=make();
  const e=await service.evidence(db,center,childId,'speech',start,end);
  expect(e.plan).toMatchObject({id:'plan-a',versionId:'plan-v1',status:'DRAFT'});
  expect(e.goals[0]).toMatchObject({key:'g1',planVersionId:'plan-v1',status:'insufficient'});
  expect(e.goals[0].points[0]).toMatchObject({
   observationId:'fictional-obs',date:'2026-11-10',value:3
  });
  expect(e.checkpoints).toHaveLength(1);
  expect(e.checkpoints[0]).toMatchObject({
   planVersionId:'plan-v1',goalKey:'g1',reviewedOn:'2026-11-10',
   ref:'goalCheckpoint:plan-v1:0',fingerprint:expect.any(String)
  });
 });
 it('withdrawn and superseded historical plan versions cannot be chosen as current evidence',async()=>{
  const {db,service}=make();db.therapyPlan.findMany.mockResolvedValueOnce([
   plan({versions:[version({status:'WITHDRAWN'}),version({id:'old',status:'SUPERSEDED'})]})
  ]);
  const e=await service.evidence(db,center,childId,'speech',start,end);
  expect(e.plans).toEqual([]);expect(e.goals).toEqual([]);
  expect(db.observation.findMany).not.toHaveBeenCalled();
 });
 it('multiple active source plans remain separate: summary cannot invent a single unambiguous plan',async()=>{
  const {db,service}=make();db.therapyPlan.findMany.mockResolvedValueOnce([
   plan(),plan({id:'plan-b',title:'Other fictional plan',versions:[version({id:'plan-v2'})]})
  ]);
  const e=await service.evidence(db,center,childId,'speech',start,end);
  expect(e.plan).toBeNull();expect(e.plans).toHaveLength(2);
  expect(e.goals.map(g=>g.planVersionId)).toEqual(['plan-v1','plan-v2']);
 });
 it('unrelated other version observations never appear as matching source measurements',async()=>{
  const {db,service}=make();db.observation.findMany.mockResolvedValueOnce([
   observation({planVersionId:'old-plan-v9',value:999}),
   observation({goalKey:'unrelated',value:888}),
   observation({value:5})
  ]);
  const e=await service.evidence(db,center,childId,'speech',start,end);
  expect(e.goals[0].points).toHaveLength(1);
  expect(e.goals[0].points[0].value).toBe(5);
  expect(e.goals[0].status).toBe('insufficient');
 });
 it.each([
  [null,'null'],[[],'array'],
  [{kind:'STAFF_COMMENT',goalKey:'g1'},'not checkpoint'],
  [checkpoint({goalKey:'removed'}),'removed goal'],
  [checkpoint({reviewedOn:'11/10/2026'}),'invalid date'],
  [checkpoint({reviewedOn:'2026-10-31'}),'outside period before'],
  [checkpoint({reviewedOn:'2026-12-01'}),'outside period after'],
  [checkpoint({at:undefined}),'missing timestamp']
 ])('malformed/stale checkpoint %s is excluded from saved evidence',async (bad,_label)=>{
  const {db,service}=make();
  db.therapyPlan.findMany.mockResolvedValueOnce([plan({
   versions:[version({reviewNotes:[bad]})]
  })]);
  const e=await service.evidence(db,center,childId,'speech',start,end);
  expect(e.checkpoints).toEqual([]);
 });
 it('version checkpoint created later cannot be used as evidence in earlier report period',async()=>{
  const {db,service}=make();const e=await service.evidence(db,center,childId,'speech',
   new Date('2026-10-01T00:00:00Z'),new Date('2026-10-31T00:00:00Z'));
  expect(e.checkpoints).toEqual([]);
 });
 it('evidence SQL stays center+child+service constrained before row limits',async()=>{
  const {db,service}=make();await service.evidence(db,center,childId,'speech',start,end);
  expect(db.assessment.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,childId,service:'speech'
  });
  expect(db.therapyPlan.findMany.mock.calls[0][0].where).toEqual({
   centerId:center,childId,service:'speech'
  });
  expect(db.observation.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,childId,planVersionId:{in:['plan-v1']}
  });
 });
 it('goalEvidence never extrapolates from prior observations; status describes recorded data',()=>{
  const g=goal();
  const prior=observation({observedOn:new Date('2026-10-30T00:00:00Z'),value:12});
  const one=observation({value:4});
  const two=observation({observedOn:new Date('2026-11-11T00:00:00Z'),value:3});
  expect(goalEvidence(g as any,[prior] as any,start).status).toBe('none');
  expect(goalEvidence(g as any,[prior,one] as any,start)).toMatchObject({
   status:'insufficient',prior:{value:12},points:[{value:4}]
  });
  expect(goalEvidence(g as any,[prior,one,two] as any,start).status).toBe('recorded');
 });
});
describe('M4-08 dashboard enforces exact role, center and specialty before projections',()=>{
 it('rejects guardian/coordinator before child and plan read',async()=>{
  const {service,db}=make();
  await expect(service.dashboard(center,{...therapist,role:'GUARDIAN'},{} as any))
   .rejects.toMatchObject({status:403});
  expect(db.child.findMany).not.toHaveBeenCalled();
 });
 it('supervisor requires live authorization and sees unfiltered active center children only',async()=>{
  const {service,clinical,db}=make();
  const result=await service.dashboard(center,supervisor,{} as any);
  expect(clinical.assertActiveSupervisor).toHaveBeenCalledWith(db,center,supervisor);
  expect(clinical.therapistAssignments).not.toHaveBeenCalled();
  expect(db.child.findMany.mock.calls[0][0].where).toEqual({centerId:center,status:'ACTIVE'});
  expect(result.children).toHaveLength(1);
 });
 it('therapist scope filters children to actual care-assignment IDs and prevents service widening',async()=>{
  const {service,clinical,db}=make();
  const result=await service.dashboard(center,therapist,{service:'speech'} as any);
  expect(clinical.therapistAssignments).toHaveBeenCalledWith(db,center,therapist);
  expect(db.child.findMany.mock.calls[0][0].where).toEqual({
   centerId:center,status:'ACTIVE',id:{in:[childId]}
  });
  expect(db.therapyPlan.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,service:'speech',childId:{in:[childId]}
  });
  expect(result.children[0].services).toEqual(['speech']);
 });
 it('no assigned children keeps plan lookup constrained to empty child ID set',async()=>{
  const {service,clinical,db}=make();clinical.therapistAssignments.mockResolvedValueOnce([]);
  db.child.findMany.mockResolvedValueOnce([]);
  db.therapyPlan.findMany.mockResolvedValueOnce([]);
  db.observation.findMany.mockResolvedValueOnce([]);
  const result=await service.dashboard(center,therapist,{} as any);
  expect(result.goals).toEqual([]);
  expect(db.therapyPlan.findMany.mock.calls[0][0].where.childId).toEqual({in:[]});
 });
 it('childId filter cannot switch into a different child unseen in actor workspace',async()=>{
  const {service,db}=make();
  const result=await service.dashboard(center,therapist,{childId:'unknown-child'} as any);
  expect(result.goals).toEqual([]);
  expect(db.therapyPlan.findMany.mock.calls[0][0].where.childId).toEqual({in:[]});
 });
 it('unassigned specialty plan excluded even if center has that plan in response',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValueOnce([
   plan(),plan({id:'foreign-plan',service:'occupational'})
  ]);
  const result=await service.dashboard(center,therapist,{} as any);
  expect(result.goals).toHaveLength(1);
  expect(result.goals[0].service).toBe('speech');
 });
 it('goalKey filter returns only exact saved target, not all historical goal keys',async()=>{
  const {service}=make();
  const r=await service.dashboard(center,supervisor,{goalKey:'unrelated'} as any);
  expect(r.goals).toEqual([]);expect(r.summary.goals).toBe(0);
 });
 it('no active version never guesses clinical progress from withdrawn evidence',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValueOnce([plan({versions:[version({status:'WITHDRAWN'})]})]);
  const r=await service.dashboard(center,supervisor,{} as any);
  expect(r.goals).toEqual([]);expect(r.summary.none).toBe(0);
 });
 it('correctly categorizes recorded, insufficient, none with real measurements',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValueOnce([plan({versions:[version({
   goals:[goal({key:'none'}),goal({key:'one'}),goal({key:'two'})]
  })]})]);
  db.observation.findMany.mockResolvedValueOnce([
   observation({goalKey:'one',value:2}),
   observation({goalKey:'two',value:3}),
   observation({goalKey:'two',value:4,observedOn:new Date('2026-11-11T00:00:00Z')})
  ]);
  const r=await service.dashboard(center,supervisor,{from:'2026-11-01',to:'2026-11-11'} as any);
  expect(r.summary).toEqual({goals:3,recorded:1,insufficient:1,none:1});
 });
 it.each([['invalid','2026-11-11'],['2026-12-01','2026-11-11'],
   ['2020-01-01','2026-11-11']])('invalid/reversed/excessive period %s rejects without querying data',async(from,to)=>{
  const {service,db}=make();
  await expect(service.dashboard(center,therapist,{from,to} as any)).rejects.toMatchObject({status:422});
  expect(db.child.findMany).not.toHaveBeenCalled();
 });
 it('default 90-day period is anchored to trial clock, not local browser timezone',async()=>{
  const {service}=make();const r=await service.dashboard(center,therapist,{} as any);
  expect(r.period.to).toBe('2026-11-11');
  expect(r.period.from).toBe('2026-08-14');
 });
});
