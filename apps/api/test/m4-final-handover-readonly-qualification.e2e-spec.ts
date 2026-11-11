// M4-08: real governance operational handover read paths, explicitly read-only.
// Test original service against fictional Prisma results, without any transfer,
// consent approval, clinician signing or user account activation.
import { GovernanceService } from '../src/clinical/governance.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { TrialService } from '../src/operations/trial.service';
import { ClinicalService } from '../src/clinical/clinical.service';
import { ReportsService } from '../src/clinical/reports.service';

const center='fictional-centre',child='11111111-1111-4111-8111-111111111111';
const actor=(role='CENTER_ADMIN')=>({role,userId:'fictional-user',membershipId:'fictional-member'}) as any;
const draft=(extras:Record<string,unknown>={})=>({
 id:'fictional-proposal',centerId:center,childId:child,fromMembershipId:'fictional-from',
 toMembershipId:'fictional-to',service:'speech',reason:'Synthetic replacement',status:'PENDING_ACK',
 createdAt:new Date('2026-11-10T08:00:00Z'),version:1,...extras
});
const fake=()=>{
 const prisma:any={
  membership:{findFirst:jest.fn().mockResolvedValue({id:'fictional-member',specialties:['speech']})},
  caseloadTransferDraft:{
   findFirst:jest.fn().mockResolvedValue(draft()),
   findMany:jest.fn().mockImplementation(async args=>(args.where.status==='CANCELLED'?[]:[draft()]))
  },
  child:{findFirst:jest.fn().mockResolvedValue({status:'ACTIVE',services:['speech']})},
  careAssignment:{findFirst:jest.fn().mockResolvedValue({id:'fictional-assignment'})}
 };
 const trial:any={now:()=>new Date('2026-11-11T10:00:00Z')};
 const service=new GovernanceService(prisma as PrismaService,trial as TrialService,{} as ClinicalService,{} as ReportsService);
 return {prisma,service};
};
const envNames=['DEPLOYMENT_ENV','HANDOVER_DEMO'] as const;
let old:Record<string,string|undefined>;
beforeAll(()=>{old=Object.fromEntries(envNames.map(k=>[k,process.env[k]]));});
afterAll(()=>{for(const k of envNames)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];});
beforeEach(()=>{process.env.DEPLOYMENT_ENV='ci';process.env.HANDOVER_DEMO='true';jest.clearAllMocks();});

