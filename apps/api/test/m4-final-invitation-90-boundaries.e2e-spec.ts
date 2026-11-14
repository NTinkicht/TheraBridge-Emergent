// M4-08: real invitation service duplicate, expiry, resends, and
// role-specific guards. All accounts and messages are fictional.
import { InvitationsService,INVITE_TTL_MS } from '../src/centers/invitations.service';
const now=new Date('2026-11-13T12:00:00Z');
const record=(extra:any={})=>({
 id:'inv-one',centerId:'center-a',kind:'STAFF',email:'fictional@example.invalid',
 emailNorm:'fictional@example.invalid',displayName:'Fictional Teammate',
 roles:['THERAPIST'],specialties:[],responsibilities:[],title:null,guardianLinkId:null,
 status:'PENDING',sendCount:1,lastSentAt:now,createdAt:now,
 expiresAt:new Date(now.getTime()+INVITE_TTL_MS),
 acceptedAt:null,revokedAt:null,replacedById:null,center:{id:'center-a',status:'ACTIVE',name:'Synthetic Center'},
 ...extra
});
const input=(extra:any={})=>({
 centerId:'center-a',kind:'STAFF',email:'fictional@example.invalid',
 displayName:' Synthetic  Teammate ',roles:['THERAPIST','THERAPIST'],
 invitedById:'fictional-actor',...extra
});
function make(){
 const tx:any={
  membership:{findFirst:jest.fn().mockResolvedValue(null)},
  invitation:{
   create:jest.fn().mockImplementation(({data}:any)=>Promise.resolve(record({...data,id:'inv-new'}))),
   updateMany:jest.fn().mockResolvedValue({count:1}),
   findUniqueOrThrow:jest.fn().mockResolvedValue(record()),
   update:jest.fn().mockResolvedValue(record())
  },
  center:{findUnique:jest.fn().mockResolvedValue({id:'center-a',status:'ACTIVE',name:'Synthetic Center'})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:1})}
 };
 const db:any={
  invitation:{
   findMany:jest.fn().mockResolvedValue([record()]),
   findFirst:jest.fn().mockResolvedValue(record()),
   findUnique:jest.fn().mockResolvedValue(record())
  },
  user:{findUnique:jest.fn().mockResolvedValue(null)},
  $transaction:jest.fn((callback:any)=>callback(tx))
 };
 const limits:any={count:jest.fn().mockResolvedValue(0),hit:jest.fn().mockResolvedValue(undefined)};
 const audit:any={record:jest.fn().mockResolvedValue(undefined)};
 const mailbox:any={send:jest.fn()};
 const sessions:any={};
 const contexts:any={};
 const cfg:any={corsOrigins:['https://synthetic.example.invalid']};
 const clock:any={now:jest.fn(()=>now)};
 const trial:any={assertWritable:jest.fn(),assertTherapistSeat:jest.fn()};
 const service=new InvitationsService(db,limits,audit,mailbox,sessions,contexts,cfg,clock,trial);
 return {service,tx,db,limits,audit,mailbox,trial};
}
describe('M4-08 invitation creation rejects existing and suspended identities',()=>{
 it('rejects already active non-guardian members instead of making duplicate invitations',async()=>{
  const {service,tx}=make();tx.membership.findFirst.mockResolvedValue({status:'ACTIVE'});
  await expect(service.createInTx(tx,input() as any,now)).rejects.toMatchObject({status:409});
  expect(tx.invitation.create).not.toHaveBeenCalled();
 });
 it('allows a guardian-specific invitation for an already active account',async()=>{
  const {service,tx}=make();tx.membership.findFirst.mockResolvedValue({status:'ACTIVE'});
  const result=await service.createInTx(tx,input({kind:'GUARDIAN',roles:['GUARDIAN']}) as any,now);
  expect(result.invitation.id).toBe('inv-new');
  expect(tx.invitation.create).toHaveBeenCalledTimes(1);
 });
 it('rejects suspended membership regardless of invitation kind',async()=>{
  for(const kind of ['STAFF','GUARDIAN']){
   const {service,tx}=make();tx.membership.findFirst.mockResolvedValue({status:'SUSPENDED'});
   await expect(service.createInTx(tx,input({kind}) as any,now)).rejects.toMatchObject({status:409});
   expect(tx.invitation.create).not.toHaveBeenCalled();
  }
 });
 it('normalizes address, title and duplicate roles before writing a token hash',async()=>{
  const {service,tx}=make();
  const result=await service.createInTx(tx,input({email:'  Fictional@Example.Invalid ',title:'  Fictional Job  '}) as any,now);
  expect(result.token).toMatch(/^[a-zA-Z0-9_-]+$/);
  const data=tx.invitation.create.mock.calls[0][0].data;
  expect(data.emailNorm).toBe('fictional@example.invalid');
  expect(data.roles).toEqual(['THERAPIST']);
  expect(data.title).toBe('Fictional Job');
  expect(data.tokenHash).not.toBe(result.token);
  expect(data.expiresAt.getTime()-now.getTime()).toBe(INVITE_TTL_MS);
 });
 it('never puts invite token into a returned database invitation summary',async()=>{
  const {service,db}=make();
  const value=await service.list('center-a');
  expect(db.invitation.findMany.mock.calls[0][0].where).toEqual({centerId:'center-a'});
  expect(value.items[0]).not.toHaveProperty('tokenHash');
 });
 it('passes explicit invitation type filter only when requested',async()=>{
  const {service,db}=make();
  await service.list('center-a','FIRST_ADMIN' as any);
  expect(db.invitation.findMany.mock.calls[0][0].where).toEqual({centerId:'center-a',kind:'FIRST_ADMIN'});
 });
 it('sends role-labelled fictional invitation to configured origin, not a public API token response',()=>{
  const {service,mailbox}=make();
  service.deliver(record({kind:'FIRST_ADMIN',roles:['CENTER_ADMIN']}) as any,'Synthetic Center','fake-fragment');
  expect(mailbox.send).toHaveBeenCalledTimes(1);
  expect(mailbox.send.mock.calls[0][0].subject).toContain('Set up');
  expect(mailbox.send.mock.calls[0][0].body).toContain('/invite#token=fake-fragment');
 });
});
describe('M4-08 public invite inspection guards',()=>{
 it('throttles public requests before disclosing invitation metadata',async()=>{
  const {service,db,limits}=make();limits.count.mockResolvedValue(30);
  await expect(service.inspect('fictional-token','198.51.100.20')).rejects.toMatchObject({status:429});
  expect(db.invitation.findUnique).not.toHaveBeenCalled();
 });
 it('rejects token with no matching invitation without exposing identity',async()=>{
  const {service,db}=make();db.invitation.findUnique.mockResolvedValue(null);
  await expect(service.inspect('fictional-token','198.51.100.20')).rejects.toMatchObject({status:404});
 });
 it('returns expired status without looking up the account',async()=>{
  const {service,db}=make();db.invitation.findUnique.mockResolvedValue(record({expiresAt:new Date(now.getTime()-1000)}));
  const status=await service.inspect('fictional-token','198.51.100.20');
  expect(status).toEqual({status:'EXPIRED'});
  expect(db.user.findUnique).not.toHaveBeenCalled();
 });
 it('conceals pending invitation to an inactive center',async()=>{
  const {service,db}=make();
  db.invitation.findUnique.mockResolvedValue(record({center:{status:'SUSPENDED',name:'Synthetic'}}));
  expect(await service.inspect('fictional-token','198.51.100.20')).toEqual({status:'UNAVAILABLE'});
 });
 it('reports account-exists boolean only for usable pending invitations',async()=>{
  const {service,db}=make();db.user.findUnique.mockResolvedValue({id:'existing'});
  const value=await service.inspect('fictional-token','198.51.100.20');
  expect(value.status).toBe('PENDING');expect(value.accountExists).toBe(true);
  expect(value.email).toBe('fictional@example.invalid');
 });
 it('refuses mutation of invitations whose status is no longer pending',async()=>{
  const {service,db}=make();db.invitation.findFirst.mockResolvedValue(record({status:'REVOKED'}));
  await expect(service.resend('center-a','inv-one','actor','STAFF' as any)).rejects.toMatchObject({status:409});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('refuses resends beyond the maximum and avoids token changes',async()=>{
  const {service,db}=make();db.invitation.findFirst.mockResolvedValue(record({sendCount:5}));
  await expect(service.resend('center-a','inv-one','actor','STAFF' as any)).rejects.toMatchObject({status:429});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('denies stale resend when another actor changed the pending invitation',async()=>{
  const {service,tx,mailbox}=make();tx.invitation.updateMany.mockResolvedValue({count:0});
  await expect(service.resend('center-a','inv-one','actor','STAFF' as any)).rejects.toMatchObject({status:409});
  expect(mailbox.send).not.toHaveBeenCalled();
 });
 it('denies stale revocation without claiming the invitation was revoked',async()=>{
  const {service,tx,audit}=make();tx.invitation.updateMany.mockResolvedValue({count:0});
  await expect(service.revoke('center-a','inv-one','actor','STAFF' as any)).rejects.toMatchObject({status:409});
  expect(audit.record).not.toHaveBeenCalled();
 });
});
