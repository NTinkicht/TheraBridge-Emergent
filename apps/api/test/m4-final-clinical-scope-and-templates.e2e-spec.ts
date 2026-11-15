// M4-08 source-executing clinical authorization/read-model contract tests.
// Fully fictional in-memory database stubs: these assert exact Prisma access
// restrictions, not a replacement for the real-PostgreSQL tenant E2E suite.
import { ClinicalService } from '../src/clinical/clinical.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TrialService } from '../src/operations/trial.service';

const centre = 'fictional-centre';
const therapist = {role:'THERAPIST', membershipId:'fictional-member',userId:'fictional-user'} as any;
const supervisor = {...therapist,role:'CLINICAL_SUPERVISOR'};
const coordinator = {...therapist,role:'COORDINATOR'};
const sampleTemplate=(extra:Record<string,unknown>={})=>({
 id:'template-a',centerId:null,createdById:'sample-owner',
 title:'Synthetic picture matching',service:'speech',ageBand:'5-8',
 minutes:10,materials:['cards'],steps:['Match cards'],safety:['Adult supervision'],
 version:1,...extra,
});
const make=()=>{
 const db:any={
  membership:{findFirst:jest.fn().mockResolvedValue({specialties:['speech','occupational'],id:'fictional-member'})},
  careAssignment:{findMany:jest.fn().mockResolvedValue([{childId:'child-a',service:'speech',membershipId:'fictional-member'}])},
  child:{findFirst:jest.fn().mockResolvedValue({id:'child-a',centerId:centre,status:'ACTIVE',services:['speech','occupational']})},
  activityTemplate:{findMany:jest.fn().mockResolvedValue([sampleTemplate()])},
  guardianLink:{findMany:jest.fn().mockResolvedValue([])}
 };
 return {db,service:new ClinicalService(db as PrismaService,{now:()=>new Date('2026-11-11T10:00:00Z')} as TrialService)};
};

