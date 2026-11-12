// M4-08: real source-executing synthetic home-plan request matrix.
// These requests never create, approve, sign or distribute a clinical care plan.
import {HomePlanRequestsService,homePlanRequestsEnabled} from '../src/clinical/home-plan-requests.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
const center='fictional-center',child='fictional-child',linkId='fictional-guardian-link';
const now=new Date('2026-11-11T12:00:00Z');
const guardian={role:'GUARDIAN',membershipId:'guardian-member',userId:'guardian-user'} as any;
const therapist={role:'THERAPIST',membershipId:'therapist-member',userId:'therapist-user'} as any;
const request={childId:child,service:'speech',requestKey:'fictional-request-key'} as any;
const row=(more:Record<string,unknown>={})=>({
 id:'request-a',centerId:center,guardianLinkId:linkId,childId:child,service:'speech',
 status:'PENDING',createdAt:now,respondedAt:null,...more});
let prev:{flag:string|undefined;stage:string|undefined};
beforeAll(()=>{prev={flag:process.env.HOME_PLAN_REQUESTS_DEMO,stage:process.env.DEPLOYMENT_ENV}});
afterAll(()=>{if(prev.flag===undefined)delete process.env.HOME_PLAN_REQUESTS_DEMO;else process.env.HOME_PLAN_REQUESTS_DEMO=prev.flag;
 if(prev.stage===undefined)delete process.env.DEPLOYMENT_ENV;else process.env.DEPLOYMENT_ENV=prev.stage;});
