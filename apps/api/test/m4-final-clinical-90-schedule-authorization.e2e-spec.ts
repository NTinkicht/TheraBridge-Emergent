// M4-08 90% target: execute clinical service authorization and plan
// scheduling validation before any mutation, with fictional fixtures only.
import { ClinicalService } from '../src/clinical/clinical.service';
const actor:any={role:'THERAPIST',userId:'fictional-user',membershipId:'fictional-member'};
const supervisor:any={...actor,role:'CLINICAL_SUPERVISOR'};
const goal=()=>({key:'g1',title:'Fictional objective',measure:'count',baseline:1,target:3});
function setup(){
 const db:any={
  membership:{findFirst:jest.fn().mockResolvedValue({id:'fictional-member',specialties:['speech']})},
  careAssignment:{findMany:jest.fn().mockResolvedValue([{childId:'child-a',service:'speech',membershipId:'fictional-member'}])},
  child:{findFirst:jest.fn().mockResolvedValue({id:'child-a',centerId:'center-a',status:'ACTIVE',services:['speech']})},
  $transaction:jest.fn()
 };
 const trial:any={now:jest.fn(()=>new Date('2026-11-13T12:00:00Z')),assertWritable:jest.fn()};
 const service=new ClinicalService(db,trial);
 return {db,trial,service};
}
const dto=(schedule?:any)=>({
 goals:[goal()],homeActivities:schedule?[{templateId:'fictional-template',frequency:'weekly',schedule}]:[],
 summary:'Synthetic',version:1
});
const weekly=(values:any={})=>({
 cadence:'WEEKLY',startsOn:'2026-11-16',endsOn:'2026-11-23',weekdays:[1],...values
});
const monthly=(values:any={})=>({
 cadence:'MONTHLY',startsOn:'2026-11-01',endsOn:'2026-12-01',monthDay:16,...values
});
function precheck(service:ClinicalService){
 jest.spyOn(service as any,'version').mockResolvedValue({
  id:'plan-version-a',centerId:'center-a',
  plan:{childId:'child-a',service:'speech',centerId:'center-a'}
 });
 jest.spyOn(service,'child').mockResolvedValue({id:'child-a'} as any);
 jest.spyOn(service,'write').mockImplementation(async()=>({ok:true} as any));
}
describe('clinical role and specialty read protection',()=>{
 it('denies all therapist assignments for non-therapist roles',async()=>{
  const {service,db}=setup();
  expect(await service.therapistAssignments(db,'center-a',supervisor,'child-a')).toEqual([]);
  expect(db.membership.findFirst).not.toHaveBeenCalled();
 });
 it('denies assignment when user membership was revoked',async()=>{
  const {service,db}=setup();db.membership.findFirst.mockResolvedValue(null);
  expect(await service.therapistAssignments(db,'center-a',actor,'child-a')).toEqual([]);
  expect(db.careAssignment.findMany).not.toHaveBeenCalled();
 });
 it('denies assignment when specialty list is empty or invalid',async()=>{
  for(const specialty of [[],undefined]){
   const {service,db}=setup();db.membership.findFirst.mockResolvedValue({specialties:specialty});
   expect(await service.therapistAssignments(db,'center-a',actor)).toEqual([]);
   expect(db.careAssignment.findMany).not.toHaveBeenCalled();
  }
 });
 it('enforces exact child scope for active therapist assignments',async()=>{
  const {service,db}=setup();
  await service.therapistAssignments(db,'center-a',actor,'child-a');
  expect(db.careAssignment.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:'center-a',childId:'child-a',membershipId:'fictional-member',endedAt:null,service:{in:['speech']}
  });
 });
 it('refuses the supervisor role when identity is therapist',async()=>{
  const {service,db}=setup();
  await expect(service.assertActiveSupervisor(db,'center-a',actor)).rejects.toMatchObject({status:403});
 });
 it('revoked supervisor cannot bypass live membership verification',async()=>{
  const {service,db}=setup();db.membership.findFirst.mockResolvedValue(null);
  await expect(service.assertActiveSupervisor(db,'center-a',supervisor)).rejects.toMatchObject({status:403});
 });
 it('allows live supervisor and rejects all guardian clinical reads',async()=>{
  const {service,db}=setup();
  await expect(service.assertActiveSupervisor(db,'center-a',supervisor)).resolves.toBeUndefined();
  await expect(service.child(db,'center-a',{...actor,role:'GUARDIAN'},'child-a')).rejects.toMatchObject({status:403});
 });
 it('denies an unassigned or other-specialty child without disclosing its identity',async()=>{
  const {service,db}=setup();
  db.careAssignment.findMany.mockResolvedValue([]);
  await expect(service.child(db,'center-a',actor,'child-a','speech')).rejects.toMatchObject({status:404});
  expect(db.child.findFirst).not.toHaveBeenCalled();
 });
 it('refuses an inactive child and a child missing the requested specialty',async()=>{
  for(const row of [null,{id:'child-a',services:['occupational']} ]){
   const {service,db}=setup();db.child.findFirst.mockResolvedValue(row);
   await expect(service.child(db,'center-a',actor,'child-a','speech')).rejects.toMatchObject({status:404});
  }
 });
 it('prevents a supervisor, coordinator or guardian from writing any clinical draft',async()=>{
  for(const role of ['CLINICAL_SUPERVISOR','COORDINATOR','GUARDIAN']){
   const {service,db}=setup();
   await expect(service.write('center-a',{...actor,role},'child-a','speech',async()=>true))
    .rejects.toMatchObject({status:403});
   expect(db.$transaction).not.toHaveBeenCalled();
  }
 });
});
describe('clinical plan date validation is exact and denies malformed schedules before writes',()=>{
 it('rejects duplicated goal identities before saving',async()=>{
  const {service}=setup();precheck(service);
  await expect(service.updateVersion('center-a',actor,'plan-version-a',{...dto(),goals:[goal(),goal()]} as any))
   .rejects.toMatchObject({status:422});
  expect(service.write).not.toHaveBeenCalled();
 });
 it.each(['2026-02-30','1999-11-01','2101-01-01','not-a-date'])(
  'rejects an invalid calendar goal target date %s',async date=>{
   const {service}=setup();precheck(service);
   await expect(service.updateVersion('center-a',actor,'plan-version-a',{
    ...dto(),goals:[{...goal(),targetOn:date}]
   } as any)).rejects.toMatchObject({status:422});
   expect(service.write).not.toHaveBeenCalled();
  }
 );
 it.each([
  ['inverted',weekly({startsOn:'2026-11-30',endsOn:'2026-11-16'})],
  ['over a year',weekly({endsOn:'2028-01-01'})],
  ['invalid day',weekly({startsOn:'2026-02-30'})],
  ['missing weekdays',weekly({weekdays:undefined})],
  ['empty weekdays',weekly({weekdays:[]})],
  ['duplicate weekdays',weekly({weekdays:[1,1]})],
  ['month day on weekly',weekly({monthDay:16})],
  ['weekday not in period',weekly({startsOn:'2026-11-16',endsOn:'2026-11-16',weekdays:[5]})],
  ['monthly missing date',monthly({monthDay:undefined})],
  ['monthly below range',monthly({monthDay:0})],
  ['monthly above range',monthly({monthDay:32})],
  ['monthly with weekdays',monthly({weekdays:[1]})],
  ['monthly day absent',monthly({startsOn:'2026-02-01',endsOn:'2026-02-28',monthDay:30})],
  ['unknown cadence',weekly({cadence:'DAILY'})]
 ])('rejects %s schedule with no clinical write',async (_label,schedule)=>{
  const {service}=setup();precheck(service);
  await expect(service.updateVersion('center-a',actor,'plan-version-a',dto(schedule) as any))
    .rejects.toMatchObject({status:422});
  expect(service.write).not.toHaveBeenCalled();
 });
 it('rejects associations to goals absent from the exact version',async()=>{
  const {service}=setup();precheck(service);
  await expect(service.updateVersion('center-a',actor,'plan-version-a',{
   ...dto(),homeActivities:[{templateId:'template-a',frequency:'weekly',goalKey:'foreign-goal'}]
  } as any)).rejects.toMatchObject({status:422});
  expect(service.write).not.toHaveBeenCalled();
 });
 it('rejects duplicate activity template identity in the same plan version',async()=>{
  const {service}=setup();precheck(service);
  await expect(service.updateVersion('center-a',actor,'plan-version-a',{
   ...dto(),homeActivities:[
    {templateId:'template-a',frequency:'weekly'},
    {templateId:'template-a',frequency:'monthly'}
   ]
  } as any)).rejects.toMatchObject({status:422});
  expect(service.write).not.toHaveBeenCalled();
 });
 it('accepts legitimate weekly and monthly calendars for further authorized write checks',async()=>{
  for(const schedule of [weekly(),monthly()]){
   const {service}=setup();precheck(service);
   await expect(service.updateVersion('center-a',actor,'plan-version-a',dto(schedule) as any))
    .resolves.toEqual({ok:true});
   expect(service.write).toHaveBeenCalledTimes(1);
  }
 });
});
