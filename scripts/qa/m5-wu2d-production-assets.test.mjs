import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stagePrivateIllustration,PrivateCustodyError} from './m5-wu2c-private-custody.mjs';
import {deflateSync} from 'node:zlib';
import {
  planProductionAssets,validateProductionMaster,
  admitProductionMasterOnHost,reconcileProductionAssets,ProductionAssetError,
  PRODUCTION_IMAGE_PUBLICATION_ENABLED,
} from './m5-wu2d-production-assets.mjs';

const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const evidence=()=>({providerId:'synthetic-illustration-provider',
  providerTermsSha256:'a'.repeat(64),commercialLicenseSha256:'b'.repeat(64)});
const crc32=buffer=>{
  let c=0xffffffff;
  for(const octet of buffer){c^=octet;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}
  return(c^0xffffffff)>>>0;
};
const chunk=(label,data)=>{
  const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);
  b.write(label,4,'ascii');data.copy(b,8);
  b.writeUInt32BE(crc32(b.subarray(4,8+data.length)),8+data.length);
  return b;
};
function mockOriginal(width=1600,height=1200){
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
  ihdr[8]=8;ihdr[9]=2;
  const raw=Buffer.alloc(height*(1+width*3));
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),
    chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
async function valid(){
  const plan=await planProductionAssets(evidence());
  const slot=plan.slots[0],png=mockOriginal();
  const submission={
    referenceId:slot.referenceId,sourceConceptSha256:slot.sourceConceptSha256,
    styleVersion:'m5-b-v1',promptSha256:slot.promptSha256,
    batchRevision:plan.batchRevision,providerId:slot.providerId,
    providerTermsSha256:slot.providerTermsSha256,
    commercialLicenseSha256:slot.commercialLicenseSha256,
    providerRunId:'fictional-provider-run-001',
    modelId:'synthetic-illustrator',modelVersion:'0.1-test',
    costMicros:12345,masterSha256:sha(png),
    sourceKind:'ORIGINAL_FICTIONAL_GENERATED',
    containsRealChildData:false,approved:false,publishEnabled:false,
    guardianReadEnabled:false,
  };
  return {plan,submission,png};
}
function receipt(plan,index){
  return {
    referenceId:plan.slots[index].referenceId,
    batchRevision:plan.batchRevision,
    providerRunId:'synthetic-private-run-'+index,
    masterSha256:sha('synthetic-master-'+index),
    bundleId:'00000000-0000-4000-8000-'+String(index+1).padStart(12,'0'),
    custodyManifestSha256:sha('synthetic-custody-'+index),
    status:'PRIVATE_QUARANTINED_PENDING_INDEPENDENT_ASSET_QA',
  };
}
test('exact 25 immutable slots, all five families/scenes, no approval or guardian paths',async()=>{
  const plan=await planProductionAssets(evidence());
  assert.equal(plan.plannedCount,25);
  assert.equal(plan.slots.length,25);
  assert.equal(new Set(plan.slots.map(x=>x.referenceId)).size,25);
  assert.equal(new Set(plan.slots.map(x=>x.family)).size,5);
  assert.equal(new Set(plan.slots.map(x=>x.scene)).size,5);
  assert(plan.slots.every(x=>x.styleVersion==='m5-b-v1' &&
    x.state==='AWAITING_REAL_PRODUCTION_MASTER' && x.approved===false &&
    x.publishEnabled===false && x.guardianReadEnabled===false &&
    x.imageUrl===null && Object.isFrozen(x.safeSquare)));
  assert.deepEqual(plan.slots[0].expectedMaster,{width:1600,height:1200,format:'PNG'});
  assert.deepEqual(plan.slots[0].safeSquare,{x:200,y:0,width:1200,height:1200});
  assert.equal(plan.productionMastersProvided,0);
  assert.equal(PRODUCTION_IMAGE_PUBLICATION_ENABLED,false);
  assert.equal(plan.clinicalGate,'NO_GO_G2_G2b');
});
test('one real-dimension but fictional synthetic PNG is strict-private preflight only',async()=>{
  const {submission,png}=await valid();
  const result=await validateProductionMaster({evidence:evidence(),submission,masterBytes:png});
  assert.equal(result.referenceId,'WU2A-S1-SPEECH');
  assert.equal(result.masterSha256,sha(png));
  assert.deepEqual(result.masterDimensions,[1600,1200]);
  assert.equal(result.modelId,'synthetic-illustrator');
  assert.equal(result.costMicros,12345);
  assert.equal(result.rightsVerified,false);
  assert.equal(result.assetDesignApproved,false);
  assert.equal(result.assetClinicalApproved,false);
  assert.equal(result.status,'PRIVATE_PREFLIGHT_ONLY');
  assert.equal(result.published,false);
  assert.equal(result.readEnabled,false);
  assert.equal(result.guardianReadEnabled,false);
  assert.equal(result.clinicalGate,'NO_GO_G2_G2b');
  assert.equal(Object.isFrozen(result),true);
  assert(!JSON.stringify(result).includes('data:'));
  assert(!JSON.stringify(result).includes('http'));
});
test('tampering, provenance mismatch, real-child claim and any approval escalation are denied',async()=>{
  const {submission,png}=await valid();
  const changed=[
    {providerRunId:'../url'},
    {modelId:''},
    {modelVersion:'invalid model'},
    {promptSha256:'e'.repeat(64)},
    {batchRevision:'d'.repeat(64)},
    {sourceConceptSha256:'0'.repeat(64)},
    {providerTermsSha256:'0'.repeat(64)},
    {commercialLicenseSha256:'0'.repeat(64)},
    {styleVersion:'m5-b-v2'},
    {referenceId:'WU2A-S3-UNKNOWN'},
    {masterSha256:'1'.repeat(64)},
    {containsRealChildData:true},
    {sourceKind:'CLINICAL_RECORD'},
    {approved:true},{publishEnabled:true},{guardianReadEnabled:true},
    {costMicros:-1},{costMicros:Infinity},
  ];
  for(const patch of changed){
    await assert.rejects(validateProductionMaster({
      evidence:evidence(),submission:{...submission,...patch},masterBytes:png,
    }),ProductionAssetError,JSON.stringify(patch));
  }
  const hostile={...submission};
  Object.defineProperty(hostile,'providerRunId',{get(){throw Error('untrusted getter');},enumerable:true});
  await assert.rejects(validateProductionMaster({
    evidence:evidence(),submission:hostile,masterBytes:png,
  }),ProductionAssetError);
  await assert.rejects(validateProductionMaster({
    evidence:evidence(),submission:{...submission,unexpectedFlag:true},masterBytes:png,
  }),ProductionAssetError);
  await assert.rejects(validateProductionMaster({
    evidence:evidence(),submission,masterBytes:mockOriginal(320,240),
  }),ProductionAssetError);
  const corrupted=Buffer.from(png);corrupted[40]^=0xff;
  await assert.rejects(validateProductionMaster({
    evidence:evidence(),submission,masterBytes:corrupted,
  }),ProductionAssetError);
});
test('master is snapshotted before any asynchronous batch read',async()=>{
  const {submission,png}=await valid(),original=sha(png);
  const pending=validateProductionMaster({evidence:evidence(),submission,masterBytes:png});
  png.fill(0);
  const result=await pending;
  assert.equal(result.masterSha256,original);
});
test('inventory rejects duplicates and forged statuses, never promotes 25 receipts to approved imagery',async()=>{
  const plan=await planProductionAssets(evidence());
  const empty=await reconcileProductionAssets(evidence());
  assert.equal(empty.reportedPrivateMasterCount,0);
  assert.equal(empty.remainingProductionMasters,25);
  assert.equal(empty.publishedAssetCoveragePercent,null);
  const entries=plan.slots.map((_,index)=>receipt(plan,index));
  const completed=await reconcileProductionAssets(evidence(),entries);
  assert.equal(completed.reportedPrivateMasterCount,25);
  assert.equal(completed.remainingProductionMasters,0);
  assert.equal(completed.allProductionAssetsApproved,false);
  assert.equal(completed.allActualAssetsIndependentlyVerified,false);
  assert.equal(completed.publishEnabled,false);
  assert.equal(completed.guardianReadEnabled,false);
  assert(completed.entries.every(x=>x.designReview==='NOT_PROVIDED' &&
    x.clinicalReview==='NOT_PROVIDED' && x.published===false));
  const rejected=[
    [entries[0],entries[0]],
    [entries[0],{...entries[1],providerRunId:entries[0].providerRunId}],
    [entries[0],{...entries[1],masterSha256:entries[0].masterSha256}],
    [{...entries[0],status:'APPROVED'}],
    [{...entries[0],batchRevision:'b'.repeat(64)}],
    [{...entries[0],custodyManifestSha256:'bad'}],
    [{...entries[0],unexpected:true}],
  ];
  for(const bad of rejected)await assert.rejects(reconcileProductionAssets(evidence(),bad),ProductionAssetError);
  await assert.rejects(reconcileProductionAssets(evidence(),Array(26).fill(entries[0])),ProductionAssetError);
});
test('operator-only host stage denies missing key/AV; cannot simulate a successful production release',async()=>{
  const {submission,png}=await valid();
  await assert.rejects(admitProductionMasterOnHost({
    root:'/tmp/therabridge-m5-wu2d-synthetic-private-only',
    operatorId:'synthetic-operator',evidence:evidence(),submission,masterBytes:png,
  },{}),ProductionAssetError);
});

