import {ProvisioningService,slugify} from '../src/centers/provisioning.service';
const now=new Date('2026-11-13T12:00:00Z');
const input=(change:any={})=>({
 name:'Synthetic Center',slug:undefined,timezone:'UTC',country:'AE',city:'Sharjah',
 specialties:['speech'],firstAdmin:{email:'fictional@example.invalid',displayName:'Synthetic Admin'},...change
});
const row=(change:any={})=>({
 id:'c1',slug:'synthetic-center',name:'Synthetic Center',city:'Sharjah',country:'AE',
 status:'ACTIVE',source:'DIRECT',createdAt:now,timezone:'UTC',specialties:['speech'],
 version:1,application:null,setupSteps:[],invitations:[],memberships:[],events:[],
 _count:{memberships:0,setupSteps:0},...change
});
function setup(){
 const tx:any={
  center:{create:jest.fn().mockResolvedValue(row())},
  centerEvent:{create:jest.fn().mockResolvedValue({id:1})},
  applicationEvent:{create:jest.fn().mockResolvedValue({})}
 };
 const db:any={
  center:{findMany:jest.fn().mockResolvedValue([]),findFirst:jest.fn().mockResolvedValue(null),
    findUnique:jest.fn().mockResolvedValue(row()),count:jest.fn().mockResolvedValue(0)},
  centerApplication:{findUnique:jest.fn().mockResolvedValue(null)},
  membership:{count:jest.fn().mockResolvedValue(0)},
  invitation:{count:jest.fn().mockResolvedValue(0)},
  user:{findMany:jest.fn().mockResolvedValue([])},
  $transaction:jest.fn((fn:any)=>fn(tx))
 };
 const invitations:any={
  createInTx:jest.fn().mockResolvedValue({invitation:{id:'inv',kind:'FIRST_ADMIN'},token:'synthetic-fragment'}),
  deliver:jest.fn()
 };
 const audit:any={record:jest.fn().mockResolvedValue(undefined)},clock:any={now:jest.fn(()=>now)};
 return {service:new ProvisioningService(db,invitations,audit,clock),db,tx,invitations,audit};
}
describe('M4-08 center provisioning exact-tenant and application security branches',()=>{
 it.each([['A','center-a'],['  ','center-new'],['Nôm École','nom-ecole'],['a b c','a-b-c'],['---','center-new']])(
  'normalizes public center slug %s', (name,expected)=>{expect(slugify(name)).toBe(expected);}
 );
 it('refuses an absent application before creating center',async()=>{
  const {service,db}=setup();
  await expect(service.create('actor',input({applicationId:'missing'}) as any)).rejects.toMatchObject({status:404});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('refuses submitted or rejected application without provisioning',async()=>{
  for(const status of ['SUBMITTED','REJECTED']){
   const {service,db}=setup();db.centerApplication.findUnique.mockResolvedValue({status,center:null});
   await expect(service.create('actor',input({applicationId:'app'}) as any)).rejects.toMatchObject({status:409});
   expect(db.$transaction).not.toHaveBeenCalled();
  }
 });
 it('never re-provisions approved application with existing center',async()=>{
  const {service,db}=setup();db.centerApplication.findUnique.mockResolvedValue({status:'APPROVED',center:row()});
  await expect(service.create('actor',input({applicationId:'app'}) as any)).rejects.toMatchObject({status:409});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('rejects center-name conflicts case-insensitively and prevents invite',async()=>{
  const {service,db,invitations}=setup();db.center.findFirst.mockResolvedValue(row());
  await expect(service.create('actor',input({name:' SYNTHETIC   CENTER '}) as any)).rejects.toMatchObject({status:409});
  expect(invitations.createInTx).not.toHaveBeenCalled();
 });
 it('rejects explicit slug collisions without transaction',async()=>{
  const {service,db}=setup();
  await expect(service.create('actor',input({slug:'existing-center'}) as any)).rejects.toMatchObject({status:409});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('generates suffix when suggested slug is already reserved',async()=>{
  const {service,db,tx}=setup();db.center.findMany.mockResolvedValue([{slug:'synthetic-center'}]);
  db.center.findUnique.mockResolvedValue(row());
  await service.create('actor',input() as any);
  expect(tx.center.create.mock.calls[0][0].data.slug).toBe('synthetic-center-2');
 });
 it('keeps direct center first administrator invitation transactional',async()=>{
  const {service,tx,invitations,audit}=setup();
  await service.create('actor',input({specialties:['speech','speech']}) as any);
  expect(tx.center.create.mock.calls[0][0].data.specialties).toEqual(['speech']);
  expect(invitations.createInTx.mock.calls[0][1]).toMatchObject({
   centerId:'c1',kind:'FIRST_ADMIN',roles:['CENTER_ADMIN'],invitedById:'actor'
  });
  expect(invitations.deliver).toHaveBeenCalledTimes(1);
  expect(audit.record).toHaveBeenCalledTimes(1);
 });
 it('creates approved application source and one event only in same transaction',async()=>{
  const {service,db,tx}=setup();db.centerApplication.findUnique.mockResolvedValue({status:'APPROVED',center:null});
  await service.create('actor',input({applicationId:'application-a'}) as any);
  expect(tx.applicationEvent.create).toHaveBeenCalledTimes(1);
  expect(tx.center.create.mock.calls[0][0].data).toMatchObject({source:'APPLICATION',applicationId:'application-a'});
 });
 it('returns missing center as not found before enumeration',async()=>{
  const {service,db}=setup();db.center.findUnique.mockResolvedValue(null);
  await expect(service.detail('missing')).rejects.toMatchObject({status:404});
  expect(db.membership.count).not.toHaveBeenCalled();
 });
 it('lists expired, pending, active and absent first administrators distinctly',async()=>{
  const {service,db}=setup();
  const items=[
   row({id:'active',memberships:[{id:'admin'}]}),
   row({id:'pending',invitations:[{expiresAt:new Date('2026-11-14T00:00:00Z')}]}),
   row({id:'expired',invitations:[{expiresAt:new Date('2026-11-12T00:00:00Z')}]}),
   row({id:'none'})
  ];
  db.center.findMany.mockResolvedValue(items);
  const result=await service.list({} as any);
  expect(result.items.map(x=>x.adminStatus)).toEqual(['ACTIVE','INVITED','EXPIRED','NONE']);
 });
 it('preserves center list filters, pagination and scoped statistics',async()=>{
  const {service,db}=setup();
  await service.list({status:'ACTIVE',q:'ABC',page:3} as any);
  const args=db.center.findMany.mock.calls[0][0];
  expect(args.where.status).toBe('ACTIVE');
  expect(args.where.OR).toHaveLength(3);
  expect(args.skip).toBe(40);expect(args.take).toBe(20);
 });
 it('returns no real invitation token or hash through center details',async()=>{
  const {service,db}=setup();
  db.center.findUnique.mockResolvedValue(row({
   invitations:[{id:'invite',kind:'FIRST_ADMIN',email:'fictional@example.invalid',
    displayName:'Synthetic',roles:['CENTER_ADMIN'],specialties:[],responsibilities:[],
    title:null,status:'PENDING',sendCount:1,lastSentAt:now,createdAt:now,
    expiresAt:new Date(now.getTime()+86_400_000),acceptedAt:null,revokedAt:null,replacedById:null,
    tokenHash:'never-expose'}]
  }));
  const result=await service.detail('c1');
  expect(result.adminInvitations).toHaveLength(1);
  expect(JSON.stringify(result)).not.toContain('never-expose');
 });
});
