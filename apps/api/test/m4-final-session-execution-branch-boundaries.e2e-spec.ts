// M4-08 clinical session execution boundaries. Exercises the actual service
// with synthetic in-memory collaborators; no real records, approvals or signing.
import { SessionExecutionService } from '../src/clinical/session.service';

const now=new Date('2026-11-13T12:00:00.000Z');
const actor:any={userId:'fictional-therapist',membershipId:'fictional-membership',role:'THERAPIST'};
const startDto=(extra:any={})=>({
 service:'speech',actualStart:'2026-11-13T10:00:00.000Z',
 sessionDate:'2026-11-13',startKey:'synthetic-start-key',...extra
});
const saveDto=(extra:any={})=>({
 version:1,mutationKey:'fictional-mutation',actualStart:'2026-11-13T10:00:00.000Z',
 actualEnd:null,executionStatus:'IN_PROGRESS',attendance:'ATTENDED',activities:[],
 sections:{},...extra
});
const note=(extra:any={})=>({
 id:'session-1',centerId:'center-one',childId:'child-one',
 membershipId:actor.membershipId,service:'speech',appointmentId:null,
 sessionDate:new Date('2026-11-13T00:00:00.000Z'),
 actualStart:new Date('2026-11-13T10:00:00.000Z'),
 startKey:'synthetic-start-key',version:1,executionStatus:'IN_PROGRESS',
 activities:[],lastMutationKey:null,lastMutationHash:null,
 updatedAt:now,...extra
});
function make(){
 const tx:any={
  membership:{findUniqueOrThrow:jest.fn().mockResolvedValue({specialties:['speech']})},
  appointment:{findFirst:jest.fn().mockResolvedValue(null)},
  center:{findUniqueOrThrow:jest.fn().mockResolvedValue({timezone:'UTC'})},
  sessionNote:{
   findFirst:jest.fn().mockResolvedValue(null),
   create:jest.fn().mockResolvedValue({id:'new-session'}),
   findUniqueOrThrow:jest.fn().mockResolvedValue(note()),
   updateMany:jest.fn().mockResolvedValue({count:1})
  },
  activityTemplate:{findFirst:jest.fn().mockResolvedValue(null)},
  planVersion:{findFirst:jest.fn().mockResolvedValue(null)},
  centerEvent:{create:jest.fn().mockResolvedValue({id:1})}
 };
 const prisma:any={sessionNote:{findFirst:jest.fn().mockResolvedValue(note())}};
 const clinical:any={write:jest.fn((_c:any,_v:any,_child:any,_service:any,fn:any)=>fn(tx,now))};
 return {service:new SessionExecutionService(prisma,clinical),tx,prisma,clinical};
}
describe('M4-08 session start enforces therapist specialty, appointment and idempotence',()=>{
 it('denies a specialty absent from the therapist membership',async()=>{
  const {service,tx}=make();
  tx.membership.findUniqueOrThrow.mockResolvedValue({specialties:['occupational']});
  await expect(service.start('center-one',actor,'child-one',startDto() as any)).rejects.toMatchObject({status:404});
  expect(tx.sessionNote.create).not.toHaveBeenCalled();
 });
 it('rejects nonexistent appointments in its exact center, child, member and specialty',async()=>{
  const {service,tx}=make();
  await expect(service.start('center-one',actor,'child-one',startDto({appointmentId:'absent'}) as any))
    .rejects.toMatchObject({status:404});
  expect(tx.appointment.findFirst.mock.calls[0][0].where).toMatchObject({
   centerId:'center-one',childId:'child-one',membershipId:actor.membershipId,service:'speech'
  });
  expect(tx.sessionNote.create).not.toHaveBeenCalled();
 });
 it('rejects already completed appointments and appointments that have not begun',async()=>{
  for(const appointment of [
   {status:'COMPLETED',startsAt:new Date('2026-11-13T09:00:00Z')},
   {status:'SCHEDULED',startsAt:new Date('2026-11-14T09:00:00Z')}
  ]){
   const {service,tx}=make();tx.appointment.findFirst.mockResolvedValue(appointment);
   await expect(service.start('center-one',actor,'child-one',startDto({appointmentId:'appointment-one'}) as any))
     .rejects.toBeDefined();
   expect(tx.sessionNote.create).not.toHaveBeenCalled();
  }
 });
 it('replays an exact already-started session without a second write',async()=>{
  const {service,tx}=make();tx.sessionNote.findFirst.mockResolvedValue(note());
  const result=await service.start('center-one',actor,'child-one',startDto() as any);
  expect(result).toEqual({id:'session-1'});
  expect(tx.sessionNote.create).not.toHaveBeenCalled();
 });
 it('refuses a reused start key tied to another child or timestamp',async()=>{
  for(const previous of [note({childId:'other-child'}),note({actualStart:new Date('2026-11-13T09:00:00Z')})]){
   const {service,tx}=make();tx.sessionNote.findFirst.mockResolvedValue(previous);
   await expect(service.start('center-one',actor,'child-one',startDto() as any)).rejects.toMatchObject({status:409});
   expect(tx.sessionNote.create).not.toHaveBeenCalled();
  }
 });
 it.each([
  ['invalid time','not-a-date'],
  ['future time','2026-11-13T13:00:00Z'],
  ['older than 24 hours','2026-11-12T10:00:00Z'],
 ])('rejects an %s before creating a clinical session',async(_,time)=>{
  const {service,tx}=make();
  await expect(service.start('center-one',actor,'child-one',startDto({actualStart:time}) as any))
   .rejects.toMatchObject({status:422});
  expect(tx.sessionNote.create).not.toHaveBeenCalled();
 });
 it('refuses an actual start on a different center-local calendar day',async()=>{
  const {service,tx}=make();
  tx.center.findUniqueOrThrow.mockResolvedValue({timezone:'Pacific/Kiritimati'});
  await expect(service.start('center-one',actor,'child-one',startDto() as any))
    .rejects.toMatchObject({status:422});
  expect(tx.sessionNote.create).not.toHaveBeenCalled();
 });
 it('writes one session only after authorized timezone and specialty checks',async()=>{
  const {service,tx}=make();
  const result=await service.start('center-one',actor,'child-one',startDto() as any);
  expect(result).toEqual({id:'new-session'});
  expect(tx.sessionNote.create).toHaveBeenCalledTimes(1);
  expect(tx.sessionNote.create.mock.calls[0][0].data).toMatchObject({
   centerId:'center-one',childId:'child-one',membershipId:actor.membershipId,service:'speech',
   startKey:'synthetic-start-key'
  });
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
 });
});
describe('M4-08 session save cannot invent clinical completion or cross-child activity evidence',()=>{
 it('denies absent session before opening a write scope',async()=>{
  const {service,prisma,clinical}=make();
  prisma.sessionNote.findFirst.mockResolvedValue(null);
  await expect(service.save('center-one',actor,'absent',saveDto() as any)).rejects.toMatchObject({status:404});
  expect(clinical.write).not.toHaveBeenCalled();
 });
 it('denies saving someone else’s therapist session',async()=>{
  const {service,tx}=make();
  tx.sessionNote.findUniqueOrThrow.mockResolvedValue(note({membershipId:'another-member'}));
  await expect(service.save('center-one',actor,'session-1',saveDto() as any)).rejects.toMatchObject({status:403});
  expect(tx.sessionNote.updateMany).not.toHaveBeenCalled();
 });
 it('denies specialty changes not assigned to the current therapist',async()=>{
  const {service,tx}=make();
  tx.membership.findUniqueOrThrow.mockResolvedValue({specialties:[]});
  await expect(service.save('center-one',actor,'session-1',saveDto() as any)).rejects.toMatchObject({status:404});
  expect(tx.sessionNote.updateMany).not.toHaveBeenCalled();
 });
 it('detects conflicting reuse of a mutation idempotency key',async()=>{
  const {service,tx}=make();
  tx.sessionNote.findUniqueOrThrow.mockResolvedValue(note({
   lastMutationKey:'fictional-mutation',lastMutationHash:'different-payload-hash'
  }));
  await expect(service.save('center-one',actor,'session-1',saveDto() as any)).rejects.toMatchObject({status:409});
  expect(tx.sessionNote.updateMany).not.toHaveBeenCalled();
 });
 it('never reopens completed sessions or overwrites a stale version',async()=>{
  for(const row of [note({executionStatus:'COMPLETED'}),note({version:2})]){
   const {service,tx}=make();tx.sessionNote.findUniqueOrThrow.mockResolvedValue(row);
   await expect(service.save('center-one',actor,'session-1',saveDto() as any)).rejects.toMatchObject({status:409});
   expect(tx.sessionNote.updateMany).not.toHaveBeenCalled();
  }
 });
 it('rejects an attached appointment that is cancelled or belongs to an invalid state',async()=>{
  const {service,tx}=make();tx.sessionNote.findUniqueOrThrow.mockResolvedValue(note({appointmentId:'appointment-one'}));
  tx.appointment.findFirst.mockResolvedValue({status:'CANCELLED'});
  await expect(service.save('center-one',actor,'session-1',saveDto() as any)).rejects.toMatchObject({status:409});
  expect(tx.sessionNote.updateMany).not.toHaveBeenCalled();
 });
 it('refuses changes to the pinned actual start time',async()=>{
  const {service,tx}=make();
  await expect(service.save('center-one',actor,'session-1',saveDto({actualStart:'2026-11-13T09:00:00Z'}) as any))
    .rejects.toMatchObject({status:422});
  expect(tx.sessionNote.updateMany).not.toHaveBeenCalled();
 });
 it.each([
  ['future end',{actualEnd:'2026-11-14T12:00:00Z'}],
  ['end before start',{actualEnd:'2026-11-13T09:00:00Z'}],
  ['completion without end',{executionStatus:'COMPLETED',actualEnd:null}],
  ['invalid end',{actualEnd:'invalid-date'}],
 ])('rejects %s as invalid time evidence',async(_,change)=>{
  const {service,tx}=make();
  await expect(service.save('center-one',actor,'session-1',saveDto(change) as any)).rejects.toMatchObject({status:422});
  expect(tx.sessionNote.updateMany).not.toHaveBeenCalled();
 });
 it('rejects duplicate activity IDs before looking up clinical templates',async()=>{
  const {service,tx}=make();
  const a={id:'duplicate',templateId:'template-one',completion:'NOT_STARTED'};
  await expect(service.save('center-one',actor,'session-1',saveDto({activities:[a,a]}) as any))
    .rejects.toMatchObject({status:422});
  expect(tx.activityTemplate.findFirst).not.toHaveBeenCalled();
 });
 it('refuses an activity template outside the current specialty library',async()=>{
  const {service,tx}=make();
  const a={id:'activity-one',templateId:'not-a-speech-template',completion:'NOT_STARTED'};
  await expect(service.save('center-one',actor,'session-1',saveDto({activities:[a]}) as any))
    .rejects.toMatchObject({status:422});
  expect(tx.activityTemplate.findFirst.mock.calls[0][0].where.service).toBe('speech');
  expect(tx.sessionNote.updateMany).not.toHaveBeenCalled();
 });
 it('requires both version and goal key for any linked goal, never one alone',async()=>{
  const {service,tx}=make();
  tx.activityTemplate.findFirst.mockResolvedValue({id:'template-one',version:1,title:'Synthetic',service:'speech',centerId:null});
  const a={id:'activity-one',templateId:'template-one',completion:'NOT_STARTED',goalKey:'unscoped-goal'};
  await expect(service.save('center-one',actor,'session-1',saveDto({activities:[a]}) as any))
    .rejects.toMatchObject({status:422});
  expect(tx.planVersion.findFirst).not.toHaveBeenCalled();
 });
 it('rejects completed activity without outcome, assistance and objective evidence',async()=>{
  const {service,tx}=make();
  tx.activityTemplate.findFirst.mockResolvedValue({id:'template-one',version:1,title:'Synthetic',service:'speech',centerId:null});
  const a={id:'activity-one',templateId:'template-one',completion:'COMPLETED',objective:'',outcome:null,assistance:null};
  await expect(service.save('center-one',actor,'session-1',saveDto({activities:[a]}) as any))
    .rejects.toMatchObject({status:422});
 });
 it('refuses an attempted completion with unreviewed activities',async()=>{
  const {service,tx}=make();
  tx.activityTemplate.findFirst.mockResolvedValue({id:'template-one',version:1,title:'Synthetic',service:'speech',centerId:null});
  const a={id:'activity-one',templateId:'template-one',completion:'NOT_STARTED'};
  await expect(service.save('center-one',actor,'session-1',saveDto({
    executionStatus:'COMPLETED',actualEnd:'2026-11-13T11:00:00Z',activities:[a]
  }) as any)).rejects.toMatchObject({status:422});
 });
 it('refuses a no-show containing performed minutes or completed activities',async()=>{
  const {service,tx}=make();
  tx.activityTemplate.findFirst.mockResolvedValue({id:'template-one',version:1,title:'Synthetic',service:'speech',centerId:null});
  const a={id:'activity-one',templateId:'template-one',completion:'SKIPPED',minutes:5};
  await expect(service.save('center-one',actor,'session-1',saveDto({attendance:'NO_SHOW',activities:[a]}) as any))
    .rejects.toMatchObject({status:422});
 });
 it('refuses a concurrent write whose CAS update affected no records',async()=>{
  const {service,tx}=make();
  tx.sessionNote.updateMany.mockResolvedValue({count:0});
  await expect(service.save('center-one',actor,'session-1',saveDto() as any)).rejects.toMatchObject({status:409});
 });
 it('persists an authorized in-progress session and exact-version audit only once',async()=>{
  const {service,tx}=make();
  const result=await service.save('center-one',actor,'session-1',saveDto() as any);
  expect(result).toMatchObject({version:2});
  expect(tx.sessionNote.updateMany.mock.calls[0][0].where).toMatchObject({
   id:'session-1',centerId:'center-one',membershipId:actor.membershipId,version:1,
   executionStatus:'IN_PROGRESS'
  });
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('clinical.session_saved');
 });
});
