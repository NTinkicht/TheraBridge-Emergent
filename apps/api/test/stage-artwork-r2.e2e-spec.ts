import { PrismaClient } from '@prisma/client';
import { stageArtworkR2,stageArtworkR2Batch } from '../src/cli/stage-artwork-r2';
import * as storage from '../src/common/private-r2';
import * as envelope from '../src/common/private-envelope';
import * as png from '../src/clinical/activity-media-png-integrity';
import * as reference from '../src/clinical/generated-artwork-reference';

jest.mock('@prisma/client',()=>({...jest.requireActual('@prisma/client'),PrismaClient:jest.fn()}));
describe('operator R2 promotion — synthetic fixture only',()=>{
 const id='00000000-0000-4000-8000-000000000001',centerId='00000000-0000-4000-8000-000000000002',
   tid='00000000-0000-4000-8000-000000000003',did='00000000-0000-4000-8000-000000000004';
 const bytes=Buffer.alloc(50,7),digest='a'.repeat(64),pointer=storage.privateR2Pointer(centerId,id,bytes);
 const template={id:tid,centerId,version:2,service:'speech'};
 const mediaDraft={id:did,centerId,templateId:tid,templateVersion:2,version:1,state:'DRAFT',sourceType:'GENERATED',
   styleVersion:'m5-b-v1',service:'speech',sourceReference:'locked',sceneType:'home-support'};
 const candidate={id,centerId,templateId:tid,templateVersion:2,mediaDraftId:did,mediaDraft,template,
   scannerName:'ClamAV',scannerVersion:'fixture',digestSha256:digest,width:400,height:300,
   encryptedBytes:bytes,r2CipherSha256:null,r2CipherBytes:null};
 const env={DEPLOYMENT_ENV:'demo',TB_ARTWORK_R2_IMPORT_ALLOWED:'true',
  TB_R2_ENDPOINT:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',TB_R2_BUCKET:'therabridge-demo-media',
  TB_R2_REGION:'auto',TB_R2_ACCESS_KEY_ID:'b'.repeat(32),TB_R2_SECRET_ACCESS_KEY:'c'.repeat(64),
  TB_R2_IMPORT_ACCESS_KEY_ID:'d'.repeat(32),TB_R2_IMPORT_SECRET_ACCESS_KEY:'e'.repeat(64)};
 const old=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));
 let prisma:any,tx:any,stage:jest.SpyInstance,read:jest.SpyInstance,verify:jest.SpyInstance,ref:jest.SpyInstance;
 beforeEach(()=>{
  Object.assign(process.env,env);
  tx={$queryRaw:jest.fn().mockResolvedValue([]),privateMediaCandidate:{
    findFirst:jest.fn().mockResolvedValue(candidate),update:jest.fn().mockResolvedValue(candidate)}};
  prisma={privateMediaCandidate:{findFirst:jest.fn().mockResolvedValue(candidate)},
    $transaction:jest.fn(async fn=>fn(tx)),$disconnect:jest.fn().mockResolvedValue(undefined)};
  (PrismaClient as jest.Mock).mockReturnValue(prisma);
  stage=jest.spyOn(storage,'stagePrivateR2').mockResolvedValue(undefined);
  read=jest.spyOn(storage,'readPrivateR2').mockResolvedValue(bytes);
  jest.spyOn(envelope,'openPrivateData').mockReturnValue(Buffer.alloc(20));
  verify=jest.spyOn(png,'verifyPngCandidate').mockReturnValue({sha256:digest,width:400,height:300} as never);
  ref=jest.spyOn(reference,'generatedReferenceDigest').mockReturnValue(digest);
  jest.spyOn(reference,'assertGeneratedReferenceScope').mockImplementation(()=>{});
  jest.spyOn(console,'log').mockImplementation(()=>{});
 });
 afterEach(()=>{
  jest.restoreAllMocks();(PrismaClient as jest.Mock).mockReset();
  for(const [k,v] of Object.entries(old)) {if(v===undefined)delete process.env[k];else process.env[k]=v;}
 });
 it('checks preconditions and never opens a database connection on unauthorized invocation',async()=>{
  for(const args of [[],[id,'extra'],['bad']])await expect(stageArtworkR2(args)).rejects.toThrow('not authorized');
  process.env.TB_ARTWORK_R2_IMPORT_ALLOWED='false';await expect(stageArtworkR2([id])).rejects.toThrow('not authorized');
  process.env.TB_ARTWORK_R2_IMPORT_ALLOWED='true';process.env.DEPLOYMENT_ENV='production';
  await expect(stageArtworkR2([id])).rejects.toThrow('not authorized');
  delete process.env.DEPLOYMENT_ENV;await expect(stageArtworkR2([id])).rejects.toThrow('not authorized');
  process.env.DEPLOYMENT_ENV='demo';process.env.TB_R2_IMPORT_ACCESS_KEY_ID=env.TB_R2_ACCESS_KEY_ID;
  await expect(stageArtworkR2([id])).rejects.toThrow('Separate import credential');
  expect(PrismaClient).not.toHaveBeenCalled();
 });
 it.each([
  null,{mediaDraft:null},{template:null},{templateId:null},
  {mediaDraft:{...mediaDraft,centerId:'foreign'}},{template:{...template,centerId:'foreign'}},
  {mediaDraft:{...mediaDraft,templateId:'foreign'}},{templateVersion:3},
  {mediaDraft:{...mediaDraft,templateVersion:3}},{mediaDraft:{...mediaDraft,state:'REJECTED'}},
  {mediaDraft:{...mediaDraft,sourceType:'ORIGINAL'}},{mediaDraft:{...mediaDraft,styleVersion:'other'}},
  {mediaDraft:{...mediaDraft,service:'physical'}},{scannerName:'untrusted'},{scannerVersion:''},
 ].map(x=>[x]))('denies invalid candidate scope or scan %j',async patch=>{
  prisma.privateMediaCandidate.findFirst.mockResolvedValueOnce(patch===null?null:{...candidate,...patch});
  await expect(stageArtworkR2([id])).rejects.toThrow('not eligible');
  expect(stage).not.toHaveBeenCalled();expect(prisma.$disconnect).toHaveBeenCalled();
 });
 it('rejects noncanonical references and integrity or dimension mismatches before staging',async()=>{
  ref.mockReturnValueOnce('wrong');await expect(stageArtworkR2([id])).rejects.toThrow('not eligible');
  for(const patch of [{sha256:'wrong'},{width:401},{height:301}]){
    verify.mockReturnValueOnce({sha256:digest,width:400,height:300,...patch});
    await expect(stageArtworkR2([id])).rejects.toThrow('integrity mismatch');
  }
  for(const patch of [{width:401},{height:301}]){
    prisma.privateMediaCandidate.findFirst.mockResolvedValueOnce({...candidate,...patch});
    await expect(stageArtworkR2([id])).rejects.toThrow('integrity mismatch');
  }
  expect(stage).not.toHaveBeenCalled();
 });
 it('stages encrypted bytes, verifies with distinct runtime credentials and commits only the scoped pointer',async()=>{
  await stageArtworkR2([id]);
  expect(stage).toHaveBeenCalledWith(pointer,bytes,expect.objectContaining({accessKey:env.TB_R2_IMPORT_ACCESS_KEY_ID}));
  expect(read).toHaveBeenCalledWith(pointer,expect.objectContaining({accessKey:env.TB_R2_ACCESS_KEY_ID}));
  expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
  expect(tx.privateMediaCandidate.findFirst).toHaveBeenCalledWith({where:expect.objectContaining({
    id,centerId,templateId:tid,templateVersion:2,mediaDraftId:did,status:'QUARANTINED',revokedAt:null,
    digestSha256:digest,template:{version:2},mediaDraft:{state:'DRAFT',version:1}})});
  expect(tx.privateMediaCandidate.update).toHaveBeenCalledWith({where:{id},data:{
    r2CipherSha256:pointer.digest,r2CipherBytes:pointer.size}});
  expect(prisma.$disconnect).toHaveBeenCalled();
 });
 it('verifies an existing pointer without writes; rejects partial or mismatched pointers',async()=>{
  prisma.privateMediaCandidate.findFirst.mockResolvedValueOnce({...candidate,r2CipherSha256:pointer.digest,r2CipherBytes:pointer.size});
  await stageArtworkR2([id]);expect(read).toHaveBeenCalled();expect(stage).not.toHaveBeenCalled();
  for(const patch of [{r2CipherSha256:'bad'},{r2CipherBytes:50},{r2CipherSha256:pointer.digest,r2CipherBytes:51}]){
    prisma.privateMediaCandidate.findFirst.mockResolvedValueOnce({...candidate,...patch});
    await expect(stageArtworkR2([id])).rejects.toThrow('Existing pointer differs');
  }
  expect(prisma.$transaction).not.toHaveBeenCalled();
 });
 it('does not publish a pointer after revoked, changed or concurrently replaced candidate',async()=>{
  for(const changed of [null,{...candidate,encryptedBytes:Buffer.alloc(50,8)}]){
    tx.privateMediaCandidate.findFirst.mockResolvedValueOnce(changed);
    await expect(stageArtworkR2([id])).rejects.toThrow('Candidate changed');
  }
  for(const patch of [{r2CipherSha256:'bad'},{r2CipherBytes:50}]){
    tx.privateMediaCandidate.findFirst.mockResolvedValueOnce({...candidate,...patch});
    await expect(stageArtworkR2([id])).rejects.toThrow('Existing pointer differs');
  }
  tx.privateMediaCandidate.findFirst.mockResolvedValueOnce({...candidate,r2CipherSha256:pointer.digest,r2CipherBytes:pointer.size});
  await stageArtworkR2([id]);expect(tx.privateMediaCandidate.update).not.toHaveBeenCalled();
 });
 it('fails closed on upload or runtime verification failure and closes database',async()=>{
  stage.mockRejectedValueOnce(new Error('upload failed'));await expect(stageArtworkR2([id])).rejects.toThrow('upload failed');
  read.mockRejectedValueOnce(new Error('runtime read failed'));await expect(stageArtworkR2([id])).rejects.toThrow('runtime read failed');
  expect(prisma.$transaction).not.toHaveBeenCalled();expect(prisma.$disconnect).toHaveBeenCalledTimes(2);
 });
 it('validates the entire bounded batch before any connection or write',async()=>{
  const tooMany=Array.from({length:26},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
  for(const args of [[],[id,id],[id,'-'.repeat(36)],tooMany])
    await expect(stageArtworkR2Batch(args)).rejects.toThrow('Invalid private import candidate batch');
  await expect(stageArtworkR2(['-'.repeat(36)])).rejects.toThrow('not authorized');
  expect(PrismaClient).not.toHaveBeenCalled();expect(stage).not.toHaveBeenCalled();
 });
 it('stages explicit distinct candidates sequentially using the same per-candidate guards',async()=>{
  const second='00000000-0000-4000-8000-000000000005';
  prisma.privateMediaCandidate.findFirst.mockResolvedValueOnce(candidate).mockResolvedValueOnce({...candidate,id:second});
  tx.privateMediaCandidate.findFirst.mockResolvedValueOnce(candidate).mockResolvedValueOnce({...candidate,id:second});
  await expect(stageArtworkR2Batch([id,second])).resolves.toBe(2);
  expect(stage).toHaveBeenNthCalledWith(1,pointer,bytes,expect.anything());
  expect(stage).toHaveBeenNthCalledWith(2,storage.privateR2Pointer(centerId,second,bytes),bytes,expect.anything());
  expect(prisma.$disconnect).toHaveBeenCalledTimes(2);
 });
 it('stops on the first failure; does not attempt later candidates or report completion',async()=>{
  const second='00000000-0000-4000-8000-000000000005',third='00000000-0000-4000-8000-000000000006';
  prisma.privateMediaCandidate.findFirst.mockResolvedValueOnce(candidate).mockResolvedValueOnce({...candidate,id:second});
  stage.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(stageArtworkR2Batch([id,second,third])).rejects.toThrow('storage unavailable');
  expect(stage).toHaveBeenCalledTimes(2);expect(tx.privateMediaCandidate.update).toHaveBeenCalledTimes(1);
  expect(prisma.$disconnect).toHaveBeenCalledTimes(2);
 });

});