test('real private custody staging HMAC-binds model/run provenance to each 3-asset manifest',async()=>{
  const {submission,png}=await valid();
  const root=await mkdtemp(join(tmpdir(),'tb-wu2d-master-'));
  const keyBase64=randomBytes(32).toString('base64');
  try{
    const provenance={
      referenceId:submission.referenceId,
      providerRunId:submission.providerRunId,
      modelId:submission.modelId,modelVersion:submission.modelVersion,
      costMicros:submission.costMicros,masterSha256:submission.masterSha256,
      promptSha256:submission.promptSha256,
      sourceConceptSha256:submission.sourceConceptSha256,
      batchRevision:submission.batchRevision,
    };
    const scanner=async bytes=>({
      verdict:'CLEAN',sha256:sha(bytes),scannedBytes:bytes.length,
      engine:'ClamAV',signatureSetVersion:'synthetic-fixture-v1',
    });
    const receipt=await stagePrivateIllustration({
      root,keyBase64,referenceId:submission.referenceId,
      evidence:evidence(),masterBytes:png,scanner,
      operatorId:'synthetic-operator',productionProvenance:provenance,
    });
    assert.equal(receipt.assetCount,3);
    assert.equal(receipt.status,'PRIVATE_QUARANTINED');
    assert.equal(receipt.published,false);
    const assetRoot=join(root,'bundles',receipt.bundleId);
    const encoded=await readFile(join(assetRoot,'manifest.json'));
    const saved=JSON.parse(encoded.toString('utf8'));
    assert.equal(receipt.manifestSha256,sha(encoded));
    assert.equal(saved.manifest.productionProvenance.modelId,submission.modelId);
    assert.equal(saved.manifest.productionProvenance.providerRunId,submission.providerRunId);
    assert.equal(saved.manifest.productionProvenance.masterSha256,sha(png));
    assert.equal(saved.manifest.productionProvenance.promptSha256,submission.promptSha256);
    assert.equal(saved.manifest.productionProvenance.sourceEvidence,
      'OPERATOR_ASSERTED_NOT_PROVIDER_VERIFIED');
    assert.equal(saved.manifest.productionProvenance.assetClinicalReview,'NOT_PROVIDED');
    assert.equal(saved.manifest.productionProvenance.publishEnabled,false);
    assert.equal(saved.manifest.published,false);
    assert.deepEqual((await readdir(assetRoot)).sort(),
      ['card.tbenc','manifest.json','master.tbenc','square.tbenc']);
    await assert.rejects(stagePrivateIllustration({
      root,keyBase64,referenceId:submission.referenceId,
      evidence:evidence(),masterBytes:png,scanner,
      operatorId:'synthetic-operator',
      productionProvenance:{...provenance,promptSha256:'f'.repeat(64)},
    }),PrivateCustodyError);
    assert.equal((await readdir(join(root,'bundles'))).length,1);
  }finally{
    await rm(root,{recursive:true,force:true});
  }
});
