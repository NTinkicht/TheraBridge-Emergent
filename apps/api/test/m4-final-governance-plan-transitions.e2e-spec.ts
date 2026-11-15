// M4-08 direct source-executing governance transition tests, synthetic only.
// Full transition and immutable-history code paths execute with guarded fake Tx.
// No real clinical data, sign-off, release or patient entitlements.
import {GovernanceService} from '../src/clinical/governance.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
import {ClinicalService} from '../src/clinical/clinical.service';
import {ReportsService} from '../src/clinical/reports.service';
const center='fictional-center',documentId='fictional-plan-version',childId='fictional-child';
const author={role:'THERAPIST',userId:'fictional-author',membershipId:'fictional-membership'} as any;
const reviewer={role:'CLINICAL_SUPERVISOR',userId:'fictional-reviewer',membershipId:'fictional-supervisor'} as any;
const now=new Date('2026-11-11T10:00:00.000Z');
const plan=(extra:Record<string,unknown>={})=>({
 id:documentId,centerId:center,version:2,number:1,status:'DRAFT',authorId:'fictional-author',
 summary:'Synthetic summary',goals:[{key:'g1',title:'Fictional goal'}],homeActivities:[],reviewNotes:[],
 plan:{centerId:center,childId,service:'speech',title:'Synthetic therapy plan'},
 ...extra
});
const setup=(item=plan())=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:'fictional-lock'}]),
  membership:{findFirst:jest.fn().mockResolvedValue({id:'fictional-membership'})},
  planVersion:{findFirst:jest.fn().mockResolvedValue(item),updateMany:jest.fn().mockResolvedValue({count:1})},
  progressReport:{findFirst:jest.fn(),updateMany:jest.fn()},
  governanceHistory:{
   findFirst:jest.fn().mockResolvedValue(null),
   create:jest.fn(async ({data}:any)=>({id:'history-1',...data}))
  },
  governanceSnapshot:{
   create:jest.fn(async ({data}:any)=>({id:'snapshot-1',...data}))
  },
  child:{findUniqueOrThrow:jest.fn().mockResolvedValue({
   id:childId,firstName:'Fictional',lastName:'Alex',preferredName:null
  })},
  observation:{findMany:jest.fn().mockResolvedValue([])},
  activityTemplate:{findMany:jest.fn().mockResolvedValue([])},
  user:{findUniqueOrThrow:jest.fn().mockResolvedValue({displayName:'Fictional Author'})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:'event-a'})}
 };
 const db:any={$transaction:jest.fn(async (fn:any)=>fn(tx))};
 const trial:any={now:()=>now,assertWritable:jest.fn().mockResolvedValue(undefined)};
 const clinical:any={child:jest.fn().mockResolvedValue({
  id:childId,centerId:center,services:['speech']
 })};
 return {service:new GovernanceService(db as PrismaService,trial as TrialService,
   clinical as ClinicalService,{} as ReportsService),tx,db,trial,clinical};
};
const dto=(action:string,extra:Record<string,unknown>={})=>({action,reason:'Fictional audited reason',version:2,...extra} as any);
describe('M4-08 actual governance transitions deny unsafe role/version/state changes',()=>{
 it('blank reason fails before transaction, actor reads or snapshot generation',async()=>{
  const {service,db,tx}=setup();
  await expect(service.transition(center,author,'PLAN',documentId,dto('SUBMIT',{reason:'   '})))
   .rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('live revoked actor denied before document read or transition',async()=>{
  const {service,tx}=setup();tx.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.transition(center,author,'PLAN',documentId,dto('SUBMIT')))
   .rejects.toMatchObject({status:403});
  expect(tx.planVersion.findFirst).not.toHaveBeenCalled();
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('unknown document type returns 404 without enumerating source plans',async()=>{
  const {service,tx}=setup();
  await expect(service.transition(center,author,'OTHER',documentId,dto('SUBMIT')))
   .rejects.toMatchObject({status:404});
  expect(tx.planVersion.findFirst).not.toHaveBeenCalled();
 });
 it('stale version never freezes a new immutable artifact',async()=>{
  const {service,tx}=setup();
  await expect(service.transition(center,author,'PLAN',documentId,dto('SUBMIT',{version:1})))
   .rejects.toMatchObject({status:409});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
  expect(tx.planVersion.updateMany).not.toHaveBeenCalled();
 });
 it('supervisor cannot submit a therapist-authored plan',async()=>{
  const {service,tx}=setup();
  await expect(service.transition(center,reviewer,'PLAN',documentId,dto('SUBMIT')))
   .rejects.toMatchObject({status:403});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('therapist cannot issue supervisor RETURN action even if review has begun',async()=>{
  const {service,tx}=setup(plan({status:'IN_REVIEW'}));
  await expect(service.transition(center,author,'PLAN',documentId,dto('RETURN')))
   .rejects.toMatchObject({status:403});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('only author can submit plan, even if another therapist has child assignment',async()=>{
  const {service,tx}=setup(plan({authorId:'another-therapist'}));
  await expect(service.transition(center,author,'PLAN',documentId,dto('SUBMIT')))
   .rejects.toMatchObject({status:403});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('submit without any explicit goal is invalid clinical draft',async()=>{
  const {service,tx}=setup(plan({goals:[]}));
  await expect(service.transition(center,author,'PLAN',documentId,dto('SUBMIT')))
   .rejects.toMatchObject({status:422});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('cannot submit a withdrawn plan without creating a new version',async()=>{
  const {service,tx}=setup(plan({status:'WITHDRAWN'}));
  await expect(service.transition(center,author,'PLAN',documentId,dto('SUBMIT')))
   .rejects.toMatchObject({status:409});
  expect(tx.governanceSnapshot.create).not.toHaveBeenCalled();
 });
 it('plan cannot use report-only REOPEN operation',async()=>{
  const {service,tx}=setup(plan({status:'WITHDRAWN'}));
  await expect(service.transition(center,author,'PLAN',documentId,dto('REOPEN')))
   .rejects.toMatchObject({status:409});
  expect(tx.planVersion.updateMany).not.toHaveBeenCalled();
 });
 it('valid internal submit creates exact-version evidence and audit history but never releases',async()=>{
  const {service,tx,trial}=setup();
  const result=await service.transition(center,author,'PLAN',documentId,dto('SUBMIT'));
  expect(trial.assertWritable).toHaveBeenCalledWith(tx,center,now);
  expect(result).toMatchObject({status:'IN_REVIEW',version:3,snapshotId:'snapshot-1'});
  expect(result.notice).toMatch(/not approved, signed or released/);
  expect(tx.governanceSnapshot.create).toHaveBeenCalledTimes(1);
  expect(tx.planVersion.updateMany).toHaveBeenCalledWith({
   where:{id:documentId,centerId:center,version:2,status:'DRAFT'},
   data:expect.objectContaining({status:'IN_REVIEW',version:{increment:1}})
  });
  expect(tx.governanceHistory.create.mock.calls[0][0].data).toMatchObject({
   centerId:center,kind:'PLAN',documentId,sourceVersion:2,
   snapshotId:'snapshot-1',fromStatus:'DRAFT',toStatus:'IN_REVIEW'
  });
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('clinical.plan_submitted');
 });
 it('frozen internal plan remains a frozen record without clinical signature',async()=>{
  const {service,tx}=setup();
  const result=await service.transition(center,author,'PLAN',documentId,dto('FREEZE'));
  expect(result.status).toBe('FROZEN_INTERNAL');
  expect(result.notice).toContain('not approved');
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('clinical.plan_freeze');
 });
 it('withdraws an in-review plan only through its original author without downstream release',async()=>{
  const {service,tx}=setup(plan({status:'IN_REVIEW'}));
  const result=await service.transition(center,author,'PLAN',documentId,dto('WITHDRAW'));
  expect(result.status).toBe('WITHDRAWN');
  expect(tx.planVersion.updateMany.mock.calls[0][0].data.status).toBe('WITHDRAWN');
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('clinical.plan_withdraw');
 });
 it('supervisor RETURN appends exact trimmed review reason to immutable history',async()=>{
  const {service,tx}=setup(plan({status:'IN_REVIEW'}));
  tx.user.findUniqueOrThrow.mockResolvedValueOnce({displayName:'Fictional Supervisor'});
  const result=await service.transition(center,reviewer,'PLAN',documentId,
   dto('RETURN',{reason:'  Fictional revision requested  '}));
  expect(result.status).toBe('RETURNED_FOR_REVISION');
  const updated=tx.planVersion.updateMany.mock.calls[0][0].data;
  expect(updated.reviewNotes).toEqual([{
   by:'fictional-reviewer',byName:'Fictional Supervisor',
   at:now.toISOString(),comment:'Fictional revision requested',kind:'returned'
  }]);
  expect(tx.centerEvent.create.mock.calls[0][0].data.type).toBe('clinical.plan_returned');
 });
 it('supervisor comment remains IN_REVIEW and does not sign the draft',async()=>{
  const {service,tx}=setup(plan({status:'IN_REVIEW'}));
  const result=await service.transition(center,reviewer,'PLAN',documentId,dto('COMMENT'));
  expect(result.status).toBe('IN_REVIEW');
  expect(tx.planVersion.updateMany.mock.calls[0][0].data.status).toBe('IN_REVIEW');
  expect(tx.planVersion.updateMany.mock.calls[0][0].data.reviewNotes[0].kind).toBe('comment');
 });
 it('failed optimistic update does not append an audit receipt or imply success',async()=>{
  const {service,tx}=setup();
  tx.planVersion.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.transition(center,author,'PLAN',documentId,dto('SUBMIT')))
   .rejects.toMatchObject({status:409});
  expect(tx.governanceHistory.create).not.toHaveBeenCalled();
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
});
