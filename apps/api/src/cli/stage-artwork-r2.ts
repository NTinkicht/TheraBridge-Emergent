import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { privateR2Config,privateR2Pointer,stagePrivateR2,readPrivateR2 } from '../common/private-r2';
import { openPrivateData } from '../common/private-envelope';
import { verifyPngCandidate } from '../clinical/activity-media-png-integrity';
import { generatedReferenceDigest,assertGeneratedReferenceScope } from '../clinical/generated-artwork-reference';

// Only promote already scanned, encrypted and exact-reference synthetic
// candidates. Does not create a draft/candidate/approval or release anything.
// DB ciphertext retained as a controlled backup until a separate retention decision.
async function main(){
  const args=process.argv.slice(2);
  if(args.length!==1||!/^[a-f0-9-]{36}$/.test(args[0])||
    process.env.TB_ARTWORK_R2_IMPORT_ALLOWED!=='true'||
    !['local','development','demo','test'].includes(process.env.DEPLOYMENT_ENV??''))
    throw Error('Private synthetic import is not authorized.');
  const id=args[0],config=privateR2Config(process.env,true),runtime=privateR2Config();
  if(config.accessKey===runtime.accessKey)throw Error('Separate import credential required.');
  const prisma=new PrismaClient();
  try{
    const candidate=await prisma.privateMediaCandidate.findFirst({where:{id,kind:'ACTIVITY_IMAGE',
      status:'QUARANTINED',revokedAt:null},include:{mediaDraft:true,template:true}});
    const d=candidate?.mediaDraft,t=candidate?.template;
    if(!candidate||!d||!t||!candidate.templateId||d.centerId!==candidate.centerId||t.centerId!==candidate.centerId||
      d.templateId!==t.id||candidate.templateVersion!==t.version||d.templateVersion!==t.version||
      d.state!=='DRAFT'||d.sourceType!=='GENERATED'||d.styleVersion!=='m5-b-v1'||d.service!==t.service||
      candidate.scannerName!=='ClamAV'||!candidate.scannerVersion||
      generatedReferenceDigest(d.sourceReference)!==candidate.digestSha256)
      throw Error('Candidate is not eligible for private staging.');
    assertGeneratedReferenceScope(d.sourceReference,t.service,d.sceneType);
    const plain=openPrivateData(candidate.encryptedBytes,'activity-image-v1',candidate.centerId,t.id);
    const receipt=verifyPngCandidate(plain);
    if(receipt.sha256!==candidate.digestSha256||receipt.width!==400||receipt.height!==300||
       candidate.width!==400||candidate.height!==300)throw Error('Candidate integrity mismatch.');
    const pointer=privateR2Pointer(candidate.centerId,id,candidate.encryptedBytes);
    if(candidate.r2CipherSha256!==null||candidate.r2CipherBytes!==null){
      if(candidate.r2CipherSha256!==pointer.digest||candidate.r2CipherBytes!==pointer.size)throw Error('Existing pointer differs.');
      await readPrivateR2(pointer,runtime);
      console.log('Existing private pointer verified; no change.');return;
    }
    await stagePrivateR2(pointer,candidate.encryptedBytes,config);
    await readPrivateR2(pointer,runtime);
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM activity_template WHERE id=${t.id}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM activity_media_draft WHERE id=${d.id}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM private_media_candidate WHERE id=${id}::uuid FOR UPDATE`;
      const now=await tx.privateMediaCandidate.findFirst({where:{id,centerId:candidate.centerId,templateId:t.id,
        templateVersion:t.version,mediaDraftId:d.id,status:'QUARANTINED',revokedAt:null,
        digestSha256:candidate.digestSha256,template:{version:t.version},mediaDraft:{state:'DRAFT',version:d.version}}});
      if(!now||!Buffer.from(now.encryptedBytes).equals(Buffer.from(candidate.encryptedBytes)))
        throw Error('Candidate changed; reconcile private orphan.');
      if(now.r2CipherSha256===pointer.digest&&now.r2CipherBytes===pointer.size)return;
      if(now.r2CipherSha256!==null||now.r2CipherBytes!==null)throw Error('Existing pointer differs.');
      await tx.privateMediaCandidate.update({where:{id},data:{r2CipherSha256:pointer.digest,r2CipherBytes:pointer.size}});
    });
    console.log('Private encrypted candidate staged and read-back verified. No approval or release.');
  }finally{await prisma.$disconnect();}
}
if(require.main===module)main().catch(()=>{console.error('Private R2 import failed; reconcile candidate and object before retry.');process.exitCode=1;});
