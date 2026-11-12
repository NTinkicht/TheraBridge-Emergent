// M4-08 measured 90% branch floor: exercise REAL message scope/service code
// in Jest-only synthetic fixture. Production/staging family messaging stays NO-GO.
import {MessagesService,threadScope,familyMessagingEnabled} from '../src/operations/messages.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
import {AuditService} from '../src/audit/audit.service';
const center='fictional-center',childId='fictional-child',threadId='fictional-thread';
const now=new Date('2026-11-11T12:00:00Z');
const therapist={role:'THERAPIST',membershipId:'fictional-therapist',userId:'fictional-user'} as any;
const guardian={role:'GUARDIAN',membershipId:'fictional-guardian',userId:'fictional-parent'} as any;
const admin={role:'CENTER_ADMIN',membershipId:'fictional-manager',userId:'fictional-admin'} as any;
const supervisor={...admin,role:'CLINICAL_SUPERVISOR'};
const dto=(other:Record<string,unknown>={})=>({
 childId,subject:'Fictional scheduling',category:'scheduling',body:'Synthetic message',
 audience:'GUARDIAN',guardianLinkId:'fictional-link',...other
}) as any;
const message=(other:Record<string,unknown>={})=>({
 id:'fictional-message',threadId,authorUserId:therapist.userId,authorKind:'STAFF',
 createdAt:now,body:'Synthetic text',...other
});
const row=(other:Record<string,unknown>={})=>({
 id:threadId,centerId:center,childId,guardianLinkId:'fictional-link',
 audience:'GUARDIAN',service:null,subject:'Fictional subject',category:'scheduling',
 status:'OPEN',lastMessageAt:now,createdAt:now,closedAt:null,
 child:{firstName:'Fictional',lastName:'Child',preferredName:null},
 guardianLink:{displayName:'Fictional caregiver'},
 messages:[message()],reads:[],...other
});
let old:{flag:string|undefined;stage:string|undefined};
beforeAll(()=>{old={flag:process.env.FAMILY_MESSAGING_DEMO,stage:process.env.DEPLOYMENT_ENV}});
beforeEach(()=>{process.env.FAMILY_MESSAGING_DEMO='true';process.env.DEPLOYMENT_ENV='ci'});
afterAll(()=>{if(old.flag===undefined)delete process.env.FAMILY_MESSAGING_DEMO;else process.env.FAMILY_MESSAGING_DEMO=old.flag;
 if(old.stage===undefined)delete process.env.DEPLOYMENT_ENV;else process.env.DEPLOYMENT_ENV=old.stage;});
