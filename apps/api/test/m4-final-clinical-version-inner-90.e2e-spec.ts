// M4-08: execute the inner production plan-version transaction, not merely
// pre-validation. Synthetic goals prove immutable measurements/checkpoints.
import {ClinicalService} from '../src/clinical/clinical.service';
const now=new Date('2026-11-13T12:00:00Z');
const actor:any={role:'THERAPIST',userId:'author',membershipId:'member'};
const goal=(extra:any={})=>({key:'g1',title:'Synthetic goal',measure:'count',baseline:1,target:3,...extra});
const activity=(extra:any={})=>({templateId:'template-a',frequency:'weekly',...extra});
const template=(extra:any={})=>({id:'template-a',title:'Synthetic exercise',service:'speech',
 ageBand:'6-8',minutes:10,materials:[],steps:['Synthetic step'],safety:[],version:1,...extra});
const version=(extra:any={})=>({id:'version-a',planId:'plan-a',centerId:'center-a',
 authorId:'author',number:1,status:'DRAFT',version:3,
 goals:[goal()],homeActivities:[],reviewNotes:[],...extra});
const dto=(extra:any={})=>({summary:'Synthetic only',version:3,goals:[goal()],homeActivities:[],...extra});
function setup(extra:any={}){
 const tx:any={
  planVersion:{
   findUniqueOrThrow:jest.fn().mockResolvedValue(version()),
   updateMany:jest.fn().mockResolvedValue({count:1})
  },
  activityTemplate:{findMany:jest.fn().mockResolvedValue([])},
  observation:{findMany:jest.fn().mockResolvedValue([])},
  centerEvent:{create:jest.fn().mockResolvedValue({id:1})},
  ...extra
 };
 const db:any={};
 const trial:any={};
 const service=new ClinicalService(db,trial);
 (service as any).version=jest.fn().mockResolvedValue({...version(),plan:{childId:'child-a',service:'speech',centerId:'center-a'}});
 (service as any).child=jest.fn().mockResolvedValue({id:'child-a'});
 (service as any).write=jest.fn(async (_c:any,_v:any,_child:any,_s:any,fn:any)=>fn(tx,now));
 return {service,tx};
}
const save=(service:ClinicalService,values:any=dto())=>service.updateVersion('center-a',actor,'version-a',values);
describe('M4-08 exact-version draft transaction respects author and template isolation',()=>{
 it('writes unchanged plain goal and logs only the authorized version',async()=>{
  const {service,tx}=setup();
  await expect(save(service)).resolves.toEqual({ok:true});
  expect(tx.planVersion.updateMany.mock.calls[0][0].where).toMatchObject({
   id:'version-a',centerId:'center-a',authorId:'author',version:3,
   status:{in:['DRAFT','RETURNED_FOR_REVISION']}
  });
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
 });
 it('refuses an unassigned library template before modifying the plan',async()=>{
  const {service,tx}=setup();
  await expect(save(service,dto({homeActivities:[activity()]}))).rejects.toMatchObject({status:422});
  expect(tx.planVersion.updateMany).not.toHaveBeenCalled();
 });
 it('denies cross-therapist changes even with matching editable version',async()=>{
  const {service,tx}=setup();
  tx.planVersion.findUniqueOrThrow.mockResolvedValue(version({authorId:'different-author'}));
  await expect(save(service)).rejects.toMatchObject({status:403});
  expect(tx.planVersion.updateMany).not.toHaveBeenCalled();
 });
 it('records explicit concurrent version conflict rather than falsely confirming save',async()=>{
  const {service,tx}=setup();tx.planVersion.updateMany.mockResolvedValue({count:0});
  await expect(save(service)).rejects.toMatchObject({status:409});
 });
 it('distinguishes frozen version denial from ordinary lost-update conflict',async()=>{
  const {service,tx}=setup();tx.planVersion.updateMany.mockResolvedValue({count:0});
  jest.mocked((service as any).version).mockResolvedValue({...version({status:'FROZEN_INTERNAL'}),plan:{childId:'child-a',service:'speech'}});
  await expect(save(service)).rejects.toThrow('Only a draft can be edited');
 });
 it('conceals a missing or unauthorized plan version as not found',async()=>{
  const {service}=setup();
  jest.mocked((service as any).child).mockRejectedValue(new (require('@nestjs/common').NotFoundException)());
  await expect(save(service)).rejects.toMatchObject({status:404});
  expect((service as any).write).not.toHaveBeenCalled();
 });
 it('keeps a legal library activity snapshot server generated and strips untrusted client fields',async()=>{
  const {service,tx}=setup();tx.activityTemplate.findMany.mockResolvedValue([template()]);
  await save(service,dto({homeActivities:[activity({
   extraFromClient:'not-allowed',goalKey:'g1',note:'Fictional',durationMinutes:11
  })]}));
  const saved=tx.planVersion.updateMany.mock.calls[0][0].data.homeActivities;
  expect(saved).toHaveLength(1);
  expect(saved[0].snapshot).toMatchObject({id:'template-a',service:'speech',version:1});
  expect(saved[0]).not.toHaveProperty('extraFromClient');
  expect(saved[0].goalKey).toBe('g1');
 });
 it('retains original saved snapshot when template library content changes',async()=>{
  const {service,tx}=setup();
  const snapshot={id:'template-a',title:'Original',version:1,service:'speech'};
  tx.planVersion.findUniqueOrThrow.mockResolvedValue(version({homeActivities:[activity({snapshot})]}));
  tx.activityTemplate.findMany.mockResolvedValue([template({title:'New template'})]);
  await save(service,dto({homeActivities:[activity()]}));
  expect(tx.planVersion.updateMany.mock.calls[0][0].data.homeActivities[0].snapshot).toBe(snapshot);
 });
 it('writes exact weekly schedule as a draft, without claiming released care plan',async()=>{
  const {service,tx}=setup();tx.activityTemplate.findMany.mockResolvedValue([template()]);
  await save(service,dto({homeActivities:[activity({schedule:{
   cadence:'WEEKLY',startsOn:'2026-11-16',endsOn:'2026-11-30',weekdays:[1]
  }})]}));
  const item=tx.planVersion.updateMany.mock.calls[0][0].data.homeActivities[0];
  expect(item.frequency).toBe('Weekly calendar draft');
  expect(item.schedule).toEqual({cadence:'WEEKLY',startsOn:'2026-11-16',endsOn:'2026-11-30',weekdays:[1]});
 });
 it('preserves exact monthly day and distinct draft frequency',async()=>{
  const {service,tx}=setup();tx.activityTemplate.findMany.mockResolvedValue([template()]);
  await save(service,dto({homeActivities:[activity({schedule:{
   cadence:'MONTHLY',startsOn:'2026-11-01',endsOn:'2026-12-30',monthDay:15
  }})]}));
  const item=tx.planVersion.updateMany.mock.calls[0][0].data.homeActivities[0];
  expect(item.frequency).toBe('Monthly calendar draft');
  expect(item.schedule.monthDay).toBe(15);
 });
 it('locks a goal definition after direct clinical observation',async()=>{
  const {service,tx}=setup();
  tx.observation.findMany.mockResolvedValue([{goalKey:'g1'}]);
  await expect(save(service,dto({goals:[goal({target:5})]}))).rejects.toMatchObject({status:409});
  expect(tx.planVersion.updateMany).not.toHaveBeenCalled();
 });
 it('keeps unchanged measured goal save idempotent',async()=>{
  const {service,tx}=setup();tx.observation.findMany.mockResolvedValue([{goalKey:'g1'}]);
  await expect(save(service)).resolves.toEqual({ok:true});
  expect(tx.planVersion.updateMany).toHaveBeenCalledTimes(1);
 });
 it('prevents checkpoint-only goal redefinition, even without observations',async()=>{
  const {service,tx}=setup();
  tx.planVersion.findUniqueOrThrow.mockResolvedValue(version({reviewNotes:[
   {kind:'GOAL_CHECKPOINT',goalKey:'g1',reviewedOn:'2026-11-12'}
  ]}));
  await expect(save(service,dto({goals:[goal({baseline:9})]}))).rejects.toMatchObject({status:409});
 });
 it('ignores unrelated or malformed review-note objects for goal locking',async()=>{
  const {service,tx}=setup();
  tx.planVersion.findUniqueOrThrow.mockResolvedValue(version({reviewNotes:[
   null,[],{kind:'OTHER',goalKey:'g1'}, {kind:'GOAL_CHECKPOINT',goalKey:9}
  ]}));
  await expect(save(service,dto({goals:[goal({baseline:9})]}))).resolves.toEqual({ok:true});
 });
 it('retains legacy whitespace title bytes when definition is unchanged',async()=>{
  const {service,tx}=setup();
  tx.planVersion.findUniqueOrThrow.mockResolvedValue(version({goals:[goal({title:' Synthetic goal '})]}));
  await save(service);
  expect(tx.planVersion.updateMany.mock.calls[0][0].data.goals[0].title).toBe(' Synthetic goal ');
 });
 it('refuses redefining a legacy goal with a 201+ character title',async()=>{
  const {service,tx}=setup();
  await expect(save(service,dto({goals:[goal({title:'X'.repeat(201)})]}))).rejects.toMatchObject({status:400});
  expect(tx.planVersion.updateMany).not.toHaveBeenCalled();
 });
 it('retains existing old-format long title on summary-only save without redefinition',async()=>{
  const {service,tx}=setup();
  const oldTitle='A'.repeat(210);
  tx.planVersion.findUniqueOrThrow.mockResolvedValue(version({goals:[goal({title:oldTitle})]}));
  await save(service,dto({goals:[goal({title:oldTitle})]}));
  expect(tx.planVersion.updateMany.mock.calls[0][0].data.goals[0].title).toBe(oldTitle);
 });
 it('rejects removing a measured goal while keeping old evidence',async()=>{
  const {service,tx}=setup();
  tx.observation.findMany.mockResolvedValue([{goalKey:'g1'}]);
  await expect(save(service,dto({goals:[]}))).rejects.toMatchObject({status:409});
 });
 it('rejects empty template set when activity references a template from another specialty',async()=>{
  const {service,tx}=setup();
  tx.activityTemplate.findMany.mockResolvedValue([]);
  await expect(save(service,dto({homeActivities:[activity({goalKey:'g1'})]}))).rejects.toMatchObject({status:422});
  expect(tx.activityTemplate.findMany.mock.calls[0][0].where).toMatchObject({service:'speech'});
 });
});
