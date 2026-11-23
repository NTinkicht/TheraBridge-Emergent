/**
 * Real PostgreSQL lock-order race, using only throwaway synthetic records
 * in isolated *_demo_test CI. Neither private bytes nor identifiers are logged.
 * This exercises the DB behaviour expected by uploadCandidate/reject, not
 * merely Jest mock ordering. No clinical or media approval takes place.
 */
import assert from 'node:assert/strict';

const deferred=()=>{
  let resolve;
  const promise=new Promise(done=>{resolve=done;});
  return {promise,resolve};
};
export async function verifyPrivateMediaRejectionRace(db,centerId){
  const member=await db.membership.findFirst({
    where:{centerId,status:'ACTIVE'},select:{userId:true},
  });
  if(!member)throw new Error('Synthetic demo center must have an active member');
  const t=await db.activityTemplate.create({data:{
    centerId,title:'Synthetic media lock contention verification',service:'speech',
    ageBand:'synthetic',minutes:5,materials:[],steps:['Choose a fictional card'],
    safety:['Synthetic clinical check required'],createdById:member.userId,
    createdAt:new Date(),
  }});
  const createDraft=()=>db.activityMediaDraft.create({data:{
    centerId,templateId:t.id,templateVersion:t.version,service:t.service,
    sourceType:'ORIGINAL',styleVersion:'m5-b-v1',sceneType:'fictional-cards',
    altText:'A fictional person choosing neutral cards for synthetic QA',
    license:'TEST_ONLY_NOT_APPROVED',sourceReference:'SYNTHETIC-DB-LOCK-TEST',
    createdById:member.userId,state:'DRAFT',
  }});
  const lock=(tx,id)=>tx.$queryRaw`SELECT id FROM activity_media_draft
    WHERE id=${id}::uuid AND center_id=${centerId}::uuid
      AND template_id=${t.id}::uuid FOR UPDATE`;
  const insert=(tx,d)=>tx.privateMediaCandidate.create({data:{
    centerId,kind:'ACTIVITY_IMAGE',templateId:t.id,templateVersion:t.version,
    mediaDraftId:d.id,encryptedBytes:Buffer.from('synthetic-nonimage-test-only'),
    digestSha256:'0'.repeat(64),scannerName:'SYNTHETIC_LOCK_TEST',
    scannerVersion:'1',width:1600,height:1200,status:'QUARANTINED',
    rightsState:'UNVERIFIED',consentState:'PENDING',createdById:member.userId,
  }});
  const reject=(tx,d)=>tx.activityMediaDraft.updateMany({
    where:{id:d.id,centerId,templateId:t.id,state:'DRAFT',version:1},
    data:{state:'REJECTED',version:{increment:1},updatedAt:new Date()},
  });
  const sweep=(tx,d)=>tx.privateMediaCandidate.updateMany({
    where:{centerId,templateId:t.id,mediaDraftId:d.id,kind:'ACTIVITY_IMAGE',
      status:'QUARANTINED',revokedAt:null},
    data:{status:'REVOKED',revokedAt:new Date()},
  });
  const drafts=[];
  try {
    // Ordering 1: uploader holds lock while reject waits, then reject revokes.
    const a=await createDraft();drafts.push(a.id);
    const acquiredUpload=deferred(),releaseUpload=deferred();
    const uploading=db.$transaction(async tx=>{
      await lock(tx,a.id);acquiredUpload.resolve();
      await releaseUpload.promise;
      const d=await tx.activityMediaDraft.findFirst({where:{id:a.id,state:'DRAFT'}});
      if(!d)throw new Error('Unexpected rejection before upload lock release');
      await insert(tx,a);
    });
    await acquiredUpload.promise;
    const rejecting=db.$transaction(async tx=>{
      await lock(tx,a.id);
      const changed=await reject(tx,a);
      assert.equal(changed.count,1);
      await sweep(tx,a);
    });
    releaseUpload.resolve();
    await Promise.all([uploading,rejecting]);
    const revoked=await db.privateMediaCandidate.findMany({
      where:{mediaDraftId:a.id},select:{status:true,revokedAt:true},
    });
    assert.equal(revoked.length,1);
    assert.equal(revoked[0].status,'REVOKED');
    assert.notEqual(revoked[0].revokedAt,null);
    // Ordering 2: reject holds lock; late uploader must observe rejection.
    const b=await createDraft();drafts.push(b.id);
    const acquiredReject=deferred(),releaseReject=deferred();
    const rejectionFirst=db.$transaction(async tx=>{
      await lock(tx,b.id);acquiredReject.resolve();
      await releaseReject.promise;
      const changed=await reject(tx,b);
      assert.equal(changed.count,1);
      await sweep(tx,b);
    });
    await acquiredReject.promise;
    const lateUpload=db.$transaction(async tx=>{
      await lock(tx,b.id);
      const open=await tx.activityMediaDraft.findFirst({
        where:{id:b.id,centerId,templateId:t.id,state:'DRAFT'},
        select:{id:true},
      });
      if(!open)return 'BLOCKED';
      await insert(tx,b);
      return 'ADMITTED';
    });
    releaseReject.resolve();
    await rejectionFirst;
    assert.equal(await lateUpload,'BLOCKED');
    assert.equal(await db.privateMediaCandidate.count({where:{mediaDraftId:b.id}}),0);
    return Object.freeze({orders:2,admittedAfterRejection:0,
      strandedQuarantinedAfterRejection:0,clinicalGate:'NO_GO_G2_G2b'});
  } finally {
    await db.privateMediaCandidate.deleteMany({where:{mediaDraftId:{in:drafts}}});
    await db.activityMediaDraft.deleteMany({where:{id:{in:drafts}}});
    await db.activityTemplate.delete({where:{id:t.id}});
  }
}