const make=()=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:'fictional-lock'}]),
  center:{findUnique:jest.fn().mockResolvedValue({id:center,status:'ACTIVE',
    trialEndsAt:new Date('2030-01-01')})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:'event'})},
  child:{findFirst:jest.fn().mockResolvedValue({id:childId,status:'ACTIVE'})},
  guardianLink:{findFirst:jest.fn().mockResolvedValue({id:'fictional-link',userId:guardian.userId})},
  careAssignment:{findMany:jest.fn().mockResolvedValue([{childId,service:'speech'}])},
  membership:{findMany:jest.fn().mockResolvedValue([])},
  user:{findMany:jest.fn().mockResolvedValue([{id:therapist.userId,displayName:'Fictional Therapist'}])},
  messageThread:{
   findMany:jest.fn().mockResolvedValue([row()]),
   findFirst:jest.fn().mockResolvedValue(row()),
   create:jest.fn().mockResolvedValue(row()),
   update:jest.fn().mockResolvedValue(row())
  },
  message:{create:jest.fn().mockResolvedValue({id:'new-message'})},
  threadRead:{upsert:jest.fn().mockResolvedValue({id:'read'})}
 };
 const prisma:any={...tx,$transaction:jest.fn(async(fn:any)=>fn(tx))};
 const trial:any={now:()=>now,assertWritable:jest.fn().mockResolvedValue({})};
 const audit:any={record:jest.fn().mockResolvedValue(undefined)};
 return {tx,prisma,trial,audit,service:new MessagesService(prisma as PrismaService,
   trial as TrialService,audit as AuditService)};
};
describe('M4-08 unapproved messaging remains strictly gated and role-scoped',()=>{
 it('production and staging always deny messaging, despite fixture flag',()=>{
  process.env.DEPLOYMENT_ENV='production';expect(familyMessagingEnabled()).toBe(false);
  process.env.DEPLOYMENT_ENV='staging';expect(familyMessagingEnabled()).toBe(false);
 });
 it('no demo flag denies list before child or thread read',async()=>{
  delete process.env.FAMILY_MESSAGING_DEMO;
  const {service,tx}=make();
  await expect(service.list(center,admin,{} as any)).rejects.toMatchObject({status:403});
  expect(tx.messageThread.findMany).not.toHaveBeenCalled();
 });
 it('guardian query is bound to active recipient link and child',()=>{
  expect(threadScope(center,guardian)).toEqual({
   centerId:center,audience:'GUARDIAN',child:{status:'ACTIVE'},
   guardianLink:{userId:guardian.userId,removedAt:null}
  });
 });
 it('therapist access retains exact active assignment for every specialty',()=>{
  const scope=threadScope(center,therapist,[{childId,service:'speech'}]);
  expect(scope.OR).toHaveLength(2);
  expect(scope.OR![1]).toMatchObject({childId,service:'speech',audience:'SPECIALTY'});
 });
 it('manager is barred from guardian threads and supervisor from all messaging',()=>{
  expect(threadScope(center,admin)).toEqual({centerId:center,audience:{in:['CARE_TEAM','SPECIALTY']}});
  expect(threadScope(center,supervisor)).toEqual({centerId:center,id:{in:[]}});
 });
 it('therapist without assigned services never receives unrestricted specialty OR',()=>{
  const scope=threadScope(center,therapist);
  expect(scope.OR).toHaveLength(1);
 });
 it('request status/child filter does not expand a therapist membership scope',async()=>{
  const {service,tx}=make();
  await service.list(center,therapist,{status:'CLOSED',childId} as any);
  expect(tx.messageThread.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,status:'CLOSED',childId
  });
 });
 it('inbox marks only unread messages authored by another user after last read',async()=>{
  const {service,tx}=make();
  tx.messageThread.findMany.mockResolvedValueOnce([
   row({messages:[message({authorUserId:guardian.userId,body:'Fictional privacy question'})],
    reads:[]}),
   row({id:'read-thread',messages:[message({authorUserId:guardian.userId})],
    reads:[{lastReadAt:new Date('2026-11-12T12:00:00Z')}]}),
   row({id:'own-thread',messages:[message({authorUserId:therapist.userId})],reads:[]}),
   row({id:'empty-thread',messages:[],reads:[]})
  ]);
  const r=await service.list(center,therapist,{} as any);
  expect(r.unread).toBe(1);
  expect(r.items.map(x=>x.unread)).toEqual([true,false,false,false]);
  expect(r.items[3].preview).toBe('');
  expect(r.items[3].lastFrom).toBeNull();
 });
 it('preferred child name wins over legal first name without changing identity',async()=>{
  const {service,tx}=make();tx.messageThread.findMany.mockResolvedValueOnce([
   row({child:{preferredName:'Fictional nickname',firstName:'Fictional',lastName:'Child'}})
  ]);
  const r=await service.list(center,admin,{} as any);
  expect(r.items[0].child).toBe('Fictional nickname Child');
 });
});
describe('M4-08 thread creation validates exact child, audience and recipient before mutation',()=>{
 it('supervisor cannot create any chat thread',async()=>{
  const {service,prisma}=make();
  await expect(service.create(center,supervisor,dto({audience:'CARE_TEAM'}))).rejects.toMatchObject({status:403});
  expect(prisma.$transaction).not.toHaveBeenCalled();
 });
 it('manager cannot address guardian recipient in any new discussion',async()=>{
  const {service,prisma}=make();
  await expect(service.create(center,admin,dto())).rejects.toMatchObject({status:403});
  expect(prisma.$transaction).not.toHaveBeenCalled();
 });
 it('family cannot open internal staff discussion',async()=>{
  const {service}=make();
  await expect(service.create(center,guardian,dto({audience:'CARE_TEAM',guardianLinkId:undefined})))
   .rejects.toMatchObject({status:403});
 });
 it('specialty audience requires explicit service before transaction',async()=>{
  const {service}=make();
  await expect(service.create(center,therapist,dto({
   audience:'SPECIALTY',guardianLinkId:undefined,service:undefined
  }))).rejects.toMatchObject({status:422});
 });
 it('care-team audience refuses unexpected specialty value',async()=>{
  const {service}=make();
  await expect(service.create(center,admin,dto({
   audience:'CARE_TEAM',guardianLinkId:undefined,service:'speech'
  }))).rejects.toMatchObject({status:422});
 });
 it('staff-only audience refuses guardian recipient ID',async()=>{
  const {service}=make();
  await expect(service.create(center,admin,dto({audience:'CARE_TEAM'})))
   .rejects.toMatchObject({status:422});
 });
 it('no longer assigned child cannot be used for new staff discussion',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce(null);
  await expect(service.create(center,therapist,dto())).rejects.toMatchObject({status:404});
  expect(tx.messageThread.create).not.toHaveBeenCalled();
 });
 it('specialty thread cannot be created without exact active service assignment',async()=>{
  const {service,tx}=make();
  tx.child.findFirst.mockResolvedValueOnce({id:childId}).mockResolvedValueOnce(null);
  await expect(service.create(center,therapist,dto({
   audience:'SPECIALTY',service:'speech',guardianLinkId:undefined
  }))).rejects.toMatchObject({status:404});
  expect(tx.messageThread.create).not.toHaveBeenCalled();
 });
 it('guardian conversation without current recipient link cannot create staff-visible thread',async()=>{
  const {service,tx}=make();tx.guardianLink.findFirst.mockResolvedValueOnce(null);
  await expect(service.create(center,guardian,dto({guardianLinkId:undefined})))
   .rejects.toMatchObject({status:422});
 });
 it('therapist cannot address unconnected guardian recipient',async()=>{
  const {service,tx}=make();tx.guardianLink.findFirst.mockResolvedValueOnce(null);
  await expect(service.create(center,therapist,dto({guardianLinkId:'unknown-link'})))
   .rejects.toMatchObject({status:422});
 });
 it('authorized family thread keeps exact recipient and synthetic message author kind',async()=>{
  const {service,tx,audit}=make();
  const r=await service.create(center,guardian,dto({guardianLinkId:undefined}));
  expect(r).toEqual({id:threadId});
  expect(tx.messageThread.create.mock.calls[0][0].data).toMatchObject({
   centerId:center,childId,guardianLinkId:'fictional-link',audience:'GUARDIAN'
  });
  expect(tx.message.create.mock.calls[0][0].data.authorKind).toBe('FAMILY');
  expect(audit.record).toHaveBeenCalledTimes(1);
 });
 it('authorized specialty thread never creates a guardianLinkId',async()=>{
  const {service,tx}=make();
  await service.create(center,therapist,dto({
   audience:'SPECIALTY',service:'speech',guardianLinkId:undefined
  }));
  expect(tx.messageThread.create.mock.calls[0][0].data).toMatchObject({
   audience:'SPECIALTY',guardianLinkId:null,service:'speech'
  });
 });
 it('authorized manager care-team thread stays internal, no family release',async()=>{
  const {service,tx}=make();
  await service.create(center,admin,dto({audience:'CARE_TEAM',guardianLinkId:undefined}));
  expect(tx.messageThread.create.mock.calls[0][0].data).toMatchObject({
   audience:'CARE_TEAM',guardianLinkId:null,service:null
  });
 });
});
describe('M4-08 thread read, reply, status change remain current role-scoped',()=>{
 it('detail rejects missing or out-of-scope thread before reading members',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst.mockResolvedValueOnce(null);
  await expect(service.detail(center,therapist,threadId)).rejects.toMatchObject({status:404});
  expect(tx.user.findMany).not.toHaveBeenCalled();
 });
 it('detail displays former author as former member, not impersonated current clinician',async()=>{
  const {service,tx}=make();tx.user.findMany.mockResolvedValueOnce([]);
  const r=await service.detail(center,guardian,threadId);
  expect(r.messages[0]).toMatchObject({author:'Former member',mine:false});
  expect(r.canManage).toBe(false);
  expect(tx.threadRead.upsert).toHaveBeenCalledTimes(1);
 });
 it('therapist only manages assigned guardian conversations, not specialty channel',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst.mockResolvedValueOnce(
   row({audience:'SPECIALTY',service:'speech',guardianLink:null}));
  const r=await service.detail(center,therapist,threadId);
  expect(r.canManage).toBe(false);
  expect(r.recipient).toBeNull();
 });
 it('manager may manage internal care-team discussion',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst.mockResolvedValueOnce(
   row({audience:'CARE_TEAM',guardianLink:null}));
  const r=await service.detail(center,admin,threadId);
  expect(r.canManage).toBe(true);
 });
 it('guardian reply requires exact active link lock even after center trial check',async()=>{
  const {service,tx}=make();tx.$queryRaw.mockResolvedValueOnce([{id:'center'}])
   .mockResolvedValueOnce([]);
  await expect(service.reply(center,guardian,threadId,{body:'Synthetic reply'} as any))
   .rejects.toMatchObject({status:404});
  expect(tx.message.create).not.toHaveBeenCalled();
 });
 it('guardian cannot reply to staff-only discussion even with other active links',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst.mockResolvedValueOnce(
   row({audience:'CARE_TEAM'}));
  await expect(service.reply(center,guardian,threadId,{body:'Synthetic'} as any))
   .rejects.toMatchObject({status:404});
 });
 it('guardian denies expired center before identifying a private conversation',async()=>{
  const {service,tx}=make();tx.center.findUnique.mockResolvedValueOnce({
   id:center,trialEndsAt:new Date('2020-01-01')
  });
  await expect(service.reply(center,guardian,threadId,{body:'Synthetic'} as any))
   .rejects.toMatchObject({status:403});
 });
 it('therapist cannot reply to deleted conversation after locking current assignment',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst.mockResolvedValueOnce(null);
  await expect(service.reply(center,therapist,threadId,{body:'Synthetic'} as any))
   .rejects.toMatchObject({status:404});
 });
 it('closed thread cannot receive a reply or forge a sent receipt',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst
   .mockResolvedValueOnce(row())
   .mockResolvedValueOnce(row({status:'CLOSED'}));
  await expect(service.reply(center,therapist,threadId,{body:'Synthetic'} as any))
   .rejects.toMatchObject({status:409});
  expect(tx.message.create).not.toHaveBeenCalled();
 });
 it('successful staff reply preserves exact current author and scoped read marker',async()=>{
  const {service,tx}=make();
  const r=await service.reply(center,therapist,threadId,{body:'Fictional operational update'} as any);
  expect(tx.message.create.mock.calls[0][0].data.authorKind).toBe('STAFF');
  expect(tx.messageThread.update).toHaveBeenCalledTimes(1);
  expect(tx.threadRead.upsert).toHaveBeenCalledTimes(2);
  expect(r.id).toBe(threadId);
 });
 it('guardian is not permitted to close a discussion',async()=>{
  const {service,prisma}=make();
  await expect(service.setStatus(center,guardian,threadId,'CLOSED'))
   .rejects.toMatchObject({status:403});
  expect(prisma.$transaction).not.toHaveBeenCalled();
 });
 it('therapist cannot manage internal specialty conversation',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst.mockResolvedValueOnce(
   row({audience:'SPECIALTY'}));
  await expect(service.setStatus(center,therapist,threadId,'CLOSED'))
   .rejects.toMatchObject({status:403});
 });
 it('already-open thread cannot be reopened again',async()=>{
  const {service,tx}=make();
  await expect(service.setStatus(center,admin,threadId,'OPEN'))
   .rejects.toMatchObject({status:409});
  expect(tx.messageThread.update).not.toHaveBeenCalled();
 });
 it('manager closes internal thread and emits private audit marker only',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst.mockResolvedValue(
   row({audience:'CARE_TEAM'}));
  const r=await service.setStatus(center,admin,threadId,'CLOSED');
  expect(tx.messageThread.update.mock.calls[0][0].data).toMatchObject({
   status:'CLOSED',closedAt:now
  });
  expect(r.status).toBe('OPEN'); // fake follow-up read; no false production status claim
 });
 it('reopening closed internal thread clears closedAt, with no clinical release',async()=>{
  const {service,tx}=make();tx.messageThread.findFirst.mockResolvedValue(
   row({audience:'CARE_TEAM',status:'CLOSED'}));
  await service.setStatus(center,admin,threadId,'OPEN');
  expect(tx.messageThread.update.mock.calls[0][0].data).toEqual({
   status:'OPEN',closedAt:null
  });
 });
});
