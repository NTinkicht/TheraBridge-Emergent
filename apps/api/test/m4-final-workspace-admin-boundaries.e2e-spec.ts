// M4-08: source-executing center workspace authorization and lifecycle
// boundaries. Synthetic collaborators; no database, real staff or clinical gate.
import { WorkspaceService } from '../src/centers/workspace.service';
const now=new Date('2026-11-13T12:00:00.000Z');
const member=(extra:any={})=>({
 id:'membership-one',centerId:'center-one',userId:'user-one',status:'ACTIVE',
 roles:[{role:'COORDINATOR'}],specialties:['speech'],responsibilities:[],
 title:null,phone:null,statusReason:null,statusChangedAt:null,createdAt:now,
 user:{id:'user-one',displayName:'Synthetic Operator',email:'operator@example.invalid'},
 ...extra
});
const center=(extra:any={})=>({
 id:'center-one',name:'Synthetic Center',slug:'synthetic-center',timezone:'UTC',
 country:'AE',city:'Sharjah',specialties:['speech'],status:'ACTIVE',version:2,createdAt:now,...extra
});
function make(){
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([]),
  center:{
   updateMany:jest.fn().mockResolvedValue({count:1}),
  },
  centerEvent:{create:jest.fn().mockResolvedValue({id:1})},
  centerSetupStep:{createMany:jest.fn().mockResolvedValue({count:1})},
  membership:{
   findFirst:jest.fn().mockResolvedValue(member()),
   findFirstOrThrow:jest.fn().mockResolvedValue(member()),
   update:jest.fn().mockResolvedValue(member()),
   count:jest.fn().mockResolvedValue(1),
  },
  roleAssignment:{
   createMany:jest.fn().mockResolvedValue({count:0}),
   deleteMany:jest.fn().mockResolvedValue({count:0}),
  },
  session:{updateMany:jest.fn().mockResolvedValue({count:0})},
  user:{update:jest.fn().mockResolvedValue({})}
 };
 const db:any={
  $transaction:jest.fn((cb:any)=>cb(tx)),
  center:{
   findUniqueOrThrow:jest.fn().mockResolvedValue(center()),
   findFirst:jest.fn().mockResolvedValue(null)
  },
  centerSetupStep:{findMany:jest.fn().mockResolvedValue([])},
  membership:{
   count:jest.fn().mockResolvedValue(1),
   findMany:jest.fn().mockResolvedValue([member()]),
   findFirst:jest.fn().mockResolvedValue(member()),
   findFirstOrThrow:jest.fn().mockResolvedValue(member()),
   groupBy:jest.fn().mockResolvedValue([{status:'ACTIVE',_count:{_all:1}}])
  },
  invitation:{count:jest.fn().mockResolvedValue(0)},
  user:{findMany:jest.fn().mockResolvedValue([])},
  centerEvent:{findMany:jest.fn().mockResolvedValue([])}
 };
 const audit:any={record:jest.fn().mockResolvedValue(undefined)};
 const clock:any={now:jest.fn(()=>now)};
 const trial:any={assertTherapistSeat:jest.fn().mockResolvedValue(undefined)};
 const notices:any={changed:jest.fn().mockResolvedValue(undefined)};
 return {service:new WorkspaceService(db,audit,clock,trial,notices),db,tx,audit,trial,notices};
}
describe('M4-08 workspace setting updates obey uniqueness and optimistic locking',()=>{
 it('returns exact server-backed center settings, not other tenant fields',async()=>{
  const {service,db}=make();
  const data=await service.settings('center-one');
  expect(data.name).toBe('Synthetic Center');
  expect(data.version).toBe(2);
  expect(db.center.findUniqueOrThrow).toHaveBeenCalledWith({where:{id:'center-one'}});
 });
 it('rejects duplicate center name before any write transaction',async()=>{
  const {service,db}=make();
  db.center.findFirst.mockResolvedValue(center({id:'other-center'}));
  await expect(service.updateSettings('center-one','actor',{name:'  Synthetic Center  ',version:2} as any))
   .rejects.toMatchObject({status:409});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('refuses an obsolete center version and never records success',async()=>{
  const {service,tx,audit}=make();
  tx.center.updateMany.mockResolvedValue({count:0});
  await expect(service.updateSettings('center-one','actor',{version:1,city:'Sharjah'} as any))
   .rejects.toMatchObject({status:409});
  expect(audit.record).not.toHaveBeenCalled();
 });
 it('trims user-visible metadata and deduplicates specialties atomically',async()=>{
  const {service,tx,audit}=make();
  await service.updateSettings('center-one','actor',{
   version:2,name:' Synthetic  New  Center ',country:' AE ',city:' Sharjah ',
   specialties:['speech','speech','occupational']
  } as any);
  expect(tx.center.updateMany.mock.calls[0][0].data).toMatchObject({
   name:'Synthetic New Center',country:'AE',city:'Sharjah',
   specialties:['speech','occupational'],version:{increment:1}
  });
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
  expect(tx.centerSetupStep.createMany).toHaveBeenCalledTimes(1);
  expect(audit.record).toHaveBeenCalledTimes(1);
 });
});
describe('M4-08 setup provenance and manual steps',()=>{
 it('reports incomplete setup without claiming tasks are completed',async()=>{
  const {service}=make();
  const value=await service.setup('center-one');
  expect(value.done).toBe(0);
  expect(value.total).toBeGreaterThan(0);
  expect(value.steps.find((x:any)=>x.key==='review_permissions').manual).toBe(true);
  expect(value.steps.find((x:any)=>x.key==='invite_team').completedAt).toBeNull();
 });
 it('attributes an existing completed step only to a recorded user',async()=>{
  const {service,db}=make();
  db.centerSetupStep.findMany.mockResolvedValue([{key:'invite_team',completedById:'user-one',completedAt:now}]);
  db.user.findMany.mockResolvedValue([{id:'user-one',displayName:'Synthetic Operator'}]);
  const value=await service.setup('center-one');
  expect(value.done).toBe(1);
  expect(value.steps.find((x:any)=>x.key==='invite_team').completedBy).toBe('Synthetic Operator');
 });
 it('does not accept an unknown setup step',async()=>{
  const {service,db}=make();
  await expect(service.completeStep('center-one','unrecognized','actor')).rejects.toMatchObject({status:404});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('refuses manual completion of a step reserved for automated evidence',async()=>{
  const {service,db}=make();
  await expect(service.completeStep('center-one','invite_team','actor')).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('records one manual completion event only when it creates the completion',async()=>{
  const {service,tx}=make();
  await service.completeStep('center-one','review_permissions','actor');
  expect(tx.centerSetupStep.createMany).toHaveBeenCalledTimes(1);
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
 });
 it('does not duplicate a manual-step event on idempotent retry',async()=>{
  const {service,tx}=make();
  tx.centerSetupStep.createMany.mockResolvedValue({count:0});
  await service.completeStep('center-one','review_permissions','actor');
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
});
describe('M4-08 scoped team directory and membership administration',()=>{
 it('limits default staff listing to authorized center and active/suspended roles',async()=>{
  const {service,db}=make();
  const value=await service.staff('center-one',{} as any);
  expect(value.items).toHaveLength(1);
  expect(db.membership.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:'center-one',status:{in:['ACTIVE','SUSPENDED']}
  });
  expect(value.counts.ACTIVE).toBe(1);
 });
 it('filters by exact role, specialty, status and user query without widening tenant',async()=>{
  const {service,db}=make();
  await service.staff('center-one',{
   role:'THERAPIST',specialty:'speech',status:'ACTIVE',q:'synthetic',page:2
  } as any);
  const request=db.membership.findMany.mock.calls[0][0];
  expect(request.where.centerId).toBe('center-one');
  expect(request.where.AND).toEqual([{roles:{some:{role:'THERAPIST'}}}]);
  expect(request.where.specialties).toEqual({has:'speech'});
  expect(request.where.user.OR).toHaveLength(2);
  expect(request.skip).toBe(25);
  expect(request.take).toBe(25);
 });
 it('does not reveal a member outside its center, even with an existing ID',async()=>{
  const {service,db}=make();
  db.membership.findFirst.mockResolvedValue(null);
  await expect(service.memberDetail('center-one','cross-center-member')).rejects.toMatchObject({status:404});
  expect(db.membership.findFirst.mock.calls[0][0].where).toMatchObject({
   centerId:'center-one',id:'cross-center-member'
  });
 });
 it('keeps staff audit-event reads scoped to the same center and member',async()=>{
  const {service,db}=make();
  const value=await service.memberDetail('center-one','membership-one');
  expect(value.roles).toEqual(['COORDINATOR']);
  expect(db.centerEvent.findMany.mock.calls[0][0].where.centerId).toBe('center-one');
  expect(value.events).toEqual([]);
 });
 it('rejects edits to revoked memberships before altering roles or profiles',async()=>{
  const {service,tx}=make();
  tx.membership.findFirst.mockResolvedValue(member({status:'REVOKED'}));
  await expect(service.updateMember('center-one','membership-one','actor',{
   roles:['COORDINATOR']
  } as any)).rejects.toMatchObject({status:409});
  expect(tx.membership.update).not.toHaveBeenCalled();
 });
 it('rejects removal of the final directory role instead of silently revoking access',async()=>{
  const {service,tx}=make();
  tx.membership.findFirst.mockResolvedValue(member({roles:[{role:'THERAPIST'}]}));
  await expect(service.updateMember('center-one','membership-one','actor',{
   roles:[]
  } as any)).rejects.toMatchObject({status:422});
  expect(tx.membership.update).not.toHaveBeenCalled();
 });
 it('does not allow a center administrator to suspend their own membership',async()=>{
  const {service,db}=make();
  await expect(service.changeStatus('center-one','membership-one',{
   userId:'actor',membershipId:'membership-one'
  },'suspend','Synthetic reason')).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('rejects invalid status transitions without revoking sessions',async()=>{
  const {service,tx}=make();
  tx.membership.findFirst.mockResolvedValue(member({status:'REVOKED'}));
  await expect(service.changeStatus('center-one','membership-one',{
   userId:'actor',membershipId:'another-membership'
  },'reactivate','Synthetic')).rejects.toMatchObject({status:409});
  expect(tx.session.updateMany).not.toHaveBeenCalled();
 });
 it('refuses removal of the only active administrator for a center',async()=>{
  const {service,tx}=make();
  tx.membership.findFirst.mockResolvedValue(member({roles:[{role:'CENTER_ADMIN'}]}));
  tx.membership.count.mockResolvedValue(0);
  await expect(service.changeStatus('center-one','membership-one',{
   userId:'actor',membershipId:'another-membership'
  },'suspend','Synthetic')).rejects.toMatchObject({status:409});
  expect(tx.membership.update).not.toHaveBeenCalled();
  expect(tx.session.updateMany).not.toHaveBeenCalled();
 });
 it('permits non-clinical self profile edits while preserving center scope',async()=>{
  const {service,tx,db,audit}=make();
  const value=await service.updateMe('center-one','membership-one',{
   userId:'user-one',role:'COORDINATOR'
  },{displayName:' Synthetic   New Name ',title:'Coordinator'} as any);
  expect(value.id).toBe('membership-one');
  expect(tx.user.update.mock.calls[0][0].data.displayName).toBe('Synthetic New Name');
  expect(tx.membership.update.mock.calls[0][0].where.id).toBe('membership-one');
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
  expect(audit.record).toHaveBeenCalledTimes(1);
  expect(db.membership.findFirstOrThrow.mock.calls[0][0].where.centerId).toBe('center-one');
 });
});