describe('M4-08 governance non-authorizing handover list boundaries',()=>{
 it.each(['GUARDIAN','PLATFORM_ADMIN','CLINICAL_SUPERVISOR'])('denies %s before any center data access',async role=>{
  const {prisma,service}=fake();
  await expect(service.handovers(center,actor(role))).rejects.toMatchObject({status:403});
  expect(prisma.membership.findFirst).not.toHaveBeenCalled();
 });
 it('therapist cannot query any child-scoped history even with valid child UUID',async()=>{
  const {prisma,service}=fake();
  await expect(service.handovers(center,actor('THERAPIST'),{childId:child})).rejects.toMatchObject({status:403});
  expect(prisma.membership.findFirst).not.toHaveBeenCalled();
 });
 it('therapist cannot supply paginated cancellation offsets to infer other assignments',async()=>{
  const {prisma,service}=fake();
  await expect(service.handovers(center,actor('THERAPIST'),{cancelledOffset:'0'})).rejects.toMatchObject({status:403});
  expect(prisma.caseloadTransferDraft.findMany).not.toHaveBeenCalled();
 });
 it.each(['not-a-child','00000000','../foreign',''])('manager rejects malformed child filter %s',async childId=>{
  const {prisma,service}=fake();
  await expect(service.handovers(center,actor(),{childId})).rejects.toMatchObject({status:400});
  expect(prisma.membership.findFirst).not.toHaveBeenCalled();
 });
 it.each(['-1','01','1.5','10000000','NaN',' 0 '])('manager rejects invalid pagination offset %s',async cancelledOffset=>{
  const {prisma,service}=fake();
  await expect(service.handovers(center,actor('COORDINATOR'),{cancelledOffset})).rejects.toMatchObject({status:400});
  expect(prisma.caseloadTransferDraft.findMany).not.toHaveBeenCalled();
 });
 it('disabled feature returns empty, non-authorizing list before any membership read',async()=>{
  process.env.HANDOVER_DEMO='false';const {prisma,service}=fake();
  await expect(service.handovers(center,actor())).resolves.toEqual({
   enabled:false,synthetic:true,items:[],nextCancelledOffset:null
  });
  expect(prisma.membership.findFirst).not.toHaveBeenCalled();
 });
 it.each(['production','staging'])('refuses synthetic handovers in %s even with demo flag',async DEPLOYMENT_ENV=>{
  process.env.DEPLOYMENT_ENV=DEPLOYMENT_ENV;
  const {prisma,service}=fake();
  expect(await service.handovers(center,actor('COORDINATOR'))).toMatchObject({enabled:false,items:[]});
  expect(prisma.membership.findFirst).not.toHaveBeenCalled();
 });
 it('rechecks live active center membership and refuses a revoked actor',async()=>{
  const {prisma,service}=fake();prisma.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.handovers(center,actor('THERAPIST'))).rejects.toMatchObject({status:403});
  expect(prisma.membership.findFirst.mock.calls[0][0].where).toMatchObject({
   id:'fictional-member',centerId:center,userId:'fictional-user',
   status:'ACTIVE',user:{status:'ACTIVE'},center:{status:'ACTIVE'},
   roles:{some:{role:'THERAPIST'}}
  });
  expect(prisma.caseloadTransferDraft.findMany).not.toHaveBeenCalled();
 });
 it('therapist can see only recipient-scoped proposals with no source member or child disclosure',async()=>{
  const {prisma,service}=fake();
  const response=await service.handovers(center,actor('THERAPIST'));
  expect(response.enabled).toBe(true);
  expect(response.items).toHaveLength(1);
  expect(response.items[0]).toMatchObject({
   synthetic:true,accessGranted:false,assignmentChanged:false,
   clinicalHandover:false,released:false
  });
  expect(response.items[0]).not.toHaveProperty('childId');
  expect(response.items[0]).not.toHaveProperty('fromMembershipId');
  expect(response.items[0]).not.toHaveProperty('toMembershipId');
  for(const args of prisma.caseloadTransferDraft.findMany.mock.calls){
    expect(args[0].where).toMatchObject({centerId:center,toMembershipId:'fictional-member'});
  }
 });
 it('manager sees only current center draft IDs with source and recipient metadata',async()=>{
  const {prisma,service}=fake();
  const response=await service.handovers(center,actor('CENTER_ADMIN'));
  expect(response.items).toHaveLength(1);
  expect(response.items[0]).toMatchObject({
   childId:child,fromMembershipId:'fictional-from',toMembershipId:'fictional-to',accessGranted:false
  });
  for(const args of prisma.caseloadTransferDraft.findMany.mock.calls){
    expect(args[0].where).toMatchObject({centerId:center});
    expect(args[0].where).not.toHaveProperty('toMembershipId');
  }
 });
 it('manager filters by valid child UUID and strict non-leading-zero offset',async()=>{
  const {prisma,service}=fake();
  await service.handovers(center,actor('COORDINATOR'),{childId:child,cancelledOffset:'25'});
  const where=prisma.caseloadTransferDraft.findMany.mock.calls[0][0].where;
  expect(where).toMatchObject({centerId:center,childId:child});
  const cancelled=prisma.caseloadTransferDraft.findMany.mock.calls[1][0];
  expect(cancelled).toMatchObject({skip:25,take:101});
 });
 it('returns all current active items and bounded first 100 canceled items with next-page cursor',async()=>{
  const {prisma,service}=fake();
  prisma.caseloadTransferDraft.findMany.mockImplementation(async args=>{
   if(args.where.status==='CANCELLED')return Array.from({length:101},(_,i)=>draft({id:'cancel-'+i,status:'CANCELLED'}));
   return [draft({id:'active-one',status:'PENDING_ACK'}),draft({id:'active-two',status:'ACKNOWLEDGED'})];
  });
  const response=await service.handovers(center,actor(),{cancelledOffset:'15'});
  expect(response.items).toHaveLength(102);
  expect(response.nextCancelledOffset).toBe(115);
  expect(response.items.filter(x=>x.status==='PENDING_ACK')).toHaveLength(1);
  expect(response.items.filter(x=>x.status==='ACKNOWLEDGED')).toHaveLength(1);
  expect(response.items.filter(x=>x.status==='CANCELLED')).toHaveLength(100);
  expect(response.items.every(x=>x.accessGranted===false&&x.assignmentChanged===false)).toBe(true);
 });
});

