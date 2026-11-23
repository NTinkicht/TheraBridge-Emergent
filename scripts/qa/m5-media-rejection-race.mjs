/**
 * Exercise the ACTUAL ActivityMediaService.uploadCandidate and reject paths on
 * isolated CI PostgreSQL, with two observed blocked-lock interleavings.
 * Only ClamAV/image scanning is substituted with safe synthetic bytes;
 * no source image, user data, or clinical approval is used.
 */
import assert from 'node:assert/strict';
import * as compiled from '../../apps/api/dist/clinical/activity-media.service.js';
const ProductionMediaService=compiled.ActivityMediaService??compiled.default?.ActivityMediaService;
if(typeof ProductionMediaService!=='function')throw new Error('Compiled API service is required');
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fakeTrial={now:()=>new Date(),assertWritable:async()=>{}};
const syntheticPrepared={
  encryptedBytes:Buffer.alloc(128,0x53),
  digestSha256:'0'.repeat(64),width:1600,height:1200,
  scannerName:'SYNTHETIC_TEST_ONLY',scannerVersion:'1',
};
/* Intercept only $queryRaw observation, forwarding all production queries
 * unchanged. Never reproduce or replace lock/admission SQL in the test.
 */
function makeService(db,{beforeLock,afterLock,scanner}={}){
  const prisma={
    $transaction:callback=>db.$transaction(async tx=>{
      const wrapped=new Proxy(tx,{get(target,prop){
        if(prop!=='$queryRaw')return Reflect.get(target,prop);
        return async (parts,...values)=>{
          const sql=Array.isArray(parts)?parts.join('?'):String(parts);
          const locked=sql.includes('FROM activity_media_draft')&&sql.includes('FOR UPDATE');
          if(locked&&beforeLock){
            const rows=await target.$queryRawUnsafe('SELECT pg_backend_pid()::integer AS pid');
            beforeLock.resolve(rows[0].pid);
          }
          const result=await target.$queryRaw(parts,...values);
          if(locked&&afterLock){
            afterLock.acquired.resolve();
            await afterLock.release.promise;
          }
          return result;
        };
      }});
      return callback(wrapped);
    }),
  };
  class SyntheticScannerService extends ProductionMediaService {
    async preparePngCandidate(){
      if(scanner){
        scanner.started.resolve();
        await scanner.release.promise;
      }
      return {...syntheticPrepared,encryptedBytes:Buffer.from(syntheticPrepared.encryptedBytes)};
    }
  }
  return new SyntheticScannerService(prisma,fakeTrial);
}
async function proveBlocked(db,pid){
  for(let i=0;i<70;i++){
    const rows=await db.$queryRawUnsafe(
      'SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1::integer',pid);
    if(rows[0]?.wait_event_type==='Lock')return;
    await sleep(15);
  }
  throw Error('Actual media service contention was not observed in PostgreSQL');
}
export async function verifyPrivateMediaRejectionRace(db,centerId){
  const m=await db.membership.findFirst({
    where:{centerId,status:'ACTIVE',roles:{some:{role:'CLINICAL_SUPERVISOR'}}},
    select:{id:true,userId:true},
  });
  if(!m)throw Error('Synthetic demo supervisor is required');
  const v={userId:m.userId,membershipId:m.id,role:'CLINICAL_SUPERVISOR'};
  const t=await db.activityTemplate.create({data:{
    centerId,title:'Synthetic production-method media race',service:'speech',
    ageBand:'synthetic',minutes:5,materials:[],
    steps:['Choose a fictional card'],safety:['Fictional safe adult supervision'],
    createdById:v.userId,createdAt:new Date(),
  }});
  const addDraft=()=>db.activityMediaDraft.create({data:{
    centerId,templateId:t.id,templateVersion:t.version,service:t.service,
    sourceType:'ORIGINAL',styleVersion:'m5-b-v1',sceneType:'fictional-cards',
    altText:'A fictional person choosing neutral cards for synthetic QA',
    license:'TEST_ONLY_NOT_APPROVED',sourceReference:'SYNTHETIC-SERVICE-LOCK',
    createdById:v.userId,state:'DRAFT',
  }});
  const ids=[],release=[];
  try{
    // Upload actually acquires the draft row lock. Prove rejection waits on
    // that same lock, then upload commits before rejection revokes its image.
    const a=await addDraft();ids.push(a.id);
    const acquired=deferred(),go=deferred(),attempt=deferred();release.push(go);
    const pUpload=makeService(db,{afterLock:{acquired,release:go}})
      .uploadCandidate(centerId,v,t.id,a.id,'synthetic-scanner');
    await acquired.promise;
    const pReject=makeService(db,{beforeLock:attempt}).reject(centerId,v,t.id,a.id,
      {version:1,reason:'Synthetic rights rejected after uploaded draft'});
    const pid=await attempt.promise;
    await proveBlocked(db,pid);
    go.resolve();
    await Promise.all([pUpload,pReject]);
    const rows=await db.privateMediaCandidate.findMany({
      where:{mediaDraftId:a.id},select:{status:true,revokedAt:true},
    });
    assert.equal(rows.length,1);
    assert.equal(rows[0].status,'REVOKED');
    assert.notEqual(rows[0].revokedAt,null);
    // Rejection holds the lock while a real upload finishes its controlled
    // scanner phase. Prove upload waits; it must reject after the lock clears.
    const b=await addDraft();ids.push(b.id);
    const rejectAcquired=deferred(),releaseReject=deferred(),uploadAttempt=deferred();
    const scannerStarted=deferred(),releaseScanner=deferred();
    release.push(releaseReject,releaseScanner);
    const pRejectFirst=makeService(db,{afterLock:{
      acquired:rejectAcquired,release:releaseReject,
    }}).reject(centerId,v,t.id,b.id,{version:1,reason:'Synthetic incompatible artwork rejected'});
    await rejectAcquired.promise;
    const pUploadLate=makeService(db,{beforeLock:uploadAttempt,scanner:{
      started:scannerStarted,release:releaseScanner,
    }}).uploadCandidate(centerId,v,t.id,b.id,'synthetic-scanner')
      .then(()=>({admitted:true}),error=>({admitted:false,error}));
    await scannerStarted.promise;
    releaseScanner.resolve();
    await proveBlocked(db,await uploadAttempt.promise);
    releaseReject.resolve();
    await pRejectFirst;
    const result=await pUploadLate;
    assert.equal(result.admitted,false);
    assert.match(String(result.error?.message),/rejected during scanning|changed during scanning/i);
    assert.equal(await db.privateMediaCandidate.count({where:{mediaDraftId:b.id}}),0);
    return Object.freeze({realServiceInterleavings:2,postgresBlockedLocks:2,
      strandedCandidates:0,acceptedWithoutRights:0,
      scannerOutput:'SYNTHETIC_ONLY',clinicalGate:'NO_GO_G2_G2b'});
  }finally{
    for(const d of release)d.resolve();
    await db.privateMediaCandidate.deleteMany({where:{mediaDraftId:{in:ids}}});
    await db.activityMediaDraft.deleteMany({where:{id:{in:ids}}});
    await db.activityTemplate.delete({where:{id:t.id}});
  }
}
