// M4-08 minimum 90%: exercise real ChildrenService writes, CAS, archived
// safeguarding, guardian consent invitations and explicit referent lifecycle.
// Synthetic transactions only, no real child, guardian or invitation sent.
import {ChildrenService} from '../src/operations/children.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
import {InvitationsService} from '../src/centers/invitations.service';
import {AuditService} from '../src/audit/audit.service';
import {NoticesService} from '../src/operations/notices.service';
const center='fictional-center',childId='fictional-child',userId='fictional-operator';
const centerId=center;
const now=new Date('2026-11-11T09:00:00.000Z');
const admin={role:'CENTER_ADMIN',membershipId:'fictional-admin',userId} as any;
const therapist={...admin,role:'THERAPIST'};
const child=(extra:Record<string,unknown>={})=>({
 id:childId,centerId:center,firstName:'Fictional',lastName:'Alex',
 dateOfBirth:new Date('2020-01-01T00:00:00Z'),services:['speech'],
 status:'ACTIVE',version:2,referentRevision:0,referentMembershipId:null,
 guardians:[],assignments:[],appointments:[],...extra
});
const guardianDto={displayName:'  Fictional Guardian  ',email:'guardian@fictional.test',
 relationship:'parent',isPrimary:false,invite:false} as any;
const assignmentDto={membershipId:'fictional-therapist',service:'speech',isLead:false} as any;
const make=()=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:childId}]),
  membership:{
   findFirst:jest.fn().mockResolvedValue({id:'fictional-therapist',userId:'fictional-user',
    specialties:['speech'],roles:[],user:{status:'ACTIVE'}}),
   findMany:jest.fn().mockResolvedValue([])
  },
  child:{
   findFirst:jest.fn().mockResolvedValue(child()),
   findMany:jest.fn().mockResolvedValue([]),
   create:jest.fn(async({data}:any)=>({id:childId,...data})),
   updateMany:jest.fn().mockResolvedValue({count:1}),
   update:jest.fn().mockResolvedValue(child())
  },
  childReferentHistory:{create:jest.fn().mockResolvedValue({id:'fictional-change'})},
  guardianLink:{
   create:jest.fn(async({data}:any)=>({id:'fictional-link',userId:null,...data})),
   updateMany:jest.fn().mockResolvedValue({count:1}),
   findFirst:jest.fn().mockResolvedValue({id:'fictional-link',childId,centerId,userId:null,
    email:'guardian@fictional.test',displayName:'Fictional Guardian'})
  },
  careAssignment:{
   findFirst:jest.fn().mockResolvedValue({id:'fictional-care'}),
   create:jest.fn().mockResolvedValue({id:'fictional-care'}),
   updateMany:jest.fn().mockResolvedValue({count:1})
  },
  invitation:{
   findFirst:jest.fn().mockResolvedValue(null),
   updateMany:jest.fn().mockResolvedValue({count:1})
  },
  appointment:{
   findMany:jest.fn().mockResolvedValue([]),
   updateMany:jest.fn().mockResolvedValue({count:1})
  },
  appointmentSeries:{updateMany:jest.fn().mockResolvedValue({count:1})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:'fictional-event'})}
 };
 const prisma:any={...tx,$transaction:jest.fn(async(fn:any)=>fn(tx))};
 const trial:any={now:()=>now,assertWritable:jest.fn().mockResolvedValue({name:'Fictional centre'}),
  assertChildCapacity:jest.fn().mockResolvedValue(undefined)};
 const invitations:any={
  createInTx:jest.fn().mockResolvedValue({invitation:{id:'fictional-invite',
    status:'PENDING',expiresAt:new Date('2026-12-01'),email:'guardian@fictional.test',
    roles:['GUARDIAN'],kind:'GUARDIAN'},token:'fictional-token'}),
  resend:jest.fn().mockResolvedValue({id:'resent'}),
  deliver:jest.fn()
 };
 const audit:any={record:jest.fn().mockResolvedValue(undefined)};
 const notices:any={changed:jest.fn().mockResolvedValue(undefined)};
 const service=new ChildrenService(prisma as PrismaService,trial as TrialService,
  invitations as InvitationsService,audit as AuditService,notices as NoticesService);
 return {tx,prisma,trial,invitations,audit,notices,service};
};
describe('M4-08 authorized child edits and archiving never bypass concurrency',()=>{
 it('registers synthetic child with trimmed names, unique specialties and auditable actor',async()=>{
  const {service,tx,audit,trial}=make();
  const r=await service.create(center,userId,{firstName:'  Fictional   ',lastName:'  Alex ',
   preferredName:'  AleX  ',dateOfBirth:'2020-01-01',services:['speech','speech']} as any);
  expect(r.id).toBe(childId);
  expect(tx.child.create.mock.calls[0][0].data).toMatchObject({
   centerId:center,firstName:'Fictional',lastName:'Alex',preferredName:'AleX',
   services:['speech'],createdById:userId
  });
  expect(trial.assertChildCapacity).toHaveBeenCalled();
  expect(audit.record).toHaveBeenCalledTimes(1);
 });
 it('missing preferred name remains null, not fabricated',async()=>{
  const {service,tx}=make();
  await service.create(center,userId,{firstName:'Alex',lastName:'Fictional',
   dateOfBirth:'2020-01-01',services:['speech']} as any);
  expect(tx.child.create.mock.calls[0][0].data.preferredName).toBeNull();
 });
 it('future DOB update fails before opening a write transaction',async()=>{
  const {service,prisma}=make();
  await expect(service.update(center,userId,childId,{version:2,dateOfBirth:'2999-01-01'} as any))
   .rejects.toMatchObject({status:422});
  expect(prisma.$transaction).not.toHaveBeenCalled();
 });
 it('updates exact child version and only provided fields with trimmed optional preferred name',async()=>{
  const {service,tx,trial}=make();
  await service.update(center,userId,childId,{
   version:2,firstName:'  Fictional A  ',preferredName:'',services:['speech','speech','occupational']
  } as any);
  expect(tx.child.updateMany).toHaveBeenCalledWith({where:{id:childId,centerId:center,version:2},
   data:expect.objectContaining({firstName:'Fictional A',preferredName:null,
    services:['speech','occupational'],version:{increment:1}})});
  expect(trial.assertWritable).toHaveBeenCalled();
 });
 it('stale update returns not found when child vanished, without audit event',async()=>{
  const {service,tx}=make();
  tx.child.updateMany.mockResolvedValueOnce({count:0});
  tx.child.findFirst.mockResolvedValueOnce(null);
  await expect(service.update(center,userId,childId,{version:2} as any)).rejects.toMatchObject({status:404});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('stale update returns optimistic conflict when child still exists',async()=>{
  const {service,tx}=make();tx.child.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.update(center,userId,childId,{version:2} as any)).rejects.toMatchObject({status:409});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('rejects archive of already archived record, preserving existing side effects',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce(child({status:'ARCHIVED'}));
  await expect(service.setStatus(center,userId,childId,'ARCHIVED')).rejects.toMatchObject({status:409});
  expect(tx.appointment.updateMany).not.toHaveBeenCalled();
 });
 it('rejects redundant restoration and does not create extra capacity',async()=>{
  const {service,tx}=make();
  await expect(service.setStatus(center,userId,childId,'ACTIVE')).rejects.toMatchObject({status:409});
  expect(tx.child.update).not.toHaveBeenCalled();
 });
 it('archive cancels future visits, ends series and assignments, and emits notice',async()=>{
  const {service,tx,notices}=make();
  tx.appointment.findMany.mockResolvedValueOnce([{id:'fictional-appt',startsAt:now}]);
  await service.setStatus(center,userId,childId,'ARCHIVED','Fictional archive');
  expect(tx.appointment.updateMany).toHaveBeenCalled();
  expect(tx.appointmentSeries.updateMany).toHaveBeenCalled();
  expect(tx.careAssignment.updateMany).toHaveBeenCalled();
  expect(notices.changed).toHaveBeenCalledWith([
   {id:'fictional-appt',before:now}
  ],'cancelled');
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('child.archived');
 });
 it('archiving child clears child-wide referent in same locked transaction',async()=>{
  const {service,tx}=make();
  tx.child.findFirst.mockResolvedValueOnce(child({referentMembershipId:'fictional-therapist',referentRevision:3}));
  await service.setStatus(center,userId,childId,'ARCHIVED');
  expect(tx.child.update).toHaveBeenCalledTimes(2);
  expect(tx.childReferentHistory.create.mock.calls[0][0].data).toMatchObject({
   previousMembershipId:'fictional-therapist',nextMembershipId:null,revision:4
  });
 });
 it('restores archived child without cancelling future unrelated appointments',async()=>{
  const {service,tx,notices}=make();
  tx.child.findFirst.mockResolvedValueOnce(child({status:'ARCHIVED'}));
  await service.setStatus(center,userId,childId,'ACTIVE');
  expect(tx.appointment.updateMany).not.toHaveBeenCalled();
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('child.restored');
  expect(notices.changed).toHaveBeenCalledWith([],'cancelled');
 });
});
describe('M4-08 child-wide referent requires explicit live admin and assigned therapist',()=>{
 const dto={membershipId:'fictional-therapist',version:2,reason:'Fictional care coordination'} as any;
 it('undefined selection cannot masquerade as clearing a clinician designation',async()=>{
  const {service,prisma}=make();
  await expect(service.setReferent(center,admin,childId,{version:2,reason:'Fictional'} as any))
   .rejects.toMatchObject({status:422});
  expect(prisma.$transaction).not.toHaveBeenCalled();
 });
 it('therapist cannot select child-wide referent, even if assigned to one specialty',async()=>{
  const {service,tx}=make();
  await expect(service.setReferent(center,therapist,childId,dto)).rejects.toMatchObject({status:403});
  expect(tx.child.updateMany).not.toHaveBeenCalled();
 });
 it('missing or foreign child cannot be assigned a referent',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce(null);
  await expect(service.setReferent(center,admin,childId,dto)).rejects.toMatchObject({status:404});
 });
 it('stale optimistic child version cannot update referent',async()=>{
  const {service,tx}=make();
  await expect(service.setReferent(center,admin,childId,{...dto,version:1})).rejects.toMatchObject({status:409});
  expect(tx.childReferentHistory.create).not.toHaveBeenCalled();
 });
 it('same referent cannot be designated twice, preventing spurious history',async()=>{
  const {service,tx}=make();
  tx.child.findFirst.mockResolvedValueOnce(child({referentMembershipId:dto.membershipId}));
  await expect(service.setReferent(center,admin,childId,dto)).rejects.toMatchObject({status:409});
 });
 it('inactive therapist membership or missing assignment denies new referent',async()=>{
  const {service,tx}=make();tx.membership.findFirst
   .mockResolvedValueOnce({id:'admin-member'}).mockResolvedValueOnce(null);
  await expect(service.setReferent(center,admin,childId,dto)).rejects.toMatchObject({status:422});
  const next=make();next.tx.careAssignment.findFirst.mockResolvedValueOnce(null);
  await expect(next.service.setReferent(center,admin,childId,dto)).rejects.toMatchObject({status:422});
 });
 it('valid referent is saved only with exact child version and history receipt',async()=>{
  const {service,tx}=make();
  const r=await service.setReferent(center,admin,childId,dto);
  expect(r).toEqual({referentMembershipId:dto.membershipId,referentRevision:1,version:3});
  expect(tx.child.updateMany).toHaveBeenCalledWith({
   where:{id:childId,centerId:center,version:2},
   data:{referentMembershipId:dto.membershipId,referentRevision:{increment:1},version:{increment:1}}
  });
  expect(tx.childReferentHistory.create.mock.calls[0][0].data).toMatchObject({
   previousMembershipId:null,nextMembershipId:dto.membershipId,revision:1,actorUserId:userId
  });
 });
 it('explicit null clears old designation without querying an unrelated therapist',async()=>{
  const {service,tx}=make();
  tx.child.findFirst.mockResolvedValueOnce(child({referentMembershipId:'old-member',referentRevision:2}));
  const r=await service.setReferent(center,admin,childId,{...dto,membershipId:null});
  expect(r.referentMembershipId).toBeNull();
  expect(r.referentRevision).toBe(3);
  expect(tx.careAssignment.findFirst).not.toHaveBeenCalled();
 });
 it('referent compare-and-swap failure never writes historical endorsement',async()=>{
  const {service,tx}=make();tx.child.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.setReferent(center,admin,childId,dto)).rejects.toMatchObject({status:409});
  expect(tx.childReferentHistory.create).not.toHaveBeenCalled();
 });
});
describe('M4-08 guardian/assignment administration validates tenant without activating clinical gates',()=>{
 it('missing child refuses guardian link creation',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce(null);
  await expect(service.addGuardian(center,userId,childId,guardianDto)).rejects.toMatchObject({status:404});
  expect(tx.guardianLink.create).not.toHaveBeenCalled();
 });
 it('primary guardian replacement stays center-scoped and audit-bound',async()=>{
  const {service,tx}=make();
  const result=await service.addGuardian(center,userId,childId,{...guardianDto,isPrimary:true});
  expect(result).toEqual({id:'fictional-link',connected:false,invited:false});
  expect(tx.guardianLink.updateMany).toHaveBeenCalledWith({
   where:{centerId,childId,removedAt:null,isPrimary:true},data:{isPrimary:false}
  });
  expect(tx.guardianLink.create.mock.calls[0][0].data).toMatchObject({
   centerId,childId,displayName:'Fictional Guardian',isPrimary:true,userId:null
  });
 });
 it('guardian invitation is captured and delivered only when explicitly requested',async()=>{
  const {service,invitations}=make();
  const r=await service.addGuardian(center,userId,childId,{...guardianDto,invite:true});
  expect(r.invited).toBe(true);
  expect(invitations.createInTx).toHaveBeenCalledTimes(1);
  expect(invitations.deliver).toHaveBeenCalledTimes(1);
 });
 it('cannot resend invitation to absent or already connected guardian',async()=>{
  const {service,prisma}=make();prisma.guardianLink.findFirst.mockResolvedValueOnce(null);
  await expect(service.sendGuardianInvite(center,userId,childId,'missing')).rejects.toMatchObject({status:404});
  const next=make();next.prisma.guardianLink.findFirst.mockResolvedValueOnce({
   id:'link',childId,centerId,userId:'already-connected'
  });
  await expect(next.service.sendGuardianInvite(center,userId,childId,'link')).rejects.toMatchObject({status:409});
 });
 it('resends existing pending guardian invitation without creating a second invite',async()=>{
  const {service,prisma,invitations}=make();
  prisma.invitation.findFirst.mockResolvedValueOnce({id:'existing-invite',status:'PENDING'});
  const r=await service.sendGuardianInvite(center,userId,childId,'fictional-link');
  expect(r).toEqual({id:'resent'});
  expect(invitations.resend).toHaveBeenCalledWith(center,'existing-invite',userId,'GUARDIAN');
  expect(invitations.createInTx).not.toHaveBeenCalled();
 });
 it('new guardian invite requires explicit action and a writable center',async()=>{
  const {service,invitations}=make();
  await service.sendGuardianInvite(center,userId,childId,'fictional-link');
  expect(invitations.createInTx).toHaveBeenCalledTimes(1);
  expect(invitations.deliver).toHaveBeenCalledTimes(1);
 });
 it('removing guardian revokes pending invitation and never grants further access',async()=>{
  const {service,tx}=make();
  await service.removeGuardian(center,userId,childId,'fictional-link','Fictional withdrawal');
  expect(tx.guardianLink.updateMany).toHaveBeenCalledWith({
   where:{id:'fictional-link',childId,centerId,removedAt:null},
   data:{removedAt:now,isPrimary:false}
  });
  expect(tx.invitation.updateMany.mock.calls[0][0].data.status).toBe('REVOKED');
 });
 it('absent guardian removal has no audit event',async()=>{
  const {service,tx}=make();tx.guardianLink.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.removeGuardian(center,userId,childId,'missing','Fictional'))
   .rejects.toMatchObject({status:404});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('care assignment rejects nonexistent child or unauthorized center therapist',async()=>{
  const {service,tx}=make();tx.child.findFirst.mockResolvedValueOnce(null);
  await expect(service.assign(center,userId,childId,assignmentDto)).rejects.toMatchObject({status:404});
  const next=make();next.tx.membership.findFirst.mockResolvedValueOnce(null);
  await expect(next.service.assign(center,userId,childId,assignmentDto)).rejects.toMatchObject({status:422});
 });
 it('assignment refuses specialties absent from either therapist or child profile',async()=>{
  const {service,tx}=make();tx.membership.findFirst.mockResolvedValueOnce({id:'fictional-therapist',
   userId:'fictional-user',specialties:['occupational']});
  await expect(service.assign(center,userId,childId,assignmentDto)).rejects.toMatchObject({status:422});
  const next=make();next.tx.child.findFirst.mockResolvedValueOnce(child({services:['occupational']}));
  await expect(next.service.assign(center,userId,childId,assignmentDto)).rejects.toMatchObject({status:422});
 });
 it('lead reassignment clears former specialty lead within exact child and center',async()=>{
  const {service,tx}=make();
  const r=await service.assign(center,userId,childId,{...assignmentDto,isLead:true});
  expect(r.id).toBe('fictional-care');
  expect(tx.careAssignment.updateMany).toHaveBeenCalledWith({
   where:{centerId,childId,service:'speech',endedAt:null,isLead:true},
   data:{isLead:false}
  });
  expect(tx.careAssignment.create.mock.calls[0][0].data.isLead).toBe(true);
 });
});
