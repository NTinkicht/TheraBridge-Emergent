// M4-08: actual ChildrenService read/query scoping and restricted discovery.
// Test-only synthetic Prisma responses; real PostgreSQL integration tests
// elsewhere remain authoritative for transactional concurrency and permissions.
import {ChildrenService, childScope} from '../src/operations/children.service';
import {PrismaService} from '../src/prisma/prisma.service';
import {TrialService} from '../src/operations/trial.service';
import {InvitationsService} from '../src/centers/invitations.service';
import {AuditService} from '../src/audit/audit.service';
import {NoticesService} from '../src/operations/notices.service';
const center='fictional-centre';
const therapist={role:'THERAPIST',membershipId:'fictional-member',userId:'fictional-user'} as any;
const admin={...therapist,role:'CENTER_ADMIN'};
const coordinator={...therapist,role:'COORDINATOR'};
const child=(extras:Record<string,unknown>={})=>({
 id:'child-a',firstName:'Fictional',lastName:'Alex',preferredName:null,
 dateOfBirth:new Date('2020-01-01T00:00:00Z'),services:['speech'],
 status:'ACTIVE',guardians:[],assignments:[],appointments:[],...extras
});
const person=(extras:Record<string,unknown>={})=>({
 id:'fictional-member',user:{displayName:'Fictional Therapist'},
 specialties:['speech'],title:'Synthetic therapist',...extras
});
const make=()=>{
 const prisma:any={
  child:{findMany:jest.fn().mockResolvedValue([]),findFirst:jest.fn().mockResolvedValue(child())},
  membership:{findMany:jest.fn().mockResolvedValue([person()])}
 };
 const trial:any={now:()=>new Date('2026-11-11T09:00:00Z')};
 const service=new ChildrenService(prisma as PrismaService,trial as TrialService,
  {} as InvitationsService,{} as AuditService,{} as NoticesService);
 return {prisma,service};
};
describe('M4-08 actual child listing enforces therapist assignment scope',()=>{
 it('therapist scope restricts exactly active membership assignments',()=>{
  expect(childScope(therapist)).toEqual({
   assignments:{some:{membershipId:'fictional-member',endedAt:null}}
  });
 });
 it.each([admin,coordinator,{...therapist,role:'GUARDIAN'}])(
  'non-therapist role does not invent a therapist care-assignment predicate',v=>{
   expect(childScope(v)).toEqual({});
  });
 it('center user sees only active children by default with bounded rows',async()=>{
  const {prisma,service}=make();
  await service.list(center,admin,{} as any);
  const query=prisma.child.findMany.mock.calls[0][0];
  expect(query.where).toMatchObject({centerId:center,status:'ACTIVE'});
  expect(query.where).not.toHaveProperty('assignments');
  expect(query.take).toBe(200);
  expect(query.include.guardians.where).toMatchObject({removedAt:null});
  expect(query.include.assignments.where).toMatchObject({endedAt:null});
 });
 it('therapist sees only own active assignments, not every child in same center',async()=>{
  const {prisma,service}=make();
  await service.list(center,therapist,{} as any);
  expect(prisma.child.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,status:'ACTIVE',
   assignments:{some:{membershipId:'fictional-member',endedAt:null}}
  });
 });
 it('allows explicit archived state without leaking another tenant',async()=>{
  const {prisma,service}=make();
  await service.list(center,admin,{status:'ARCHIVED'} as any);
  expect(prisma.child.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,status:'ARCHIVED'
  });
 });
 it('searches first, last and preferred name only inside current center',async()=>{
  const {prisma,service}=make();
  await service.list(center,therapist,{q:'Alex'} as any);
  expect(prisma.child.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,OR:[
    {firstName:{contains:'Alex',mode:'insensitive'}},
    {lastName:{contains:'Alex',mode:'insensitive'}},
    {preferredName:{contains:'Alex',mode:'insensitive'}}
   ]
  });
 });
 it('does not invent optional search conditions for empty query',async()=>{
  const {prisma,service}=make();await service.list(center,admin,{q:''} as any);
  expect(prisma.child.findMany.mock.calls[0][0].where).not.toHaveProperty('OR');
 });
 it('returns safe empty state without querying unrelated center membership names',async()=>{
  const {prisma,service}=make();
  expect(await service.list(center,admin,{} as any)).toEqual({items:[]});
  expect(prisma.membership.findMany.mock.calls[0][0]).toMatchObject({where:{id:{in:[]}}});
 });
 it('renders only returned active guardian count, next visit and current assigned therapist',async()=>{
  const {prisma,service}=make();
  prisma.child.findMany.mockResolvedValueOnce([child({
   guardians:[{id:'fictional-link'}],
   assignments:[{membershipId:'fictional-member',service:'speech'}],
   appointments:[{startsAt:new Date('2026-11-12T07:00:00Z')}]
  })]);
  const result=await service.list(center,therapist,{} as any);
  expect(result.items[0]).toMatchObject({
   id:'child-a',dateOfBirth:'2020-01-01',guardians:1,
   team:[{service:'speech',name:'Fictional Therapist'}],
   nextAppointment:new Date('2026-11-12T07:00:00Z')
  });
 });
 it('missing or revoked therapist metadata does not expose a different user name',async()=>{
  const {prisma,service}=make();
  prisma.membership.findMany.mockResolvedValueOnce([]);
  prisma.child.findMany.mockResolvedValueOnce([child({
   assignments:[{membershipId:'unknown-member',service:'speech'}]
  })]);
  const result=await service.list(center,therapist,{} as any);
  expect(result.items[0].team).toEqual([{service:'speech',name:''}]);
 });
 it('child lookup always scopes to center, therapist assignments and existing record',async()=>{
  const {prisma,service}=make();
  await service.child(center,'child-a',therapist);
  expect(prisma.child.findFirst.mock.calls[0][0].where).toMatchObject({
   id:'child-a',centerId:center,assignments:{some:{membershipId:'fictional-member',endedAt:null}}
  });
  await service.child(center,'child-a');
  expect(prisma.child.findFirst.mock.calls[1][0].where).toEqual({id:'child-a',centerId:center});
 });
 it('hides missing or foreign child under the same non-enumerating 404',async()=>{
  const {prisma,service}=make();
  prisma.child.findFirst.mockResolvedValueOnce(null);
  await expect(service.child(center,'unknown',therapist)).rejects.toMatchObject({status:404});
  expect(prisma.child.findFirst).toHaveBeenCalledWith({
   where:{id:'unknown',centerId:center,assignments:{some:{membershipId:'fictional-member',endedAt:null}}}
  });
 });
 it('future birth date is rejected before any writable DB transaction',async()=>{
  const {prisma,service}=make();prisma.$transaction=jest.fn();
  await expect(service.create(center,'fictional-user',{
   firstName:'Alex',lastName:'Test',dateOfBirth:'2999-01-01',services:['speech']
  } as any)).rejects.toMatchObject({status:422});
  expect(prisma.$transaction).not.toHaveBeenCalled();
 });
});
describe('M4-08 therapist discovery respects center, active membership and pagination',()=>{
 it('unfiltered active staff list is bounded and sorted deterministically',async()=>{
  const {prisma,service}=make();
  const out=await service.therapists(center);
  expect(out).toMatchObject({hasMore:false,nextOffset:null});
  expect(out.items).toEqual([{
   membershipId:'fictional-member',displayName:'Fictional Therapist',
   title:'Synthetic therapist',specialties:['speech']
  }]);
  const query=prisma.membership.findMany.mock.calls[0][0];
  expect(query.where).toMatchObject({centerId:center,status:'ACTIVE',roles:{some:{role:'THERAPIST'}}});
  expect(query.take).toBe(101);
  expect(query.skip).toBe(0);
 });
 it('specialty and person search are constrained jointly to current center',async()=>{
  const {prisma,service}=make();
  await service.therapists(center,{service:'speech',search:'Fictional',ids:['fictional-member']});
  expect(prisma.membership.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:center,status:'ACTIVE',
   specialties:{has:'speech'},user:{displayName:{contains:'Fictional',mode:'insensitive'}},
   id:{in:['fictional-member']}
  });
 });
 it('blank optional filters do not generate an overly broad user name wildcard',async()=>{
  const {prisma,service}=make();
  await service.therapists(center,{service:'',search:''});
  const where=prisma.membership.findMany.mock.calls[0][0].where;
  expect(where).not.toHaveProperty('specialties');
  expect(where).not.toHaveProperty('user');
 });
 it('exact ID discovery retains active roles and center boundaries',async()=>{
  const {prisma,service}=make();
  await service.therapists(center,{ids:['fictional-member','different-member'],limit:2});
  expect(prisma.membership.findMany.mock.calls[0][0]).toMatchObject({
   where:{centerId:center,status:'ACTIVE',id:{in:['fictional-member','different-member']}},
   take:3
  });
 });
 it('loads next page only when there is an extra returned row',async()=>{
  const {prisma,service}=make();
  prisma.membership.findMany.mockResolvedValueOnce([
   person({id:'m1'}),person({id:'m2'}),person({id:'m3'})
  ]);
  const result=await service.therapists(center,{offset:10,limit:2});
  expect(result.items).toHaveLength(2);
  expect(result.hasMore).toBe(true);
  expect(result.nextOffset).toBe(12);
  expect(prisma.membership.findMany.mock.calls[0][0]).toMatchObject({skip:10,take:3});
 });
 it('does not expose phantom next page when last returned batch is shorter than limit',async()=>{
  const {prisma,service}=make();
  const result=await service.therapists(center,{offset:10,limit:2});
  expect(result.items).toHaveLength(1);
  expect(result.hasMore).toBe(false);
  expect(result.nextOffset).toBeNull();
 });
});