describe('M4-08 handover readiness never becomes clinical permission',()=>{
 it('rejects readiness when demo mode disabled before role or database reads',async()=>{
  process.env.HANDOVER_DEMO='false';const {prisma,service}=fake();
  await expect(service.handoverReadiness(center,actor(),'proposal')).rejects.toMatchObject({status:403});
  expect(prisma.membership.findFirst).not.toHaveBeenCalled();
 });
 it.each(['THERAPIST','GUARDIAN','CLINICAL_SUPERVISOR'])('denies %s readiness even on valid synthetic fixture',async role=>{
  const {prisma,service}=fake();
  await expect(service.handoverReadiness(center,actor(role),'proposal')).rejects.toMatchObject({status:403});
  expect(prisma.membership.findFirst).not.toHaveBeenCalled();
 });
 it('revoked manager cannot inspect target clinical handover readiness',async()=>{
  const {prisma,service}=fake();prisma.membership.findFirst.mockResolvedValueOnce(null);
  await expect(service.handoverReadiness(center,actor(),'proposal')).rejects.toMatchObject({status:403});
  expect(prisma.caseloadTransferDraft.findFirst).not.toHaveBeenCalled();
 });
 it('denies missing or foreign handover proposal without source disclosure',async()=>{
  const {prisma,service}=fake();prisma.caseloadTransferDraft.findFirst.mockResolvedValueOnce(null);
  await expect(service.handoverReadiness(center,actor(),'proposal')).rejects.toMatchObject({status:404});
  expect(prisma.caseloadTransferDraft.findFirst).toHaveBeenCalledWith({
   where:{id:'proposal',centerId:center,status:{in:['PENDING_ACK','ACKNOWLEDGED','CANCELLED']}}
  });
 });
 it('healthy operational prerequisites still refuse signed approval, consent, transfer, release',async()=>{
  const {service}=fake();
  const status=await service.handoverReadiness(center,actor(),'proposal');
  expect(status).toMatchObject({
   proposalId:'fictional-proposal',readonly:true,synthetic:true,
   readyForTransfer:false,assignmentChanged:false,accessGranted:false,
   clinicalHandover:false,released:false
  });
  const byCode=Object.fromEntries(status.checks.map(x=>[x.code,x.met]));
  expect(byCode).toMatchObject({
   PROPOSAL_OPEN:true,INCOMING_RECEIPT:false,
   CHILD_SERVICE_ACTIVE:true,SOURCE_ASSIGNMENT_ACTIVE:true,RECIPIENT_QUALIFIED:true,
   SIGNED_CLINICAL_AUTHORIZATION:false,PURPOSE_SPECIFIC_CONSENT:false,CLINICAL_HANDOVER_SCOPE:false
  });
 });
 it('an acknowledged receipt still cannot grant clinical transfer authority',async()=>{
  const {prisma,service}=fake();
  prisma.caseloadTransferDraft.findFirst.mockResolvedValueOnce(draft({status:'ACKNOWLEDGED'}));
  const result=await service.handoverReadiness(center,actor('COORDINATOR'),'proposal');
  expect(result.checks.find(x=>x.code==='INCOMING_RECEIPT')?.met).toBe(true);
  expect(result.readyForTransfer).toBe(false);
  expect(result.accessGranted).toBe(false);
 });
 it('canceled proposal stays blocked even when its original child and therapists remain active',async()=>{
  const {prisma,service}=fake();
  prisma.caseloadTransferDraft.findFirst.mockResolvedValueOnce(draft({status:'CANCELLED'}));
  const result=await service.handoverReadiness(center,actor(),'proposal');
  expect(result.checks.find(x=>x.code==='PROPOSAL_OPEN')?.met).toBe(false);
  expect(result.readyForTransfer).toBe(false);
 });
 it('inactive child, expired source assignment, unqualified recipient each fail independent prerequisite',async()=>{
  const {prisma,service}=fake();
  prisma.child.findFirst.mockResolvedValueOnce({status:'ARCHIVED',services:['speech']});
  prisma.careAssignment.findFirst.mockResolvedValueOnce(null);
  prisma.membership.findFirst.mockResolvedValueOnce({id:'manager'}).mockResolvedValueOnce({specialties:['occupational']});
  const result=await service.handoverReadiness(center,actor(),'proposal');
  const byCode=Object.fromEntries(result.checks.map(x=>[x.code,x.met]));
  expect(byCode).toMatchObject({
   CHILD_SERVICE_ACTIVE:false,SOURCE_ASSIGNMENT_ACTIVE:false,RECIPIENT_QUALIFIED:false
  });
  expect(result.readyForTransfer).toBe(false);
 });
 it('missing child and missing recipient cannot be mistaken for a qualified transfer',async()=>{
  const {prisma,service}=fake();
  prisma.child.findFirst.mockResolvedValueOnce(null);
  prisma.membership.findFirst.mockResolvedValueOnce({id:'manager'}).mockResolvedValueOnce(null);
  const result=await service.handoverReadiness(center,actor(),'proposal');
  expect(result.checks.find(x=>x.code==='CHILD_SERVICE_ACTIVE')?.met).toBe(false);
  expect(result.checks.find(x=>x.code==='RECIPIENT_QUALIFIED')?.met).toBe(false);
  expect(result.readyForTransfer).toBe(false);
 });
});
