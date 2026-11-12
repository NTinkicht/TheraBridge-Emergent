// M4-08 90% coverage floor: real source-executed schedule permissions,
// temporal boundaries and center-local family projections. All data fictional.
import {ScheduleService} from '../src/operations/schedule.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
import {AuditService} from '../src/audit/audit.service';
import {NoticesService} from '../src/operations/notices.service';
const center='fictional-center',childId='fictional-child',member='fictional-therapist';
const now=new Date('2026-11-11T12:00:00Z');
const start=new Date('2026-11-12T12:00:00Z'),end=new Date('2026-11-12T12:45:00Z');
const therapist={role:'THERAPIST',membershipId:member,userId:'fictional-user'} as any;
const admin={role:'CENTER_ADMIN',membershipId:'fictional-admin',userId:'fictional-admin-user'} as any;
const appointment=(extra:Record<string,unknown>={})=>({
 id:'fictional-appointment',centerId:center,childId,membershipId:member,
 service:'speech',status:'SCHEDULED',startsAt:start,endsAt:end,version:3,
 room:'Room S',statusReason:null,seriesId:null,isException:false,
 child:{id:childId,firstName:'Fictional',lastName:'Child',preferredName:null},
 notices:[],...extra
});
const make=()=>{
 const tx:any={
  centerEvent:{create:jest.fn().mockResolvedValue({id:'event'})},
  child:{findFirst:jest.fn().mockResolvedValue({id:childId,status:'ACTIVE'})},
  careAssignment:{findFirst:jest.fn().mockResolvedValue({id:'assigned'})},
  membership:{
   findFirst:jest.fn().mockResolvedValue({id:member,status:'ACTIVE'}),
   findMany:jest.fn().mockResolvedValue([{id:member,title:'Therapist',
     user:{displayName:'Fictional Therapist'}}]),
   count:jest.fn().mockResolvedValue(4)
  },
  appointment:{
   findFirst:jest.fn().mockResolvedValue(null),
   findMany:jest.fn().mockResolvedValue([]),
   create:jest.fn().mockResolvedValue(appointment()),
   update:jest.fn().mockResolvedValue({id:'fictional-appointment'}),
   count:jest.fn().mockResolvedValue(2)
  },
  center:{findUniqueOrThrow:jest.fn().mockResolvedValue({id:center,timezone:'Asia/Dubai',
    name:'Fictional center'})},
  guardianLink:{findMany:jest.fn().mockResolvedValue([]),updateMany:jest.fn().mockResolvedValue({count:1})},
  childCount:jest.fn(),
  invitation:{count:jest.fn().mockResolvedValue(0)}
 };
 tx.child.count=jest.fn().mockResolvedValue(2);
 const db:any={...tx,$transaction:jest.fn(async(fn:any)=>fn(tx))};
 const trial:any={now:()=>now,assertWritable:jest.fn().mockResolvedValue({}),
   status:jest.fn().mockResolvedValue({status:'ACTIVE'})};
 const audit:any={record:jest.fn().mockResolvedValue(undefined)};
 const notices:any={changed:jest.fn().mockResolvedValue(undefined)};
 const service=new ScheduleService(db as PrismaService,trial as TrialService,
   audit as AuditService,notices as NoticesService);
 return {service,tx,db,trial,audit,notices};
};
const booking=(extra:Record<string,unknown>={})=>({
 childId,membershipId:member,service:'speech',
 startsAt:start.toISOString(),endsAt:end.toISOString(),room:'Room S',...extra
}) as any;
const range=(extra:Record<string,unknown>={})=>({
 from:'2026-11-11T00:00:00Z',to:'2026-11-18T00:00:00Z',...extra
}) as any;
describe('M4-08 exact center scheduling and temporal checks',()=>{
 it.each([
  [{to:'2026-11-10T00:00:00Z'},'reversed'],
  [{to:'2027-01-01T00:00:00Z'},'overlong'],
  [{from:'2026-11-11T00:00:00Z',to:'2026-11-11T00:00:00Z'},'empty']
 ])('rejects %s range before database read (%s)',async (input,_label)=>{
  const {service,tx}=make();
  await expect(service.list(center,admin,range(input))).rejects.toMatchObject({status:422});
  expect(tx.appointment.findMany).not.toHaveBeenCalled();
 });
 it('therapist list cannot expand membership with supplied alternate membership',async()=>{
  const {service,tx}=make();
  await service.list(center,therapist,range({membershipId:'foreign-staff'}));
  expect(tx.appointment.findMany.mock.calls[0][0].where.membershipId).toBe(member);
 });
 it('manager list filters requested child and therapist within exact center',async()=>{
  const {service,tx}=make();
  await service.list(center,admin,range({membershipId:'staff-a',childId:'child-a'}));
  expect(tx.appointment.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,childId:'child-a',membershipId:'staff-a'
  });
 });
 it('manager listing without filters is center-scoped, not cross-center',async()=>{
  const {service,tx}=make();await service.list(center,admin,range());
  const w=tx.appointment.findMany.mock.calls[0][0].where;
  expect(w.centerId).toBe(center);expect(w).not.toHaveProperty('membershipId');
 });
 it('renders only exact attached reminder matching current start time',async()=>{
  const {service}=make();const a=appointment({notices:[
   {kind:'reminder_24h',startsAt:new Date(start.getTime()-3600000),sentAt:now},
   {kind:'reminder_24h',startsAt:start,sentAt:start}
  ]});
  const r=await service.view([a] as any);
  expect(r[0]).toMatchObject({reminderSentAt:start,therapist:'Fictional Therapist',
   child:'Fictional',childFull:'Fictional Child'});
 });
 it('missing therapist directory and reminder do not fabricate personnel/contact',async()=>{
  const {service,tx}=make();tx.membership.findMany.mockResolvedValueOnce([]);
  const r=await service.view([appointment({child:{firstName:'F',lastName:'C',preferredName:'Nickname'}})] as any);
  expect(r[0]).toMatchObject({child:'Nickname',therapist:'',reminderSentAt:null});
 });
 it('empty visit list is safe and still looks up only empty membership set',async()=>{
  const {service,tx}=make();expect(await service.view([])).toEqual([]);
  expect(tx.membership.findMany.mock.calls[0][0].where.id.in).toEqual([]);
 });
});
describe('M4-08 collision checks and therapist assignment fail closed',()=>{
 it('detects therapist conflict before checking the child, not both',async()=>{
  const {service,tx}=make();
  tx.appointment.findFirst.mockResolvedValueOnce({id:'collision'});
  await expect(service.clash(tx,booking())).resolves.toMatch(/therapist already/);
  expect(tx.appointment.findFirst).toHaveBeenCalledTimes(1);
 });
 it('detects child conflict when therapist is free',async()=>{
  const {service,tx}=make();
  tx.appointment.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({id:'collision'});
  expect(await service.clash(tx,booking())).toMatch(/child already/);
 });
 it('nonoverlapping appointment is available, without invented collision',async()=>{
  const {service,tx}=make();
  expect(await service.clash(tx,booking(),['fictional-appointment'])).toBeNull();
  expect(tx.appointment.findFirst.mock.calls[0][0].where.id.notIn).toEqual(['fictional-appointment']);
 });
 it('zero repeating slots do not access appointment storage',async()=>{
  const {service,tx}=make();
  expect(await service.clashesForSlots(tx,center,[])).toEqual([]);
  expect(tx.appointment.findMany).not.toHaveBeenCalled();
 });
 it('batch detects therapist, child, and free slots from the same bounded query',async()=>{
  const {service,tx}=make();
  tx.appointment.findMany.mockResolvedValueOnce([
   {membershipId:member,childId:'different',startsAt:start,endsAt:end},
   {membershipId:'other',childId:'child-b',startsAt:start,endsAt:end}
  ]);
  const slots=[booking(),booking({childId:'child-b',membershipId:'unrelated'}),
   booking({childId:'child-free',membershipId:'staff-free'})];
  const r=await service.clashesForSlots(tx,center,slots,['excluded']);
  expect(r).toEqual([
   'The therapist already has an appointment at this time.',
   'The child already has an appointment at this time.',null
  ]);
  expect(tx.appointment.findMany.mock.calls[0][0].where.id.notIn).toEqual(['excluded']);
 });
 it('boundary-touching visits are not treated as overlapping',async()=>{
  const {service,tx}=make();tx.appointment.findMany.mockResolvedValueOnce([
   {membershipId:member,childId,startsAt:new Date(start.getTime()-1800000),endsAt:start}
  ]);
  expect(await service.clashesForSlots(tx,center,[booking()])).toEqual([null]);
 });
 it('missing child denies assignment even when a therapist is in the directory',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce(null);
  await expect(service.assertAssigned(tx,center,childId,member,'speech')).rejects.toMatchObject({status:404});
  expect(tx.careAssignment.findFirst).not.toHaveBeenCalled();
 });
 it('missing active care assignment denies scheduling',async()=>{
  const {service,tx}=make();tx.careAssignment.findFirst.mockResolvedValueOnce(null);
  await expect(service.assertAssigned(tx,center,childId,member,'speech')).rejects.toMatchObject({status:422});
 });
 it('revoked therapist membership denies scheduling even with historical care assignment',async()=>{
  const {service,tx}=make();tx.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.assertAssigned(tx,center,childId,member,'speech')).rejects.toMatchObject({status:422});
 });
});
describe('M4-08 scheduling mutations never bypass trial, CAS or role checks',()=>{
 it.each([
  [booking({endsAt:start.toISOString()}),'end before start'],
  [booking({endsAt:new Date(start.getTime()+9*3600000).toISOString()}),'over eight hours'],
  [booking({startsAt:'2020-01-01T00:00:00Z',endsAt:'2020-01-01T01:00:00Z'}),'past']
 ])('invalid timing %s is denied without starting transaction (%s)',async input=>{
  const {service,db}=make();
  await expect(service.create(center,admin.userId,input)).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('creates a future visit inside center transaction and audits exact identity',async()=>{
  const {service,tx,trial,audit}=make();
  const result=await service.create(center,admin.userId,booking());
  expect(result).toEqual({id:'fictional-appointment'});
  expect(trial.assertWritable).toHaveBeenCalled();
  expect(tx.appointment.create.mock.calls[0][0].data).toMatchObject({
   centerId:center,childId,membershipId:member,service:'speech',room:'Room S'
  });
  expect(audit.record).toHaveBeenCalledTimes(1);
 });
 it('empty optional room is stored as null without inventing a location',async()=>{
  const {service,tx}=make();
  await service.create(center,admin.userId,booking({room:''}));
  expect(tx.appointment.create.mock.calls[0][0].data.room).toBeNull();
 });
 it('appointment collision rejects transaction and never produces audit success',async()=>{
  const {service,tx,audit}=make();
  tx.appointment.findFirst.mockResolvedValueOnce({id:'conflicting'});
  await expect(service.create(center,admin.userId,booking())).rejects.toMatchObject({status:409});
  expect(tx.appointment.create).not.toHaveBeenCalled();
  expect(audit.record).not.toHaveBeenCalled();
 });
 it('missing appointment refuses reschedule before selecting a new therapist',async()=>{
  const {service,tx}=make();
  await expect(service.reschedule(center,admin.userId,'not-found',{version:3} as any))
   .rejects.toMatchObject({status:404});
  expect(tx.appointment.update).not.toHaveBeenCalled();
 });
 it.each([
  [appointment({status:'COMPLETED'}),'not scheduled',409],
  [appointment({startsAt:new Date('2020-01-01T00:00:00Z')}),'already started',422],
  [appointment({version:2}),'stale version',409]
 ])('refuses %s reschedule (%s)',async record=>{
  const {service,tx}=make();tx.appointment.findFirst.mockResolvedValueOnce(record);
  await expect(service.reschedule(center,admin.userId,'fictional-appointment',{version:3} as any))
   .rejects.toBeDefined();
  expect(tx.appointment.update).not.toHaveBeenCalled();
 });
 it('reschedules exact appointment with unchanged service, CAS and notice',async()=>{
  const {service,tx,notices}=make();tx.appointment.findFirst.mockResolvedValueOnce(appointment({seriesId:'repeat-a'}));
  await service.reschedule(center,admin.userId,'fictional-appointment',{
   version:3,startsAt:'2026-11-13T12:00:00Z',endsAt:'2026-11-13T13:00:00Z',room:''
  } as any);
  expect(tx.appointment.update.mock.calls[0][0].data).toMatchObject({
   membershipId:member,isException:true,room:null,version:{increment:1}
  });
  expect(notices.changed).toHaveBeenCalledWith([{id:'fictional-appointment',before:start}],'rescheduled');
 });
 it('reschedule without room preserves previous recorded room',async()=>{
  const {service,tx}=make();tx.appointment.findFirst.mockResolvedValueOnce(appointment());
  await service.reschedule(center,admin.userId,'fictional-appointment',{version:3} as any);
  expect(tx.appointment.update.mock.calls[0][0].data).not.toHaveProperty('room');
 });
 it('non-completed attendance change needs a recorded reason',async()=>{
  const {service,db}=make();
  await expect(service.setStatus(center,admin,'fictional-appointment',{
   status:'CANCELLED',reason:''} as any)).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('missing visit cannot be completed or cancelled',async()=>{
  const {service,tx}=make();
  await expect(service.setStatus(center,admin,'fictional-appointment',{status:'COMPLETED'} as any))
   .rejects.toMatchObject({status:404});
 });
 it('therapist cannot cancel an appointment even if assigned',async()=>{
  const {service,tx}=make();tx.appointment.findFirst.mockResolvedValueOnce(appointment());
  await expect(service.setStatus(center,therapist,'fictional-appointment',{
   status:'CANCELLED',reason:'Fictional correction'} as any)).rejects.toMatchObject({status:403});
  expect(tx.appointment.update).not.toHaveBeenCalled();
 });
 it('therapist cannot change attendance of a different member',async()=>{
  const {service,tx}=make();tx.appointment.findFirst.mockResolvedValueOnce(appointment({membershipId:'another-member'}));
  await expect(service.setStatus(center,therapist,'fictional-appointment',{
   status:'COMPLETED'} as any)).rejects.toMatchObject({status:403});
 });
 it('already closed appointment cannot be completed twice',async()=>{
  const {service,tx}=make();tx.appointment.findFirst.mockResolvedValueOnce(appointment({status:'COMPLETED'}));
  await expect(service.setStatus(center,admin,'fictional-appointment',{
   status:'COMPLETED'} as any)).rejects.toMatchObject({status:409});
 });
 it('future attendance is denied, but cancellation remains administratively possible',async()=>{
  const {service,tx,notices}=make();tx.appointment.findFirst.mockResolvedValue(appointment());
  await expect(service.setStatus(center,admin,'fictional-appointment',{status:'NO_SHOW',reason:'Fictional'} as any))
   .rejects.toMatchObject({status:422});
  await service.setStatus(center,admin,'fictional-appointment',{status:'CANCELLED',reason:'Fictional'} as any);
  expect(tx.appointment.update).toHaveBeenCalledTimes(1);
  expect(notices.changed).toHaveBeenCalledWith([{id:'fictional-appointment'}],'cancelled');
 });
 it('series cancellation explicitly marks an exception, unlike individual cancellation',async()=>{
  const {service,tx}=make();tx.appointment.findFirst.mockResolvedValue(appointment({seriesId:'fictional-series'}));
  await service.setStatus(center,admin,'fictional-appointment',{status:'CANCELLED',reason:'Fictional'} as any);
  expect(tx.appointment.update.mock.calls[0][0].data.isException).toBe(true);
 });
 it('therapist may mark own started visit completed, with no cancellation notification',async()=>{
  const {service,tx,notices}=make();tx.appointment.findFirst.mockResolvedValueOnce(
   appointment({startsAt:new Date('2026-11-10T10:00:00Z'),endsAt:new Date('2026-11-10T11:00:00Z')}));
  await service.setStatus(center,therapist,'fictional-appointment',{status:'COMPLETED'} as any);
  expect(tx.appointment.update.mock.calls[0][0].data).toMatchObject({
   status:'COMPLETED',statusReason:null
  });
  expect(notices.changed).not.toHaveBeenCalled();
 });
});
describe('M4-08 family projection and reminder privacy boundaries',()=>{
 it('empty guardian link produces no family identities or care-team membership',async()=>{
  const {service,tx}=make();
  const r=await service.family(center,{...therapist,role:'GUARDIAN'} as any);
  expect(r.children).toEqual([]);
  expect(tx.membership.findMany.mock.calls[0][0].where.id.in).toEqual([]);
 });
 it('guardian projection hides cancelled rooms and does not claim historical visit is active',async()=>{
  const {service,tx}=make();const past=new Date('2026-11-10T12:00:00Z'),future=start;
  tx.guardianLink.findMany.mockResolvedValueOnce([{
   id:'fictional-link',relationship:'parent',remindersEnabled:true,
   child:{...appointment().child,id:childId,assignments:[{membershipId:member,service:'speech',isLead:true}],
    appointments:[
     appointment({startsAt:past,endsAt:new Date('2026-11-10T12:45:00Z'),status:'COMPLETED'}),
     appointment({id:'cancelled-future',startsAt:future,status:'CANCELLED',room:'Sensitive room'})
    ]}
  }]);
  const r=await service.family(center,{...therapist,role:'GUARDIAN'} as any);
  expect(r.children).toHaveLength(1);
  expect(r.children[0].history).toHaveLength(1);
  expect(r.children[0].upcoming[0].room).toBeNull();
  expect(r.children[0].attendance.attended).toBe(1);
 });
 it('guardian only changes reminder preference for own active link',async()=>{
  const {service,tx}=make();
  const r=await service.setPreference(center,{...therapist,role:'GUARDIAN'} as any,
   {childId,reminders:false} as any);
  expect(r).toEqual({childId,remindersEnabled:false});
  expect(tx.guardianLink.updateMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,childId,userId:therapist.userId,removedAt:null
  });
 });
 it('revoked guardian cannot modify reminders and emits no audit event',async()=>{
  const {service,tx}=make();tx.guardianLink.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.setPreference(center,{...therapist,role:'GUARDIAN'} as any,
   {childId,reminders:true} as any)).rejects.toMatchObject({status:404});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
});
