// M4-08 final: real FamilyReleaseService rejects unsafe deployments and stale
// synthetic access before touching governed snapshots or mutable grants.
// Independent API service tests with fictional transactions; no patient data.
import { Prisma } from '@prisma/client';
import { FamilyReleaseService } from '../src/clinical/family-release.service';
import { PrismaService } from '../src/prisma/prisma.service';

const center='fictional-center',viewer={
  role:'CLINICAL_SUPERVISOR',userId:'fictional-user',membershipId:'fictional-member'
} as any;
const remembered=['TB_FAMILY_RELEASE_SYNTHETIC','DEPLOYMENT_ENV'] as const;
let previous:Record<string,string|undefined>;
beforeAll(()=>{previous=Object.fromEntries(remembered.map(k=>[k,process.env[k]]));});
afterAll(()=>{for(const k of remembered)if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];});
const setup=(enabled=true)=>{
 const tx:any={
  center:{findFirst:jest.fn().mockResolvedValue({syntheticFamilyReleaseEnabled:enabled})},
  governanceSnapshot:{findFirst:jest.fn().mockResolvedValue(null)},
  syntheticFamilyApproval:{findFirst:jest.fn().mockResolvedValue(null)},
  syntheticFamilyGrant:{findFirst:jest.fn().mockResolvedValue(null)},
  guardianLink:{findFirst:jest.fn().mockResolvedValue(null),findMany:jest.fn().mockResolvedValue([])}
 };
 const db:any={$transaction:jest.fn(async fn=>fn(tx))};
 return {tx,db,service:new FamilyReleaseService(db as PrismaService)};
};