describe('M4-08 clinical staff access always rechecks live membership and assigned specialty',()=>{
 it('never loads care assignments for supervisors and coordinators',async()=>{
  const {db,service}=make();
  expect(await service.therapistAssignments(db,centre,supervisor)).toEqual([]);
  expect(await service.therapistAssignments(db,centre,coordinator)).toEqual([]);
  expect(db.membership.findFirst).not.toHaveBeenCalled();
 });
 it('requires active role, user, center and membership in the original query',async()=>{
  const {db,service}=make();
  await service.therapistAssignments(db,centre,therapist,'child-a');
  expect(db.membership.findFirst).toHaveBeenCalledWith({
   where:{id:therapist.membershipId,centerId:centre,userId:therapist.userId,status:'ACTIVE',
    user:{status:'ACTIVE'},roles:{some:{role:'THERAPIST'}}},select:{specialties:true}
  });
  expect(db.careAssignment.findMany).toHaveBeenCalledWith({
   where:{centerId:centre,membershipId:therapist.membershipId,endedAt:null,
    service:{in:['speech','occupational']},childId:'child-a'},
   select:{childId:true,service:true,membershipId:true}
  });
 });
 it('never fetches assignments if member is revoked or lacks specialties',async()=>{
  const {db,service}=make();
  for(const member of [null,{specialties:[]},{specialties:null}]){
   db.membership.findFirst.mockResolvedValueOnce(member);
   expect(await service.therapistAssignments(db,centre,therapist)).toEqual([]);
  }
  expect(db.careAssignment.findMany).not.toHaveBeenCalled();
 });
 it('does not add child restriction to an intentionally unfiltered assignment read',async()=>{
  const {db,service}=make();
  await service.therapistAssignments(db,centre,therapist);
  expect(db.careAssignment.findMany.mock.calls[0][0].where).not.toHaveProperty('childId');
 });
 it('requires real supervisor role before making any lookup',async()=>{
  const {db,service}=make();
  await expect(service.assertActiveSupervisor(db,centre,coordinator)).rejects.toMatchObject({status:403});
  expect(db.membership.findFirst).not.toHaveBeenCalled();
 });
 it('supervisor must have currently active membership with correct role and center',async()=>{
  const {db,service}=make();
  db.membership.findFirst.mockResolvedValueOnce({id:'fictional-member'});
  await expect(service.assertActiveSupervisor(db,centre,supervisor)).resolves.toBeUndefined();
  expect(db.membership.findFirst.mock.calls[0][0].where).toMatchObject({
   id:supervisor.membershipId,centerId:centre,userId:supervisor.userId,status:'ACTIVE',
   user:{status:'ACTIVE'},center:{status:'ACTIVE'},roles:{some:{role:'CLINICAL_SUPERVISOR'}}
  });
 });
 it('fails closed when supervisor context is stale or suspended',async()=>{
  const {db,service}=make();
  db.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.assertActiveSupervisor(db,centre,supervisor)).rejects.toMatchObject({status:403});
 });
 it('rejects coordinators from clinical child records before database reads',async()=>{
  const {db,service}=make();
  await expect(service.child(db,centre,coordinator,'child-a')).rejects.toMatchObject({status:403});
  expect(db.child.findFirst).not.toHaveBeenCalled();
 });
 it('hides children when therapist has no matching assignment',async()=>{
  const {db,service}=make();
  db.careAssignment.findMany.mockResolvedValueOnce([]);
  await expect(service.child(db,centre,therapist,'child-a')).rejects.toMatchObject({status:404});
  expect(db.child.findFirst).not.toHaveBeenCalled();
 });
 it('hides children if therapist is assigned another specialty only',async()=>{
  const {db,service}=make();
  await expect(service.child(db,centre,therapist,'child-a','occupational')).rejects.toMatchObject({status:404});
  expect(db.child.findFirst).not.toHaveBeenCalled();
 });
 it('supervisor does not bypass live membership revalidation when requesting child',async()=>{
  const {db,service}=make();
  db.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.child(db,centre,supervisor,'child-a')).rejects.toMatchObject({status:403});
  expect(db.child.findFirst).not.toHaveBeenCalled();
 });
 it('rejects inactive/foreign children with non-enumerating 404',async()=>{
  const {db,service}=make();
  db.child.findFirst.mockResolvedValueOnce(null);
  await expect(service.child(db,centre,therapist,'child-a')).rejects.toMatchObject({status:404});
  expect(db.child.findFirst).toHaveBeenCalledWith({where:{id:'child-a',centerId:centre,status:'ACTIVE'}});
 });
 it('rejects specialties not recorded on an otherwise assigned active child',async()=>{
  const {db,service}=make();
  db.careAssignment.findMany.mockResolvedValueOnce([{childId:'child-a',service:'occupational',membershipId:'fictional-member'}]);
  db.child.findFirst.mockResolvedValueOnce({id:'child-a',services:['speech']});
  await expect(service.child(db,centre,therapist,'child-a','occupational')).rejects.toMatchObject({status:404});
 });
 it('returns authorized child only for active assignment and matching specialty',async()=>{
  const {db,service}=make();
  await expect(service.child(db,centre,therapist,'child-a','speech')).resolves.toMatchObject({id:'child-a'});
  const {db:other,service:otherService}=make();
  await expect(otherService.child(other,centre,supervisor,'child-a')).resolves.toMatchObject({id:'child-a'});
 });
 it('refuses clinical writes for supervisors and center coordinators before opening transaction',async()=>{
  const {db,service}=make();db.$transaction=jest.fn();
  for(const actor of [supervisor,coordinator]){
   await expect(service.write(centre,actor,'child-a','speech',async()=>null)).rejects.toMatchObject({status:403});
  }
  expect(db.$transaction).not.toHaveBeenCalled();
 });
});

