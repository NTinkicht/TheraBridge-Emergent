import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  buildSyntheticIllustrationPilot,validateBlockedPilotReceipt,
  PilotReadinessError,PILOT_PUBLICATION_ENABLED,
} from './m5-wu2f-pilot-readiness.mjs';
import {planProductionAssets} from './m5-wu2d-production-assets.mjs';

const CID='11111111-1111-4111-8111-111111111111';
const FOREIGN='99999999-9999-4999-8999-999999999999';
const UUID=i=>'22222222-2222-4222-8222-'+String(i+1).padStart(12,'0');
const sha=s=>createHash('sha256').update(s).digest('hex');
const evidence=()=>({
  providerId:'synthetic-pilot-provider',
  providerTermsSha256:'a'.repeat(64),
  commercialLicenseSha256:'b'.repeat(64),
});
const makeTemplate=(i,service='speech',centerId=CID)=>({
  id:UUID(i),centerId,service,version:1,
});
function db(templates=[],drafts=[],candidates=[]){
  const queries=[];
  const tx={
    activityTemplate:{findMany:async q=>{
      queries.push(q);
      if(q.where?.OR)return templates;
      return templates.filter(t=>t.centerId===q.where?.centerId);
    }},
    activityMediaDraft:{findMany:async q=>{queries.push(q);return drafts;}},
    privateMediaCandidate:{findMany:async q=>{queries.push(q);return candidates;}},
  };
  return {
    queries,
    $transaction:async(fn,opts)=>{
      assert.equal(opts.isolationLevel,'RepeatableRead');
      assert.equal(opts.timeout,30000);
      return fn(tx);
    },
  };
}
async function isolated(fn){
  const previous={database:process.env.DATABASE_URL,deploy:process.env.DEPLOYMENT_ENV};
  process.env.DATABASE_URL='postgresql://test:pw@127.0.0.1:5432/therabridge_demo_test?schema=public';
  process.env.DEPLOYMENT_ENV='ci';
  try{return await fn();}
  finally{
    if(previous.database===undefined)delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL=previous.database;
    if(previous.deploy===undefined)delete process.env.DEPLOYMENT_ENV;
    else process.env.DEPLOYMENT_ENV=previous.deploy;
  }
}
function operatorReceipt(plan,i){
  return {
    referenceId:plan.slots[i].referenceId,
    batchRevision:plan.batchRevision,
    providerRunId:'synthetic-pilot-run-'+i,
    masterSha256:sha('synthetic-not-a-master-'+i),
    bundleId:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),
    custodyManifestSha256:sha('synthetic-not-an-audit-proof-'+i),
    status:'PRIVATE_QUARANTINED_PENDING_INDEPENDENT_ASSET_QA',
  };
}