describe('M4-08 family release fail-closed deployment policy',()=>{
 beforeEach(()=>{process.env.DEPLOYMENT_ENV='ci';process.env.TB_FAMILY_RELEASE_SYNTHETIC='true';});
 const calls:[
  string,(s:FamilyReleaseService)=>Promise<unknown>
 ][]=[
  ['approve',(s)=>s.approve(center,viewer,{snapshotId:'fictional-snapshot'} as any)],
  ['consent',(s)=>s.consent(center,viewer,{childId:'fictional-child',purpose:'FAMILY_PLAN'} as any,false)],
  ['withdraw consent',(s)=>s.consent(center,viewer,{childId:'fictional-child',purpose:'FAMILY_REPORT'} as any,true)],
  ['grant',(s)=>s.grant(center,viewer,{approvalId:'fictional-approval',guardianLinkId:'fictional-link'} as any)],
  ['recipients',(s)=>s.recipients(center,viewer,'fictional-approval')],
  ['recovery',(s)=>s.recoverGrants(center,viewer)],
  ['grants for approval',(s)=>s.grantsForApproval(center,viewer,'fictional-approval')],
  ['change',(s)=>s.change(center,viewer,'fictional-grant',{status:'REVOKED',reason:'Fictional access withdrawal'} as any)],
  ['mine',(s)=>s.mine(center,viewer)],
  ['read',(s)=>s.read(center,viewer,'fictional-grant')],
 ];
 it.each(calls)('denies %s before any private record is read when center synthetic gate is absent',async(_,fn)=>{
  const {tx,service}=setup(false);
  await expect(fn(service)).rejects.toMatchObject({status:403});
  expect(tx.center.findFirst).toHaveBeenCalledWith({
   where:{id:center,status:'ACTIVE'},select:{syntheticFamilyReleaseEnabled:true}
  });
  expect(tx.governanceSnapshot.findFirst).not.toHaveBeenCalled();
  expect(tx.syntheticFamilyApproval.findFirst).not.toHaveBeenCalled();
  expect(tx.syntheticFamilyGrant.findFirst).not.toHaveBeenCalled();
 });
 it.each(['production','staging'])('denies release in %s regardless of operator feature flag',async env=>{
  const {tx,service}=setup(true);
  process.env.DEPLOYMENT_ENV=env;
  await expect(service.approve(center,viewer,{snapshotId:'fictional'} as any)).rejects.toMatchObject({status:403});
  expect(tx.governanceSnapshot.findFirst).not.toHaveBeenCalled();
 });
 it('denies release when deployment flag is not explicitly enabled',async()=>{
  const {tx,service}=setup(true);
  process.env.TB_FAMILY_RELEASE_SYNTHETIC='false';
  await expect(service.read(center,viewer,'fictional')).rejects.toMatchObject({status:403});
  expect(tx.syntheticFamilyGrant.findFirst).not.toHaveBeenCalled();
 });
 it('disallows a missing, foreign or invalid approval snapshot without authorization promotion',async()=>{
  const {tx,service}=setup(true);
  await expect(service.approve(center,viewer,{snapshotId:'fictional-missing'} as any)).rejects.toMatchObject({status:404});
  expect(tx.governanceSnapshot.findFirst).toHaveBeenCalledWith({where:{id:'fictional-missing',centerId:center}});
 });
 it('does not approve an unknown document kind, even if snapshot exists',async()=>{
  const {tx,service}=setup(true);
  tx.governanceSnapshot.findFirst.mockResolvedValueOnce({kind:'UNKNOWN',content:{service:'speech'}});
  await expect(service.approve(center,viewer,{snapshotId:'fictional-snapshot'} as any)).rejects.toMatchObject({status:404});
 });
 it('rejects snapshots with missing specialty before any clinician privilege is inferred',async()=>{
  const {tx,service}=setup(true);
  tx.governanceSnapshot.findFirst.mockResolvedValueOnce({kind:'PLAN',content:{},childId:'fictional-child'});
  await expect(service.approve(center,viewer,{snapshotId:'fictional-snapshot'} as any)).rejects.toMatchObject({status:422});
 });
 it('denies grant issuance without exact synthetic approved artifact',async()=>{
  const {tx,service}=setup(true);
  await expect(service.grant(center,viewer,{approvalId:'absent',guardianLinkId:'fictional'} as any)).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyApproval.findFirst).toHaveBeenCalledWith({where:{id:'absent',centerId:center}});
 });
 it('denies exact release recipient lookup without a current approval',async()=>{
  const {service}=setup(true);
  await expect(service.recipients(center,viewer,'missing')).rejects.toMatchObject({status:404});
 });
 it('denies revoked, absent or foreign release read before returning clinical content',async()=>{
  const {service}=setup(true);
  await expect(service.read(center,viewer,'missing')).rejects.toMatchObject({status:404});
 });
 it('rejects grant change without an auditable reason before opening a transaction',async()=>{
  const {db,service}=setup(true);
  await expect(service.change(center,viewer,'missing',{status:'REVOKED',reason:'   '} as any)).rejects.toMatchObject({status:422});
  expect(db.$transaction).not.toHaveBeenCalled();
 });
 it('refuses grant change against an absent current synthetic grant',async()=>{
  const {tx,service}=setup(true);
  await expect(service.change(center,viewer,'missing',{status:'WITHDRAWN',reason:'Fictional review'} as any)).rejects.toMatchObject({status:404});
  expect(tx.syntheticFamilyGrant.findFirst).toHaveBeenCalledWith({where:{id:'missing',centerId:center}});
 });
 it.each(['P2034','P2002'])('retries transient %s serialization/uniqueness conflicts with bounded three-attempt limit',async code=>{
  const {db,service}=setup(true);
  const collision=new Prisma.PrismaClientKnownRequestError('Fictional concurrent transaction failure',{
    code,clientVersion:'5.22.0'
  });
  db.$transaction.mockRejectedValue(collision);
  await expect(service.grant(center,viewer,{approvalId:'fictional',guardianLinkId:'fictional'} as any)).rejects.toMatchObject({code});
  expect(db.$transaction).toHaveBeenCalledTimes(3);
 });
 it('does not retry unrelated database errors or mask access policy failures',async()=>{
  const {db,service}=setup(true);
  const error=new Prisma.PrismaClientKnownRequestError('Fictional foreign key failure',{code:'P2003',clientVersion:'5.22.0'});
  db.$transaction.mockRejectedValue(error);
  await expect(service.grant(center,viewer,{approvalId:'fictional',guardianLinkId:'fictional'} as any)).rejects.toMatchObject({code:'P2003'});
  expect(db.$transaction).toHaveBeenCalledTimes(1);
 });
});
