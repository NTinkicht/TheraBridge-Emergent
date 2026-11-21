// M4-08 90%-target: production report evidence/period authorization branches.
// All observations, clinician checkpoints and child identities are fictional.
import { ReportsService, goalEvidence } from '../src/clinical/reports.service';
const now=new Date('2026-11-13T12:00:00Z');
const from=new Date('2026-11-01T00:00:00Z'),to=new Date('2026-11-13T00:00:00Z');
const goal=()=>({key:'fictional-goal',title:'Fictional goal',measure:'count',baseline:1,target:3});
const version=(extra:any={})=>({
 id:'version-a',number:2,status:'DRAFT',goals:[goal()],reviewNotes:[],...extra
});
const plan=(extra:any={})=>({
 id:'plan-a',title:'Fictional plan',service:'speech',versions:[version()],...extra
});
const observation=(extra:any={})=>({
 id:'obs-1',planVersionId:'version-a',goalKey:'fictional-goal',
 observedOn:new Date('2026-11-06T00:00:00Z'),createdAt:now,value:2,note:null,sessionNoteId:null,
 ...extra
});
function make(){
 const db:any={
  assessment:{findMany:jest.fn().mockResolvedValue([])},
  therapyPlan:{findMany:jest.fn().mockResolvedValue([])},
  sessionNote:{count:jest.fn().mockResolvedValue(2)},
  appointment:{count:jest.fn().mockResolvedValue(1)},
  observation:{findMany:jest.fn().mockResolvedValue([])},
  child:{findMany:jest.fn().mockResolvedValue([])}
 };
 const clinical:any={
  assertActiveSupervisor:jest.fn().mockResolvedValue(undefined),
  therapistAssignments:jest.fn().mockResolvedValue([])
 };
 const trial:any={now:jest.fn(()=>now)};
 return {service:new ReportsService(db,trial,clinical),db,clinical};
}
const therapist:any={role:'THERAPIST',userId:'user-a',membershipId:'member-a'};
const supervisor:any={...therapist,role:'CLINICAL_SUPERVISOR'};
describe('M4-08 reporting never fabricates clinical change from missing values',()=>{
 it('zero observations produce none, without an invented prior point',()=>{
  const result=goalEvidence(goal(),[],from);
  expect(result.status).toBe('none');expect(result.prior).toBeNull();expect(result.points).toEqual([]);
 });
 it('a single observation is explicitly insufficient for change interpretation',()=>{
  const result=goalEvidence(goal(),[observation()],from);
  expect(result.status).toBe('insufficient');
  expect(result.points).toHaveLength(1);
  expect(result.points[0].observationId).toBe('obs-1');
 });
 it('two recorded observations remain distinct raw source points',()=>{
  const result=goalEvidence(goal(),[observation(),observation({id:'obs-2',value:3})],from);
  expect(result.status).toBe('recorded');expect(result.points).toHaveLength(2);
 });
 it('only the last pre-period point is used for historical comparison',()=>{
  const rows=[
   observation({observedOn:new Date('2026-10-01T00:00:00Z'),value:1}),
   observation({id:'old-2',observedOn:new Date('2026-10-31T00:00:00Z'),value:2}),
   observation({id:'new',observedOn:new Date('2026-11-06T00:00:00Z'),value:4})
  ];
  const result=goalEvidence(goal(),rows,from);
  expect(result.prior?.value).toBe(2);
  expect(result.points).toHaveLength(1);
  expect(result.points[0].value).toBe(4);
 });
 it('does not invent absent observation or session identifiers',()=>{
  const r=goalEvidence(goal(),[observation({id:undefined,sessionNoteId:undefined})],from);
  expect(r.points[0]).not.toHaveProperty('observationId');
  expect(r.points[0]).not.toHaveProperty('sessionNoteId');
 });
});
describe('M4-08 report evidence preserves exact version and checkpoint boundaries',()=>{
 it('returns empty evidence without looking up unrelated observations',async()=>{
  const {service,db}=make();
  const data=await service.evidence(db,'center-a','child-a','speech',from,to);
  expect(data.goals).toEqual([]);expect(data.plan).toBeNull();
  expect(data.sessions).toEqual({drafts:2,completedVisits:1});
  expect(db.observation.findMany).not.toHaveBeenCalled();
 });
 it('ignores a plan whose only version is withdrawn',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValue([plan({versions:[version({status:'WITHDRAWN'})]})]);
  const data=await service.evidence(db,'center-a','child-a','speech',from,to);
  expect(data.goals).toEqual([]);expect(data.plans).toEqual([]);
  expect(db.observation.findMany).not.toHaveBeenCalled();
 });
 it('reads only selected active source version and its evidence',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValue([plan({versions:[
   version({id:'old-v',status:'WITHDRAWN',number:1}),
   version({id:'version-a',status:'DRAFT'})
  ]})]);
  db.observation.findMany.mockResolvedValue([observation()]);
  const data=await service.evidence(db,'center-a','child-a','speech',from,to);
  expect(data.plan?.versionId).toBe('version-a');
  expect(data.goals[0].points).toHaveLength(1);
  expect(db.observation.findMany.mock.calls[0][0].where.planVersionId.in).toEqual(['version-a']);
 });
 it('multiple independently authorized plans cannot be collapsed into one invented source',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValue([
   plan(),plan({id:'plan-b',versions:[version({id:'version-b'})]})
  ]);
  const data=await service.evidence(db,'center-a','child-a','speech',from,to);
  expect(data.plans).toHaveLength(2);expect(data.plan).toBeNull();
 });
 it('rejects malformed, unrelated, stale and out-of-range clinician checkpoints',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValue([plan({versions:[version({reviewNotes:[
   null,'bad',[],{}, {kind:'OTHER',goalKey:'fictional-goal'},
   {kind:'GOAL_CHECKPOINT',goalKey:9},
   {kind:'GOAL_CHECKPOINT',goalKey:'foreign-key',reviewedOn:'2026-11-08',at:'2026-11-08T10:00:00Z'},
   {kind:'GOAL_CHECKPOINT',goalKey:'fictional-goal',reviewedOn:'bad',at:'2026-11-08T10:00:00Z'},
   {kind:'GOAL_CHECKPOINT',goalKey:'fictional-goal',reviewedOn:'2026-10-01',at:'2026-10-01T10:00:00Z'},
   {kind:'GOAL_CHECKPOINT',goalKey:'fictional-goal',reviewedOn:'2026-11-20',at:'2026-11-20T10:00:00Z'},
   {kind:'GOAL_CHECKPOINT',goalKey:'fictional-goal',reviewedOn:'2026-11-06',at:9}
  ]})]})]);
  const data=await service.evidence(db,'center-a','child-a','speech',from,to);
  expect(data.checkpoints).toEqual([]);
 });
 it('records exact version, goal key and fingerprint for a valid internal checkpoint',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValue([plan({versions:[version({reviewNotes:[{
   kind:'GOAL_CHECKPOINT',goalKey:'fictional-goal',reviewedOn:'2026-11-07',
   at:'2026-11-07T12:00:00Z',authorId:'fictional-clinician',
   summary:'Synthetic entry',observationIds:['obs-1']
  }]})]})]);
  const data=await service.evidence(db,'center-a','child-a','speech',from,to);
  expect(data.checkpoints).toHaveLength(1);
  expect(data.checkpoints[0]).toMatchObject({
   ref:'goalCheckpoint:version-a:0',planVersionId:'version-a',
   goalKey:'fictional-goal',reviewedOn:'2026-11-07'
  });
  expect(data.checkpoints[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(data.checkpoints)).not.toContain('Synthetic entry');
 });
 it('does not infer clinician checkpoints from a non-array history',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValue([plan({versions:[version({reviewNotes:'not-a-history'})]})]);
  const data=await service.evidence(db,'center-a','child-a','speech',from,to);
  expect(data.checkpoints).toEqual([]);
 });
});
describe('M4-08 dashboard access and date validation deny erroneous source queries',()=>{
 it('blocks coordinators, guardians and center admins before any clinical lookup',async()=>{
  for(const role of ['COORDINATOR','GUARDIAN','CENTER_ADMIN']){
   const {service,db}=make();
   await expect(service.dashboard('center-a',{...therapist,role},{} as any)).rejects.toMatchObject({status:403});
   expect(db.child.findMany).not.toHaveBeenCalled();
  }
 });
 it('requires live supervisor membership and refuses a stale supervisor role',async()=>{
  const {service,db,clinical}=make();
  clinical.assertActiveSupervisor.mockRejectedValue(new Error('synthetic role revoked'));
  await expect(service.dashboard('center-a',supervisor,{} as any)).rejects.toThrow('synthetic role revoked');
  expect(db.child.findMany).not.toHaveBeenCalled();
 });
 it('rejects inverted ranges rather than silently reversing clinical measurement periods',async()=>{
  const {service,db}=make();
  await expect(service.dashboard('center-a',therapist,{
   from:'2026-11-13',to:'2026-11-01'
  } as any)).rejects.toMatchObject({status:422});
  expect(db.child.findMany).not.toHaveBeenCalled();
 });
 it('refuses a reporting period exceeding two years',async()=>{
  const {service,db}=make();
  await expect(service.dashboard('center-a',therapist,{
   from:'2020-01-01',to:'2026-11-13'
  } as any)).rejects.toMatchObject({status:422});
  expect(db.child.findMany).not.toHaveBeenCalled();
 });
 it('rejects nonsensical calendar dates before enumerating child identities',async()=>{
  const {service,db}=make();
  await expect(service.dashboard('center-a',therapist,{
   from:'not-a-date',to:'2026-11-13'
  } as any)).rejects.toMatchObject({status:422});
  expect(db.child.findMany).not.toHaveBeenCalled();
 });
});