test('actual synthetic center/global metadata inventory, no published denominator or patient IDs',()=>isolated(async()=>{
  const center=[makeTemplate(0,'speech'),makeTemplate(1,'behavioral')];
  const global=makeTemplate(2,'occupational',null);
  const mock=db([...center,global]);
  const plan=await planProductionAssets(evidence());
  const r=await buildSyntheticIllustrationPilot({
    db:mock,centerId:CID,evidence:evidence(),
    pilotProposals:[{
      centerId:CID,templateId:center[0].id,templateVersion:1,
      referenceId:plan.slots[0].referenceId,
    }],
  });
  assert.equal(validateBlockedPilotReceipt(r),true);
  assert.equal(r.schemaVersion,1);
  assert.equal(r.status,'BLOCKED_FOR_EXTERNAL_APPROVAL');
  assert.equal(r.source,'SYNTHETIC_DB_AND_OPERATOR_REPORTS');
  assert.equal(r.counts.storedCenterTemplates,2);
  assert.equal(r.counts.syntheticGlobalSamples,1);
  assert.equal(r.reportedPilotProposalCount,1);
  assert.equal(r.reportedPilotEligibleActivityCount,null);
  assert.equal(r.counts.privateQuarantineProposals,0);
  assert.equal(r.publishedActivityCount,null);
  assert.equal(r.publishedIllustrationCount,null);
  assert.equal(r.publishedIllustrationCoveragePercent,null);
  assert.equal(r.approvedReleaseModelPresent,false);
  assert.equal(r.canStartClinicalPilot,false);
  assert.equal(r.humanClinicalDesignRightsAcceptance,'NOT_VERIFIED');
  assert.equal(r.independentMediaSecurityAcceptance,'NOT_VERIFIED');
  assert.equal(r.manualAccessibilityAndFiveWidthAcceptance,'NOT_RUN');
  assert.equal(r.imageUrl,null);
  assert.equal(r.publishEnabled,false);
  assert.equal(r.guardianReadEnabled,false);
  assert.equal(r.digestIsSignature,false);
  assert.equal(r.clinicalGate,'NO_GO_G2_G2b');
  assert.equal(PILOT_PUBLICATION_ENABLED,false);
  assert.equal(r.families.speech,1);
  assert.equal(r.scenes['therapist-guided'],1);
  assert.equal(r.blockers.length,6);
  assert.equal(Object.isFrozen(r),true);
  assert.equal(Object.isFrozen(r.families),true);
  assert.equal(Object.isFrozen(r.counts),true);
  assert.deepEqual(mock.queries[0].where,{OR:[{centerId:CID},{centerId:null}]});
  assert.deepEqual(mock.queries[3].where,{centerId:CID});
  const serialized=JSON.stringify(r);
  for(const secret of [CID,center[0].id,global.id,'objectKey','imageBytes','storageKey',
    'candidateId','https://','data:image'])assert(!serialized.includes(secret),secret);
}));
test('a complete 20-candidate four-family pilot remains BLOCKED, never 100 percent coverage',()=>isolated(async()=>{
  const plan=await planProductionAssets(evidence());
  const desired=plan.slots.filter(slot=>slot.family!=='group');
  assert.equal(desired.length,20);
  const templates=desired.map((slot,i)=>makeTemplate(i,slot.family));
  const proposals=templates.map((t,i)=>({
    centerId:CID,templateId:t.id,templateVersion:t.version,
    referenceId:desired[i].referenceId,
  }));
  // Even 25 operator-asserted receipts are NOT 25 independently verified assets.
  const reports=plan.slots.map((_,i)=>operatorReceipt(plan,i));
  const out=await buildSyntheticIllustrationPilot({
    db:db(templates),centerId:CID,evidence:evidence(),
    pilotProposals:proposals,privateReceipts:reports,
  });
  assert.equal(out.reportedPilotProposalCount,20);
  assert.equal(out.counts.operatorReportedPrivateMasters,25);
  assert.equal(out.counts.remainingMasterSlots,0);
  assert.deepEqual(out.families,{speech:5,occupational:5,behavioral:5,physical:5,group:0});
  assert.equal(out.scenes['therapist-guided'],4);
  assert.equal(out.scenes['home-support'],4);
  assert.equal(out.canStartClinicalPilot,false);
  assert.equal(out.allActualMastersIndependentlyVerified,false);
  assert.equal(out.publishedIllustrationCoveragePercent,null);
  assert.equal(validateBlockedPilotReceipt(out),true);
}));
test('missing reference masters, empty database and no proposals do not fake a zero denominator',()=>isolated(async()=>{
  const r=await buildSyntheticIllustrationPilot({
    db:db(),centerId:CID,evidence:evidence(),
  });
  assert.equal(r.counts.storedCenterTemplates,0);
  assert.equal(r.counts.operatorReportedPrivateMasters,0);
  assert.equal(r.counts.remainingMasterSlots,25);
  assert.equal(r.publishedActivityCount,null);
  assert.equal(r.publishedIllustrationCoveragePercent,null);
  assert.equal(r.reportedPilotProposalCount,0);
  assert.equal(r.status,'BLOCKED_FOR_EXTERNAL_APPROVAL');
}));
test('reject foreign center, global samples, stale versions, wrong family, duplicates and arbitrary IDs',()=>isolated(async()=>{
  const plan=await planProductionAssets(evidence());
  const t=makeTemplate(0,'speech');
  const other=makeTemplate(1,'occupational');
  const match={centerId:CID,templateId:t.id,templateVersion:t.version,
    referenceId:plan.slots.find(x=>x.family==='speech').referenceId};
  const bad=[
    {...match,centerId:FOREIGN},
    {...match,templateId:UUID(42)},
    {...match,templateVersion:2},
    {...match,templateVersion:0},
    {...match,referenceId:plan.slots.find(x=>x.family==='physical').referenceId},
    {...match,referenceId:'../../../../etc/passwd'},
    {...match,templateId:'not-a-uuid'},
    {...match,approved:true},
  ];
  for(const proposal of bad){
    await assert.rejects(buildSyntheticIllustrationPilot({
      db:db([t,other]),centerId:CID,evidence:evidence(),pilotProposals:[proposal],
    }),PilotReadinessError);
  }
  for(const dupe of [
    [match,match],
    [match,{...match,referenceId:plan.slots.find(x=>x.family==='speech'&&x.referenceId!==match.referenceId).referenceId}],
    [match,{...match,templateId:other.id}],
  ]){
    await assert.rejects(buildSyntheticIllustrationPilot({
      db:db([t,other]),centerId:CID,evidence:evidence(),pilotProposals:dupe,
    }),PilotReadinessError);
  }
  await assert.rejects(buildSyntheticIllustrationPilot({
    db:db([t,makeTemplate(1,'speech',null)]),centerId:CID,evidence:evidence(),
    pilotProposals:[{...match,templateId:UUID(1)}],
  }),PilotReadinessError);
}));
test('operator private-image reports cannot forge rights or published status',()=>isolated(async()=>{
  const plan=await planProductionAssets(evidence());
  const original=operatorReceipt(plan,0);
  for(const bad of [
    {...original,status:'APPROVED'},
    {...original,masterSha256:'bad'},
    {...original,guardianReadEnabled:true},
    {...original,referenceId:plan.slots[1].referenceId,
      batchRevision:'f'.repeat(64)},
  ]){
    await assert.rejects(buildSyntheticIllustrationPilot({
      db:db(),centerId:CID,evidence:evidence(),privateReceipts:[bad],
    }),PilotReadinessError);
  }
}));
test('no approval/coverage/receipt flags can be altered without strict receipt validation failing',()=>isolated(async()=>{
  const v=await buildSyntheticIllustrationPilot({db:db(),centerId:CID,evidence:evidence()});
  for(const tweak of [
    x=>{x.status='PASS';},x=>{x.publishedActivityCount=0;},
    x=>{x.publishedIllustrationCoveragePercent=100;},
    x=>{x.publishedIllustrationCount=25;},x=>{x.approvedReleaseModelPresent=true;},
    x=>{x.reportedPilotEligibleActivityCount=20;},
    x=>{x.canStartClinicalPilot=true;},x=>{x.allActualMastersIndependentlyVerified=true;},
    x=>{x.humanClinicalDesignRightsAcceptance='APPROVED';},
    x=>{x.independentMediaSecurityAcceptance='APPROVED';},
    x=>{x.manualAccessibilityAndFiveWidthAcceptance='PASS';},
    x=>{x.imageUrl='https://example.org/guardian.png';},
    x=>{x.clinicalGate='GO';},x=>{x.guardianReadEnabled=true;},
    x=>{x.publishEnabled=true;},x=>{x.digestIsSignature=true;},
    x=>{x.blockers=[];},x=>{x.sourceInventoryDigestSha256='bad';},
    x=>{x.counts.operatorReportedPrivateMasters=25;},
    x=>{x.families.speech=1;},x=>{x.extra='unsafe';},
  ]){
    const changed=structuredClone(v);
    tweak(changed);
    assert.throws(()=>validateBlockedPilotReceipt(changed),PilotReadinessError);
  }
}));
test('deny production DB, malicious accessors/array holes and an in-flight caller mutation',()=>isolated(async()=>{
  const template=makeTemplate(0);
  const plan=await planProductionAssets(evidence());
  const proposal={centerId:CID,templateId:template.id,templateVersion:1,
    referenceId:plan.slots[0].referenceId};
  const fake={...proposal};
  Object.defineProperty(fake,'referenceId',{enumerable:true,get(){throw Error('unsafe getter');}});
  await assert.rejects(buildSyntheticIllustrationPilot({
    db:db([template]),centerId:CID,evidence:evidence(),pilotProposals:[fake],
  }),PilotReadinessError);
  const sparse=new Array(1);
  await assert.rejects(buildSyntheticIllustrationPilot({
    db:db(),centerId:CID,evidence:evidence(),pilotProposals:sparse,
  }),PilotReadinessError);
  const mutation=[proposal];
  const pending=buildSyntheticIllustrationPilot({
    db:db([template]),centerId:CID,evidence:evidence(),pilotProposals:mutation,
  });
  mutation[0].referenceId='../changed';
  assert.equal((await pending).reportedPilotProposalCount,1);
  const prev=process.env.DEPLOYMENT_ENV;
  process.env.DEPLOYMENT_ENV='production';
  try{
    await assert.rejects(buildSyntheticIllustrationPilot({
      db:db(),centerId:CID,evidence:evidence(),
    }),PilotReadinessError);
  }finally{
    if(prev===undefined)delete process.env.DEPLOYMENT_ENV;
    else process.env.DEPLOYMENT_ENV=prev;
  }
});
