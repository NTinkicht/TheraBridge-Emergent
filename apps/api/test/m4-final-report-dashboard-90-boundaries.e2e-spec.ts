// M4-08: genuine ReportsService dashboard/read scope choices using synthetic
// clinic fixtures. No real patient records, clinical approvals or releases.
import {ReportsService} from '../src/clinical/reports.service';
const therapist:any={role:'THERAPIST',userId:'synthetic-therapist',membershipId:'fictional-member'};
const supervisor:any={...therapist,role:'CLINICAL_SUPERVISOR'};
const child=(more:any={})=>({id:'child-a',firstName:'Fictional',lastName:'Child',preferredName:null,services:['speech'],...more});
const goal=(more:any={})=>({key:'goal-one',title:'Fictional goal',measure:'count',baseline:1,target:4,...more});
const version=(more:any={})=>({id:'version-a',status:'DRAFT',number:1,goals:[goal()],...more});
const plan=(more:any={})=>({
 id:'plan-a',childId:'child-a',service:'speech',title:'Fictional plan',
 versions:[version()],...more
});
function make(){
 const db:any={
  child:{findMany:jest.fn().mockResolvedValue([child()])},
  therapyPlan:{findMany:jest.fn().mockResolvedValue([plan()])},
  observation:{findMany:jest.fn().mockResolvedValue([])},
  progressReport:{findMany:jest.fn().mockResolvedValue([]),findFirst:jest.fn().mockResolvedValue(null)},
  membership:{findMany:jest.fn().mockResolvedValue([])},
  user:{findMany:jest.fn().mockResolvedValue([])}
 };
 const clinical:any={
  assertActiveSupervisor:jest.fn().mockResolvedValue(undefined),
  therapistAssignments:jest.fn().mockResolvedValue([{childId:'child-a',service:'speech'}]),
  child:jest.fn().mockResolvedValue(child())
 };
 const trial:any={now:jest.fn(()=>new Date('2026-11-13T12:00:00.000Z'))};
 return {service:new ReportsService(db,trial,clinical),db,clinical};
}
const period={from:'2026-11-01',to:'2026-11-12'};
describe('M4-08 dashboard filters child and specialty by live assignment rather than navigation',()=>{
 it('does not expose plans without live therapist assignment',async()=>{
  const {service,db,clinical}=make();clinical.therapistAssignments.mockResolvedValue([]);
  const r=await service.dashboard('center-one',therapist,period as any);
  expect(r.children).toEqual([]);expect(r.goals).toEqual([]);
  expect(db.child.findMany.mock.calls[0][0].where.id.in).toEqual([]);
  expect(db.therapyPlan.findMany.mock.calls[0][0].where.childId.in).toEqual([]);
 });
 it('does not expose another specialty for the same assigned child',async()=>{
  const {service,db}=make();
  db.therapyPlan.findMany.mockResolvedValue([plan({service:'occupational'})]);
  const r=await service.dashboard('center-one',therapist,period as any);
  expect(r.goals).toEqual([]);
  expect(r.children[0].services).toEqual(['speech']);
 });
 it('lists only active child identities from the correct center',async()=>{
  const {service,db}=make();
  await service.dashboard('center-one',therapist,period as any);
  expect(db.child.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:'center-one',status:'ACTIVE'
  });
 });
 it('filters requested child without returning unrelated synthetic goal measurements',async()=>{
  const {service,db}=make();
  const r=await service.dashboard('center-one',therapist,{...period,childId:'child-b'} as any);
  expect(r.goals).toEqual([]);
  expect(db.therapyPlan.findMany.mock.calls[0][0].where.childId.in).toEqual([]);
 });
 it('filters by requested goal identity without substituting same-name goals',async()=>{
  const {service,db}=make();
  const r=await service.dashboard('center-one',therapist,{...period,goalKey:'unrelated'} as any);
  expect(r.goals).toEqual([]);
  expect(r.summary.goals).toBe(0);
 });
 it('passes a bounded service filter into the center-scoped plan query',async()=>{
  const {service,db}=make();
  await service.dashboard('center-one',therapist,{...period,service:'speech'} as any);
  expect(db.therapyPlan.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:'center-one',service:'speech'
  });
 });
 it('does not promote withdrawn-only or superseded-only plan histories',async()=>{
  for(const versions of [
   [version({status:'WITHDRAWN'})],
   [version({status:'SUPERSEDED'})],
   []
  ]){
   const {service,db}=make();db.therapyPlan.findMany.mockResolvedValue([plan({versions})]);
   const r=await service.dashboard('center-one',therapist,period as any);
   expect(r.goals).toEqual([]);
  }
 });
 it('defaults missing goal array to no clinical progress, not an invented record',async()=>{
  const {service,db}=make();db.therapyPlan.findMany.mockResolvedValue([plan({versions:[version({goals:null})]})]);
  const r=await service.dashboard('center-one',therapist,period as any);
  expect(r.goals).toEqual([]);expect(r.summary.none).toBe(0);
 });
 it('uses preferred name only when recorded and never guesses a patient identity',async()=>{
  const {service,db}=make();db.child.findMany.mockResolvedValue([child({preferredName:'Synthetic Preferred'})]);
  const r=await service.dashboard('center-one',therapist,period as any);
  expect(r.children[0].name).toBe('Synthetic Preferred Child');
  expect(r.goals[0].childName).toBe('Synthetic Preferred Child');
 });
 it('reports a goal with zero observations explicitly as none',async()=>{
  const {service}=make();
  const r=await service.dashboard('center-one',therapist,period as any);
  expect(r.goals).toHaveLength(1);
  expect(r.summary).toMatchObject({goals:1,none:1,recorded:0,insufficient:0});
 });
 it('does not fabricate progress from a single observation',async()=>{
  const {service,db}=make();
  db.observation.findMany.mockResolvedValue([{
   id:'obs-one',planVersionId:'version-a',goalKey:'goal-one',
   observedOn:new Date('2026-11-06T00:00:00Z'),createdAt:new Date('2026-11-06T12:00:00Z'),value:2
  }]);
  const r=await service.dashboard('center-one',therapist,period as any);
  expect(r.summary).toMatchObject({goals:1,none:0,insufficient:1,recorded:0});
 });
 it('records change only from two source-linked observations in this exact version',async()=>{
  const {service,db}=make();
  db.observation.findMany.mockResolvedValue([1,2].map((value)=>({
   id:'obs-'+value,planVersionId:'version-a',goalKey:'goal-one',
   observedOn:new Date('2026-11-0'+(value+4)+'T00:00:00Z'),
   createdAt:new Date('2026-11-0'+(value+4)+'T12:00:00Z'),value
  })));
  const r=await service.dashboard('center-one',therapist,period as any);
  expect(r.summary).toMatchObject({goals:1,recorded:1});
  expect(r.goals[0].points).toHaveLength(2);
 });
 it('excludes observations tied only to another immutable version',async()=>{
  const {service,db}=make();
  db.observation.findMany.mockResolvedValue([{
   id:'wrong-version',planVersionId:'version-old',goalKey:'goal-one',
   observedOn:new Date('2026-11-06T00:00:00Z'),createdAt:new Date('2026-11-06T12:00:00Z'),value:999
  }]);
  const r=await service.dashboard('center-one',therapist,period as any);
  expect(r.summary.none).toBe(1);
  expect(r.goals[0].points).toEqual([]);
 });
 it('supervisor receives active center child services without therapist assignment expansion',async()=>{
  const {service,db,clinical}=make();db.child.findMany.mockResolvedValue([child({services:['speech','occupational']})]);
  const r=await service.dashboard('center-one',supervisor,period as any);
  expect(r.children[0].services).toEqual(['speech','occupational']);
  expect(clinical.assertActiveSupervisor).toHaveBeenCalledTimes(1);
  expect(clinical.therapistAssignments).not.toHaveBeenCalled();
  expect(db.child.findMany.mock.calls[0][0].where).toEqual({centerId:'center-one',status:'ACTIVE'});
 });
 it('returns no children or goals when the center has no active child',async()=>{
  const {service,db}=make();db.child.findMany.mockResolvedValue([]);
  const r=await service.dashboard('center-one',supervisor,period as any);
  expect(r.children).toEqual([]);expect(r.goals).toEqual([]);
 });
});
