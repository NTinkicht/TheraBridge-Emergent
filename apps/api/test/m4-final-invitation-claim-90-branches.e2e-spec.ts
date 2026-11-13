// M4-08: source-executing invite acceptance races and role restoration.
// All identities fictional; no login session, emails or real accounts.
import {InvitationsService} from '../src/centers/invitations.service';
const now=new Date('2026-11-13T12:00:00Z');
const invitation=(extra:any={})=>({
 id:'invitation-one',centerId:'center-one',kind:'STAFF',email:'fictional@example.invalid',
 emailNorm:'fictional@example.invalid',displayName:'Fictional clinician',
 roles:['THERAPIST'],specialties:['speech'],responsibilities:[],title:'Synthetic title',
 guardianLinkId:null,status:'PENDING',sendCount:1,createdAt:now,
 expiresAt:new Date('2026-11-20T00:00:00Z'),
 center:{id:'center-one',status:'ACTIVE',trialEndsAt:new Date('2026-12-01T00:00:00Z')},
 ...extra
});
function make(){
 const tx:any={
  invitation:{updateMany:jest.fn().mockResolvedValue({count:1})},
  membership:{findUnique:jest.fn().mockResolvedValue(null),
   create:jest.fn().mockResolvedValue({id:'member-created'}),
   update:jest.fn().mockResolvedValue({id:'member-existing'})},
  roleAssignment:{createMany:jest.fn().mockResolvedValue({count:1}),
   deleteMany:jest.fn().mockResolvedValue({count:1})},
  guardianLink:{updateMany:jest.fn().mockResolvedValue({count:1})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:'synthetic-event'})},
 };
 const db:any={invitation:{findUnique:jest.fn().mockResolvedValue(invitation())}};
 const limits:any={count:jest.fn().mockResolvedValue(0),hit:jest.fn()};
 const audit:any={record:jest.fn()};
 const mailbox:any={send:jest.fn()};
 const sessions:any={},contexts:any={},cfg:any={corsOrigins:['https://synthetic.example.invalid']};
 const clock:any={now:jest.fn(()=>now)},trial:any={assertWritable:jest.fn()};
 return {service:new InvitationsService(db,limits,audit,mailbox,sessions,contexts,cfg,clock,trial),db,tx};
}
const claim=(service:InvitationsService,tx:any,inv:any=invitation())=>
 (service as any).claimAndJoin(tx,inv,'user-one',now);
