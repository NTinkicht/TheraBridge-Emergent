import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSyntheticMediaInventory,validateM5MediaInventoryReceipt,MEDIA_INVENTORY_STATE}
  from './m5-media-inventory.mjs';
const C='11111111-1111-4111-8111-111111111111';
const OTHER='99999999-9999-4999-8999-999999999999';
const a='22222222-2222-4222-8222-222222222222';
const b='33333333-3333-4333-8333-333333333333';
const d='44444444-4444-4444-8444-444444444444';
const ca='55555555-5555-4555-8555-555555555555';
function fixtures(){
  return {
    templates:[
      {id:a,centerId:C,version:2,service:'speech'},
      {id:b,centerId:null,version:1,service:'occupational'}
    ],
    drafts:[{id:d,centerId:C,templateId:a,templateVersion:2,state:'DRAFT'}],
    candidates:[{id:ca,centerId:C,kind:'ACTIVITY_IMAGE',templateId:a,
      templateVersion:2,mediaDraftId:d,status:'QUARANTINED',
      rightsState:'UNVERIFIED',revokedAt:null}],
  };
}
function mockDb(fixture=fixtures()){
  const queries={};
  const table=(key)=>({findMany:async query=>{
    if(!queries[key])queries[key]=[];
    queries[key].push(query);
    return fixture[key];
  }});
  const db={
    $transaction:async(fn,opts)=>{
      assert.equal(opts.isolationLevel,'RepeatableRead');
      return fn({activityTemplate:table('templates'),
        activityMediaDraft:table('drafts'),
        privateMediaCandidate:table('candidates')});
    }
  };
  return {db,queries};
}
async function withDemo(fn){
  const oldDb=process.env.DATABASE_URL,oldEnv=process.env.DEPLOYMENT_ENV;
  process.env.DATABASE_URL='postgresql://test:pw@127.0.0.1:5432/therabridge_demo_test?schema=public';
  process.env.DEPLOYMENT_ENV='ci';
  try{return await fn();}finally{
    if(oldDb===undefined)delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL=oldDb;
    if(oldEnv===undefined)delete process.env.DEPLOYMENT_ENV;
    else process.env.DEPLOYMENT_ENV=oldEnv;
  }
}
test('M5-17 actual source inventory excludes unrelated tenants and keeps samples separate',()=>withDemo(async()=>{
  const {db,queries}=mockDb();
  const r=await buildSyntheticMediaInventory(db,C);
  assert.equal(validateM5MediaInventoryReceipt(r),true);
  assert.equal(r.status,MEDIA_INVENTORY_STATE);
  assert.equal(r.counts.centerStoredTemplates,1);
  assert.equal(r.counts.globalSyntheticSamples,1);
  assert.equal(r.counts.distinctStoredTemplates,2);
  assert.equal(r.counts.quarantinedUnrevokedCandidates,1);
  assert.equal(r.counts.currentVersionUnrejectedDrafts,1);
  assert.equal(r.publishedActivityCount,null);
  assert.equal(r.publishedIllustrationCoveragePercent,null);
  assert.equal(r.immutableApprovedMediaModelExists,false);
  assert.equal(r.counts.publishedImages,0);
  assert.deepEqual(queries.templates[0].where,{OR:[{centerId:C},{centerId:null}]});
  assert.deepEqual(queries.drafts[0].where,{centerId:C});
  assert.deepEqual(queries.candidates[0].where,{centerId:C,kind:'ACTIVITY_IMAGE'});
  const serialized=JSON.stringify(r);
  assert(!serialized.includes(C)&&!serialized.includes(a)&&!serialized.includes('speech'));
  assert(!serialized.match(/title|imageBytes|license|sourceReference|objectKey|path/));
}));
test('M5-14 rejects foreign drafts and orphan private candidates instead of granting security approval',()=>withDemo(async()=>{
  for(const invalid of [
    f=>{f.drafts[0].centerId=OTHER;},
    f=>{f.drafts[0].templateId=b;},
    f=>{f.candidates[0].mediaDraftId=OTHER;},
    f=>{f.candidates[0].rightsState='APPROVED';},
    f=>{f.candidates[0].status='APPROVED';},
  ]){
    const data=fixtures(); invalid(data);
    await assert.rejects(()=>buildSyntheticMediaInventory(mockDb(data).db,C));
  }
}));
test('M5-17 review denominator cannot fabricate 100% publication or an approved style',()=>withDemo(async()=>{
  const baseline=await buildSyntheticMediaInventory(mockDb().db,C);
  for(const mutation of [
    x=>{x.status='PASS';},x=>{x.styleReview='APPROVED';},
    x=>{x.securityReview='APPROVED';},x=>{x.legalRightsReview='APPROVED';},
    x=>{x.publishedIllustrationCoveragePercent=100;},
    x=>{x.publishedActivityCount=2;},x=>{x.counts.publishedImages=1;},
    x=>{x.screenshotOrImageBytesArchived=true;},
    x=>{x.counts.assetUrl='https://example.org/sensitive';},
    x=>{x.candidateId=C;},
  ]){
    const x=structuredClone(baseline);mutation(x);
    assert.throws(()=>validateM5MediaInventoryReceipt(x));
  }
}));
test('M5-17 only executes on isolated CI demo DB and prevents malformed identity',async()=>{
  await assert.rejects(()=>buildSyntheticMediaInventory(mockDb().db,C));
  await withDemo(async()=>{
    await assert.rejects(()=>buildSyntheticMediaInventory(mockDb().db,'../escape'));
    const f=fixtures();f.templates.push({...f.templates[0]});
    await assert.rejects(()=>buildSyntheticMediaInventory(mockDb(f).db,C));
  });
});
