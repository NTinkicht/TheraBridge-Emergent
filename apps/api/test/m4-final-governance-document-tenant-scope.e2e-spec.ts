// M4-08: original governance document index, read projections and actor scope.
// All responses are fictional. The query predicates protect tenant/assignment
// boundaries; this fixture cannot grant any clinical approval.
import {GovernanceService} from '../src/clinical/governance.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
import {ClinicalService} from '../src/clinical/clinical.service';
import {ReportsService} from '../src/clinical/reports.service';
const center='fictional-centre';
const therapist={role:'THERAPIST',userId:'synthetic-therapist',membershipId:'member-1'} as any;
const supervisor={...therapist,role:'CLINICAL_SUPERVISOR'};
const plan=(extra:Record<string,unknown>={})=>({
 id:'plan-version-1',centerId:center,authorId:'synthetic-therapist',
 version:3,status:'DRAFT',plan:{title:'Synthetic therapy plan',childId:'child-a',centerId:center,service:'speech'},...extra
});
const report=(extra:Record<string,unknown>={})=>({
 id:'report-a',centerId:center,childId:'child-a',membershipId:'member-1',
 version:2,status:'IN_REVIEW',title:'Synthetic weekly report',...extra
});
const child=(extra:Record<string,unknown>={})=>({
 id:'child-a',firstName:'Fictional',lastName:'Alex',preferredName:null,...extra
});
const setup=(assignments:any[]=[{childId:'child-a',service:'speech',membershipId:'member-1'}])=>{
 const tx:any={
  $queryRaw:jest.fn().mockResolvedValue([{id:'fictional-lock'}]),
  membership:{findFirst:jest.fn().mockResolvedValue({id:'member-1'})},
  planVersion:{findMany:jest.fn().mockResolvedValue([plan()]),findFirst:jest.fn().mockResolvedValue(plan())},
  progressReport:{findMany:jest.fn().mockResolvedValue([report()]),findFirst:jest.fn().mockResolvedValue(report())},
  user:{findMany:jest.fn().mockResolvedValue([
   {id:'synthetic-therapist',displayName:'Fictional Clinician',memberships:[{id:'member-1'}]}
  ])},
  child:{findMany:jest.fn().mockResolvedValue([child()])},
  governanceHistory:{findMany:jest.fn().mockResolvedValue([])}
 };
 const prisma:any={$transaction:jest.fn(async(fn:any)=>fn(tx))};
 const clinical:any={
  therapistAssignments:jest.fn().mockResolvedValue(assignments),
  child:jest.fn().mockResolvedValue(child())
 };
 const trial:any={now:()=>new Date('2026-11-11T10:00:00Z')};
 const service=new GovernanceService(prisma as PrismaService,trial as TrialService,
  clinical as ClinicalService,{} as ReportsService);
 return {service,tx,clinical,prisma};
};
describe('M4-08 original governance documents fail-closed role and tenant scope',()=>{
 it('guardian cannot enumerate document list or acquire a membership lock',async()=>{
  const {service,tx,prisma}=setup();
  await expect(service.documents(center,{...therapist,role:'GUARDIAN'})).rejects.toMatchObject({status:403});
  expect(tx.membership.findFirst).not.toHaveBeenCalled();
  expect(tx.planVersion.findMany).not.toHaveBeenCalled();
  expect(tx.progressReport.findMany).not.toHaveBeenCalled();
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
 });
 it('supervisor has live membership checks and list stays restricted to exact center',async()=>{
  const {service,tx,clinical}=setup();
  const result=await service.documents(center,supervisor);
  expect(clinical.therapistAssignments).not.toHaveBeenCalled();
  expect(tx.planVersion.findMany.mock.calls[0][0].where).toEqual({centerId:center,plan:{centerId:center}});
  expect(tx.progressReport.findMany.mock.calls[0][0].where).toEqual({centerId:center});
  expect(result.items).toHaveLength(2);
  expect(result.notice).toMatch(/not approved, signed or released/);
 });
 it('therapist query restricts both plans and reports by active service/child assignment',async()=>{
  const {service,tx,clinical}=setup();
  const result=await service.documents(center,therapist);
  expect(clinical.therapistAssignments).toHaveBeenCalledWith(tx,center,therapist);
  const expected={OR:[{childId:'child-a',service:'speech'}]};
  expect(tx.planVersion.findMany.mock.calls[0][0].where).toEqual({
   centerId:center,plan:{centerId:center,...expected}
  });
  expect(tx.progressReport.findMany.mock.calls[0][0].where).toEqual({
   centerId:center,...expected
  });
  expect(result.items).toHaveLength(2);
 });
 it('therapist without assignments never causes unscoped index scans',async()=>{
  const {service,tx}=setup([]);
  await service.documents(center,therapist);
  const impossible={OR:[{childId:'00000000-0000-0000-0000-000000000000'}]};
  expect(tx.planVersion.findMany.mock.calls[0][0].where).toEqual({
   centerId:center,plan:{centerId:center,...impossible}
  });
  expect(tx.progressReport.findMany.mock.calls[0][0].where).toEqual({centerId:center,...impossible});
 });
 it('multiple staff assignments limit exact service pairs instead of OR by child alone',async()=>{
  const {service,tx}=setup([
   {childId:'child-a',service:'speech',membershipId:'member-1'},
   {childId:'child-b',service:'occupational',membershipId:'member-1'}
  ]);
  await service.documents(center,therapist);
  const scope=tx.progressReport.findMany.mock.calls[0][0].where.OR;
  expect(scope).toEqual([{childId:'child-a',service:'speech'},{childId:'child-b',service:'occupational'}]);
 });
 it('excludes archived children even if stale plans/reports still exist',async()=>{
  const {service,tx}=setup();
  tx.child.findMany.mockResolvedValueOnce([]);
  expect((await service.documents(center,supervisor)).items).toEqual([]);
  expect(tx.child.findMany).toHaveBeenCalledWith({
   where:{centerId:center,status:'ACTIVE'},
   select:{id:true,firstName:true,lastName:true,preferredName:true}
  });
 });
 it('uses preferred name only from active authorized center child projections',async()=>{
  const {service,tx}=setup();
  tx.child.findMany.mockResolvedValueOnce([child({preferredName:'Alex'})]);
  const result=await service.documents(center,therapist);
  expect(result.items.map(x=>x.childName)).toEqual(['Alex Alex','Alex Alex']);
  expect(result.items.every(x=>x.childId==='child-a')).toBe(true);
 });
 it('does not invent identity for missing author or unknown report membership',async()=>{
  const {service,tx}=setup();
  tx.user.findMany.mockResolvedValueOnce([]);
  const result=await service.documents(center,therapist);
  expect(result.items.map(x=>x.authorName)).toEqual(['Staff member','Staff member']);
 });
 it('plan mine attribution compares exact user author, report mine compares actual assigned membership',async()=>{
  const {service,tx}=setup();
  tx.planVersion.findMany.mockResolvedValueOnce([plan({authorId:'another-user'})]);
  tx.progressReport.findMany.mockResolvedValueOnce([report({membershipId:'another-member'})]);
  const result=await service.documents(center,therapist);
  expect(result.items).toHaveLength(2);
  expect(result.items.every(x=>x.mine===false)).toBe(true);
 });
 it('unauthorized stale membership denies the whole list, never converts it to an empty authorized index',async()=>{
  const {service,tx}=setup();
  tx.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.documents(center,therapist)).rejects.toMatchObject({status:403});
  expect(tx.planVersion.findMany).not.toHaveBeenCalled();
 });
 it('returns no fabricated history when ledger is empty, but still validates document permissions',async()=>{
  const {service,tx,clinical}=setup();
  const result=await service.history(center,therapist,'PLAN','plan-version-1');
  expect(result).toEqual({items:[]});
  expect(tx.planVersion.findFirst).toHaveBeenCalledWith({
   where:{id:'plan-version-1',centerId:center,plan:{centerId:center}},
   include:{plan:true}
  });
  expect(clinical.child).toHaveBeenCalledWith(tx,center,therapist,'child-a','speech');
  expect(tx.governanceHistory.findMany).toHaveBeenCalledWith({
   where:{centerId:center,kind:'PLAN',documentId:'plan-version-1'},
   orderBy:{sourceVersion:'desc'}
  });
 });
 it('rejects unsupported history document kinds before any ledger enumeration',async()=>{
  const {service,tx}=setup();
  await expect(service.history(center,therapist,'UNRECOGNIZED','fictional')).rejects.toMatchObject({status:404});
  expect(tx.governanceHistory.findMany).not.toHaveBeenCalled();
 });
 it('history resolves operator names only from returned actors; missing actors become generic staff',async()=>{
  const {service,tx}=setup();
  tx.governanceHistory.findMany.mockResolvedValueOnce([
   {id:'entry-a',actorId:'known-actor',sourceVersion:3},
   {id:'entry-b',actorId:'former-actor',sourceVersion:2}
  ]);
  tx.user.findMany.mockResolvedValueOnce([{id:'known-actor',displayName:'Fictional Operator'}]);
  const history=await service.history(center,therapist,'PLAN','plan-version-1');
  expect(history.items).toEqual([
   {id:'entry-a',actorId:'known-actor',sourceVersion:3,actorName:'Fictional Operator'},
   {id:'entry-b',actorId:'former-actor',sourceVersion:2,actorName:'Staff member'}
  ]);
 });
});