const usable=(service:InvitationsService)=> (service as any).usable.bind(service);
describe('M4-08 invite token is only usable in active pending scoped center',()=>{
 it('denies token not found without accepting a user',async()=>{
  const {service,db}=make();db.invitation.findUnique.mockResolvedValue(null);
  await expect(usable(service)('fictional-fragment',now)).rejects.toMatchObject({status:404});
 });
 it.each([
  ['revoked',invitation({status:'REVOKED'})],
  ['accepted',invitation({status:'ACCEPTED'})],
  ['expired',invitation({expiresAt:new Date('2026-11-13T11:59:59Z')})],
  ['inactive center',invitation({center:{status:'SUSPENDED',trialEndsAt:new Date('2026-12-01T00:00:00Z')}})]
 ])('denies %s before checking membership',async(_label,inv)=>{
  const {service,db}=make();db.invitation.findUnique.mockResolvedValue(inv);
  await expect(usable(service)('fictional-fragment',now)).rejects.toMatchObject({status:410});
 });
 it('never accepts invitation from expired synthetic trial',async()=>{
  const {service,db}=make();
  db.invitation.findUnique.mockResolvedValue(invitation({center:{id:'center-one',status:'ACTIVE',trialEndsAt:new Date('2026-11-12T00:00:00Z')}}));
  await expect(usable(service)('fictional-fragment',now)).rejects.toMatchObject({status:410});
 });
 it('accepts pending unexpired token in active synthetic center for further checks',async()=>{
  const {service}=make();
  const result=await usable(service)('fictional-fragment',now);
  expect(result.id).toBe('invitation-one');
 });
});
describe('M4-08 invitation acceptance is an atomic, role-scoped membership transition',()=>{
 it('refuses concurrent claimed invitation before creating or modifying user membership',async()=>{
  const {service,tx}=make();tx.invitation.updateMany.mockResolvedValue({count:0});
  await expect(claim(service,tx)).rejects.toMatchObject({status:410});
  expect(tx.membership.findUnique).not.toHaveBeenCalled();
  expect(tx.membership.create).not.toHaveBeenCalled();
 });
 it('creates a first membership with exact invitation role and no extra rights',async()=>{
  const {service,tx}=make();
  expect(await claim(service,tx)).toBe('member-created');
  expect(tx.membership.create.mock.calls[0][0].data).toMatchObject({
   userId:'user-one',centerId:'center-one',title:'Synthetic title',specialties:['speech']
  });
  expect(tx.membership.create.mock.calls[0][0].data.roles.create).toEqual([{role:'THERAPIST'}]);
  expect(tx.roleAssignment.createMany).not.toHaveBeenCalled();
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
 });
 it('rejects suspended center membership rather than silently reactivating it',async()=>{
  const {service,tx}=make();
  tx.membership.findUnique.mockResolvedValue({id:'member-existing',status:'SUSPENDED',roles:[]});
  await expect(claim(service,tx)).rejects.toMatchObject({status:409});
  expect(tx.membership.update).not.toHaveBeenCalled();
  expect(tx.roleAssignment.createMany).not.toHaveBeenCalled();
 });
 it('reactivates revoked membership while clearing stale role assignments',async()=>{
  const {service,tx}=make();
  tx.membership.findUnique.mockResolvedValue({id:'member-existing',status:'REVOKED',roles:[{role:'CENTER_ADMIN'}]});
  const memberId=await claim(service,tx);
  expect(memberId).toBe('member-existing');
  expect(tx.roleAssignment.deleteMany).toHaveBeenCalledWith({where:{membershipId:'member-existing'}});
  expect(tx.roleAssignment.createMany.mock.calls[0][0].data).toEqual([{membershipId:'member-existing',role:'THERAPIST'}]);
  expect(tx.membership.update.mock.calls[0][0].data.status).toBe('ACTIVE');
 });
 it('preserves an active existing role without creating a duplicate role assignment',async()=>{
  const {service,tx}=make();
  tx.membership.findUnique.mockResolvedValue({id:'member-existing',status:'ACTIVE',roles:[{role:'THERAPIST'}]});
  expect(await claim(service,tx)).toBe('member-existing');
  expect(tx.roleAssignment.deleteMany).not.toHaveBeenCalled();
  expect(tx.roleAssignment.createMany.mock.calls[0][0].data).toEqual([]);
  expect(tx.membership.update.mock.calls[0][0].data).toEqual({});
 });
 it('adds missing invitation role but never removes unrelated active roles',async()=>{
  const {service,tx}=make();
  tx.membership.findUnique.mockResolvedValue({id:'member-existing',status:'ACTIVE',roles:[{role:'COORDINATOR'}]});
  expect(await claim(service,tx)).toBe('member-existing');
  expect(tx.roleAssignment.createMany.mock.calls[0][0].data).toEqual([
   {membershipId:'member-existing',role:'THERAPIST'}
  ]);
  expect(tx.roleAssignment.deleteMany).not.toHaveBeenCalled();
 });
 it('does not write a guardian link for an invitation without guardianLinkId',async()=>{
  const {service,tx}=make();
  await claim(service,tx);
  expect(tx.guardianLink.updateMany).not.toHaveBeenCalled();
 });
 it('binds a guardian invitation only to its exact active center child link',async()=>{
  const {service,tx}=make();
  await claim(service,tx,invitation({kind:'GUARDIAN',roles:['GUARDIAN'],guardianLinkId:'guardian-link-one'}));
  expect(tx.guardianLink.updateMany.mock.calls[0][0].where).toEqual({
   id:'guardian-link-one',centerId:'center-one',removedAt:null
  });
  expect(tx.guardianLink.updateMany.mock.calls[0][0].data.userId).toBe('user-one');
 });
 it('refuses claimed token when the linked guardian association was concurrently removed',async()=>{
  const {service,tx}=make();tx.guardianLink.updateMany.mockResolvedValue({count:0});
  await expect(claim(service,tx,invitation({guardianLinkId:'gone-link'}))).rejects.toMatchObject({status:410});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('records only the exact invitation and member identities in its center event',async()=>{
  const {service,tx}=make();await claim(service,tx);
  expect(tx.centerEvent.create.mock.calls[0][0].data).toMatchObject({
   centerId:'center-one',type:'invitation.accepted'
  });
 });
});