describe('M4-08 sample catalogue pagination and tenant-owned activity boundaries',()=>{
 it('returns only synthetic source fields and no private creator data to unauthenticated catalogue',async()=>{
  const {db,service}=make();
  expect(await service.templatePage(centre)).toEqual({
   items:[{id:'template-a',title:'Synthetic picture matching',service:'speech',ageBand:'5-8',
    minutes:10,materials:['cards'],steps:['Match cards'],safety:['Adult supervision'],
    library:'synthetic',version:1,mine:false}],hasMore:false,nextOffset:null
  });
  expect(db.activityTemplate.findMany.mock.calls[0][0].where.AND[0]).toEqual({
   OR:[{centerId:centre},{centerId:null}]
  });
 });
 it('records center-owned and mine only for authenticated matching author',async()=>{
  const {db,service}=make();
  db.activityTemplate.findMany.mockResolvedValueOnce([sampleTemplate({centerId:centre,createdById:'fictional-user'})]);
  const page=await service.templatePage(centre,therapist,{ownership:'mine',limit:1,offset:0});
  expect(page.items[0]).toMatchObject({library:'center',mine:true});
  expect(db.activityTemplate.findMany.mock.calls[0][0].where.AND).toContainEqual({
   centerId:centre,createdById:'fictional-user'
  });
 });
 it('unauthenticated mine filter remains non-authorizing by exact placeholder',async()=>{
  const {db,service}=make();
  await service.templatePage(centre,undefined,{ownership:'mine'});
  expect(db.activityTemplate.findMany.mock.calls[0][0].where.AND).toContainEqual({centerId:centre,createdById:'__none__'});
 });
 it.each([['center',{centerId:centre}],['samples',{centerId:null}]])(
  'ownership filter %s remains narrowed',async(ownership,where)=>{
   const {db,service}=make();
   await service.templatePage(centre,therapist,{ownership:ownership as 'center'|'samples'});
   expect(db.activityTemplate.findMany.mock.calls[0][0].where.AND).toContainEqual(where);
  });
 it('supports exact multi-specialty filtering and single-service filtering',async()=>{
  const {db,service}=make();
  await service.templatePage(centre,therapist,{services:['speech','occupational'],service:'speech'});
  expect(db.activityTemplate.findMany.mock.calls[0][0].where.AND).toContainEqual({service:{in:['speech','occupational']}});
  expect(db.activityTemplate.findMany.mock.calls[0][0].where.AND).toContainEqual({service:'speech'});
 });
 it.each([['language','speech'],['occupational therapy','occupational'],['behavior','behavioral'],['developmental','developmental']])(
  'catalogue search %s matches normalized specialty %s',async(search,expectedService)=>{
   const {db,service}=make();
   await service.templatePage(centre,therapist,{search});
   const conditions=db.activityTemplate.findMany.mock.calls[0][0].where.AND;
   expect(JSON.stringify(conditions)).toContain(expectedService);
   expect(conditions.some((x:any)=>x.OR?.some((y:any)=>y.service?.in?.includes(expectedService)))).toBe(true);
  });
 it('unknown query still searches exact title/age/service without expanding source scope',async()=>{
  const {db,service}=make();
  await service.templatePage(centre,therapist,{search:'fictional qzx'});
  const conditions=db.activityTemplate.findMany.mock.calls[0][0].where.AND;
  expect(conditions.at(-1).OR).toHaveLength(3);
  expect(conditions.at(-1).OR[0]).toEqual({title:{contains:'fictional qzx',mode:'insensitive'}});
 });
 it('paginates with one extra row and exposes next offset only with actual more data',async()=>{
  const {db,service}=make();
  db.activityTemplate.findMany.mockResolvedValueOnce([
   sampleTemplate(),sampleTemplate({id:'template-b'}),sampleTemplate({id:'template-c'})
  ]);
  const page=await service.templatePage(centre,therapist,{offset:4,limit:2});
  expect(page.items).toHaveLength(2);
  expect(page.hasMore).toBe(true);
  expect(page.nextOffset).toBe(6);
  expect(db.activityTemplate.findMany.mock.calls[0][0]).toMatchObject({skip:4,take:3});
 });
 it('does not claim another page when catalogue exact limit is exhausted',async()=>{
  const {db,service}=make();
  db.activityTemplate.findMany.mockResolvedValueOnce([sampleTemplate()]);
  const result=await service.templatePage(centre,therapist,{offset:4,limit:1});
  expect(result.hasMore).toBe(false);
  expect(result.nextOffset).toBeNull();
 });
 it('templates convenience route requests a bounded 200-result server-authorized read',async()=>{
  const {db,service}=make();
  await expect(service.templates(centre,therapist,['speech'])).resolves.toHaveLength(1);
  expect(db.activityTemplate.findMany.mock.calls[0][0]).toMatchObject({take:201});
 });
 it('family catalogue restricts activities to linked active children services and never returns plan content',async()=>{
  const {db,service}=make();
  db.guardianLink.findMany.mockResolvedValue([{
   child:{id:'child-a',firstName:'Synthetic Alex',preferredName:'Alex',services:['speech']}
  },{
   child:{id:'child-b',firstName:'Fictional Bea',preferredName:null,services:['occupational']}
  }]);
  db.activityTemplate.findMany.mockResolvedValue([
   sampleTemplate(),sampleTemplate({id:'template-b',service:'occupational'})
  ]);
  const out=await service.familyActivities(centre,therapist);
  expect(out).toMatchObject({sample:true,released:false});
  expect(out.children).toHaveLength(2);
  expect(out.children[0]).toMatchObject({id:'child-a',name:'Alex'});
  expect(out.children[0].activities).toHaveLength(1);
  expect(out.children[1].activities).toHaveLength(1);
  expect(db.guardianLink.findMany.mock.calls[0][0].where).toMatchObject({
   centerId:centre,userId:therapist.userId,removedAt:null,child:{status:'ACTIVE'}
  });
  expect(db.activityTemplate.findMany.mock.calls[0][0].where).toEqual({centerId:null});
 });
});