beforeEach(()=>{process.env.HOME_PLAN_REQUESTS_DEMO='true';process.env.DEPLOYMENT_ENV='test'});
const make=()=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:'fictional-lock'}]),
  center:{findUnique:jest.fn().mockResolvedValue({id:center,status:'ACTIVE',trialEndsAt:new Date('2030-01-01')})},
  centerEvent:{create:jest.fn().mockResolvedValue({id:'fictional-event'})},
  membership:{findFirst:jest.fn().mockResolvedValue({id:'active',specialties:['speech']})},
  careAssignment:{findMany:jest.fn().mockResolvedValue([{membershipId:'therapist-member'}])},
  guardianLink:{
   findFirst:jest.fn().mockResolvedValue({id:linkId,child:{id:child,services:['speech']}}),
   findMany:jest.fn().mockResolvedValue([{
    id:linkId,child:{id:child,firstName:'Fictional',preferredName:null,services:['speech']}
   }])
  },
  homePlanRequest:{
   findMany:jest.fn().mockResolvedValue([]),
   findUnique:jest.fn().mockResolvedValue(null),
   findUniqueOrThrow:jest.fn().mockResolvedValue(row()),
   findFirst:jest.fn().mockResolvedValue(row()),
   createMany:jest.fn().mockResolvedValue({count:1}),
   updateMany:jest.fn().mockResolvedValue({count:1})
  }
 };
 const db:any={...tx,$transaction:jest.fn(async(fn:any)=>fn(tx))};
 const trial:any={now:()=>now};
 return {tx,db,service:new HomePlanRequestsService(db as PrismaService,trial as TrialService)};
};
describe('M4-08 synthetic home-plan gate never opens production signing',()=>{
 it.each(['production','staging'])('%s cannot use demo request mutations, despite leaked flag',async stage=>{
  process.env.DEPLOYMENT_ENV=stage;
  expect(homePlanRequestsEnabled()).toBe(false);
  const {service,db}=make();
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:403});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('missing demo flag returns explicit empty guardian list without querying private children',async()=>{
  delete process.env.HOME_PLAN_REQUESTS_DEMO;
  const {service,tx}=make();const r=await service.guardianList(center,guardian);
  expect(r).toEqual({synthetic:true,released:false,enabled:false,children:[],items:[]});
  expect(tx.guardianLink.findMany).not.toHaveBeenCalled();
 });
 it('role-mismatched guardian list never enumerates another user',async()=>{
  const {service}=make();
  await expect(service.guardianList(center,therapist)).rejects.toMatchObject({status:403});
 });
 it('revoked guardian membership prevents viewing prior private requests',async()=>{
  const {service,tx}=make();tx.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.guardianList(center,guardian)).rejects.toMatchObject({status:403});
  expect(tx.guardianLink.findMany).not.toHaveBeenCalled();
 });
 it('guardian pending requests are not hidden by 100 historical response cap',async()=>{
  const {service,tx}=make();
  tx.homePlanRequest.findMany.mockResolvedValueOnce([row()]).mockResolvedValueOnce([row({id:'answered',status:'ANSWERED'})]);
  const r=await service.guardianList(center,guardian);
  expect(r.items).toHaveLength(2);
  expect(r.items[0]).toMatchObject({synthetic:true,released:false,clinicalAuthorization:false});
  expect(tx.homePlanRequest.findMany.mock.calls[0][0].where.guardianLinkId.in).toEqual([linkId]);
  expect(tx.homePlanRequest.findMany.mock.calls[1][0].take).toBe(100);
 });
 it('empty linked children cannot widen guardian request list to all center patients',async()=>{
  const {service,tx}=make();tx.guardianLink.findMany.mockResolvedValueOnce([]);
  const r=await service.guardianList(center,guardian);
  expect(r.children).toEqual([]);
  expect(tx.homePlanRequest.findMany.mock.calls[0][0].where.guardianLinkId).toEqual({in:[]});
 });
 it('guardian cannot submit if center disappeared after lock',async()=>{
  const {service,tx}=make();tx.center.findUnique.mockResolvedValueOnce(null);
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:404});
  expect(tx.homePlanRequest.createMany).not.toHaveBeenCalled();
 });
 it('revoked guardian link cannot submit pending request',async()=>{
  const {service,tx}=make();tx.$queryRaw.mockResolvedValueOnce([{id:'center'}]).mockResolvedValueOnce([]);
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:404});
 });
 it('child without selected specialty cannot request a plan',async()=>{
  const {service,tx}=make();tx.guardianLink.findFirst.mockResolvedValueOnce({
   id:linkId,child:{id:child,services:['occupational']}
  });
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:422});
 });
 it('no active therapist assignment stops request before creating duplicate key',async()=>{
  const {service,tx}=make();tx.careAssignment.findMany.mockResolvedValueOnce([]);
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:422});
  expect(tx.homePlanRequest.createMany).not.toHaveBeenCalled();
 });
 it('assignment without live authorized therapist cannot accept home-plan request',async()=>{
  const {service,tx}=make();tx.membership.findFirst
   .mockResolvedValueOnce({id:'guardian-live'})
   .mockResolvedValueOnce(null);
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:422});
 });
 it('same request key is replayed only for exact authorized recipient/specialty',async()=>{
  const {service,tx}=make();tx.homePlanRequest.findUnique.mockResolvedValueOnce(row());
  const r=await service.create(center,guardian,request);
  expect(r).toMatchObject({replayed:true,released:false,clinicalAuthorization:false});
  expect(tx.homePlanRequest.createMany).not.toHaveBeenCalled();
 });
 it.each([{centerId:'other-center'},{guardianLinkId:'another-link'},{service:'occupational'},
   {childId:'foreign-child'}])('request key collision %j is refused rather than attributed to this family',async change=>{
  const {service,tx}=make();tx.homePlanRequest.findUnique.mockResolvedValueOnce(row(change));
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:409});
  expect(tx.homePlanRequest.createMany).not.toHaveBeenCalled();
 });
 it('duplicate insertion with verified same idempotent key returns exact existing record',async()=>{
  const {service,tx}=make();tx.homePlanRequest.createMany.mockResolvedValueOnce({count:0});
  tx.homePlanRequest.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row());
  const r=await service.create(center,guardian,request);
  expect(r).toMatchObject({replayed:true,synthetic:true,released:false});
 });
 it('duplicate insertion with no existing key requires refresh rather than claiming success',async()=>{
  const {service,tx}=make();tx.homePlanRequest.createMany.mockResolvedValueOnce({count:0});
  tx.homePlanRequest.findUnique.mockResolvedValue(null);
  tx.homePlanRequest.findFirst.mockResolvedValueOnce(null);
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:409});
 });
 it('different request key while pending never returns a misleading success',async()=>{
  const {service,tx}=make();tx.homePlanRequest.createMany.mockResolvedValueOnce({count:0});
  tx.homePlanRequest.findUnique.mockResolvedValue(null);
  await expect(service.create(center,guardian,request)).rejects.toMatchObject({status:409});
 });
 it('new synthetic request stores only queued status, not signed release',async()=>{
  const {service,tx}=make();
  const r=await service.create(center,guardian,request);
  expect(r).toMatchObject({status:'PENDING',replayed:false,synthetic:true,released:false});
  expect(tx.homePlanRequest.createMany.mock.calls[0][0].data[0]).toMatchObject({
   centerId:center,childId:child,guardianLinkId:linkId,service:'speech'
  });
  expect(tx.centerEvent.create).toHaveBeenCalledTimes(1);
 });
});
describe('M4-08 therapist inbox keeps exact child/specialty and revoked assignments separate',()=>{
 it('nontherapist cannot read assigned requests',async()=>{
  const {service,tx}=make();
  await expect(service.clinicianList(center,guardian)).rejects.toMatchObject({status:403});
  expect(tx.homePlanRequest.findMany).not.toHaveBeenCalled();
 });
 it('revoked membership prevents request inbox despite historical assignment',async()=>{
  const {service,tx}=make();tx.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.clinicianList(center,therapist)).rejects.toMatchObject({status:403});
 });
 it('no current care assignment uses impossible UUID rather than broad tenant OR',async()=>{
  const {service,tx}=make();tx.careAssignment.findMany.mockResolvedValueOnce([]);
  const r=await service.clinicianList(center,therapist);
  expect(r.items).toEqual([]);
  expect(tx.homePlanRequest.findMany.mock.calls[0][0].where.OR)
   .toEqual([{id:'00000000-0000-0000-0000-000000000000'}]);
 });
 it('specialty removed from therapist profile cannot read old assignment requests',async()=>{
  const {service,tx}=make();tx.membership.findFirst.mockResolvedValueOnce({
   id:'live',specialties:['occupational']
  });
  await service.clinicianList(center,therapist);
  expect(tx.homePlanRequest.findMany.mock.calls[0][0].where.OR)
   .toEqual([{id:'00000000-0000-0000-0000-000000000000'}]);
 });
 it('inbox returns active pending first, with only exact specialty and authorized child',async()=>{
  const {service,tx}=make();tx.homePlanRequest.findMany
   .mockResolvedValueOnce([{...row(),child:{firstName:'Fictional',preferredName:'A'}}])
   .mockResolvedValueOnce([]);
  const r=await service.clinicianList(center,therapist);
  expect(r.items[0]).toMatchObject({childName:'A',released:false,status:'PENDING'});
  expect(tx.homePlanRequest.findMany.mock.calls[0][0].where.OR)
   .toEqual([{childId:child,service:'speech'}]);
 });
 it('no response permitted outside active clinical membership',async()=>{
  const {service,db}=make();await expect(service.respond(center,guardian,'request-a',{
   status:'ACKNOWLEDGED'} as any)).rejects.toMatchObject({status:403});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('expired demo gate denies therapist reply without changing source record',async()=>{
  delete process.env.HOME_PLAN_REQUESTS_DEMO;
  const {service,db}=make();await expect(service.respond(center,therapist,'request-a',{
   status:'ACKNOWLEDGED'} as any)).rejects.toMatchObject({status:403});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('no locked active therapist membership rejects response before fetching request',async()=>{
  const {service,tx}=make();tx.$queryRaw.mockResolvedValueOnce([{id:'center'}]).mockResolvedValueOnce([]);
  await expect(service.respond(center,therapist,'request-a',{status:'ACKNOWLEDGED'} as any))
   .rejects.toMatchObject({status:403});
  expect(tx.homePlanRequest.findFirst).not.toHaveBeenCalled();
 });
 it('missing request is not accessible even with a valid active membership',async()=>{
  const {service,tx}=make();tx.homePlanRequest.findFirst.mockResolvedValueOnce(null);
  await expect(service.respond(center,therapist,'request-a',{status:'ACKNOWLEDGED'} as any))
   .rejects.toMatchObject({status:404});
 });
 it('revoked therapist assignment lock prevents response',async()=>{
  const {service,tx}=make();tx.$queryRaw.mockResolvedValueOnce([{id:'center'}])
   .mockResolvedValueOnce([{id:'member'}]).mockResolvedValueOnce([]);
  await expect(service.respond(center,therapist,'request-a',{status:'ACKNOWLEDGED'} as any))
   .rejects.toMatchObject({status:404});
 });
 it('removed guardian link cannot receive a late therapist response',async()=>{
  const {service,tx}=make();tx.$queryRaw.mockResolvedValueOnce([{id:'center'}])
   .mockResolvedValueOnce([{id:'member'}]).mockResolvedValueOnce([{id:'assignment'}])
   .mockResolvedValueOnce([]);
  await expect(service.respond(center,therapist,'request-a',{status:'ACKNOWLEDGED'} as any))
   .rejects.toMatchObject({status:404});
  expect(tx.homePlanRequest.updateMany).not.toHaveBeenCalled();
 });
 it('already answered request does not create another clinical decision',async()=>{
  const {service,tx}=make();tx.homePlanRequest.findFirst.mockResolvedValueOnce(row({status:'ACKNOWLEDGED'}));
  await expect(service.respond(center,therapist,'request-a',{status:'ACKNOWLEDGED'} as any))
   .rejects.toMatchObject({status:409});
 });
 it('concurrent response race returns conflict, not success',async()=>{
  const {service,tx}=make();tx.homePlanRequest.updateMany.mockResolvedValueOnce({count:0});
  await expect(service.respond(center,therapist,'request-a',{status:'ACKNOWLEDGED'} as any))
   .rejects.toMatchObject({status:409});
  expect(tx.centerEvent.create).not.toHaveBeenCalled();
 });
 it('responding records only unsigned synthetic status and exact actor',async()=>{
  const {service,tx}=make();const r=await service.respond(center,therapist,'request-a',{
   status:'ACKNOWLEDGED'} as any);
  expect(r).toMatchObject({id:'request-a',synthetic:true,released:false,clinicalAuthorization:false});
  expect(tx.homePlanRequest.updateMany.mock.calls[0][0].data)
   .toMatchObject({status:'ACKNOWLEDGED',respondedAt:now,respondedById:therapist.membershipId});
 });
});
