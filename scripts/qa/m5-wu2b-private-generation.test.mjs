import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {
  PRIVATE_GENERATION_TEMPLATE,PRIVATE_MASTER_SIZE,
  PRIVATE_PIPELINE_RELEASE_ENABLED,PrivatePipelineError,
  makePrivateGenerationBatch,inspectPrivateMaster,
} from './m5-wu2b-private-generation.mjs';
import {
  privateReferenceCatalogue,filterPrivateReferenceCatalogue,
} from '../../apps/web/src/lib/private-illustration-catalogue.mjs';

const sha = value => value.repeat(64);
const evidence = () => ({
  providerId:'fictional-approved-provider-1',
  providerTermsSha256:sha('a'), commercialLicenseSha256:sha('b'),
});
const crc32=buffer=>{
  let crc=0xffffffff;
  for(const octet of buffer){
    crc^=octet;
    for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
};
const pngChunk=(type,data)=>{
  const out=Buffer.alloc(12+data.length);
  out.writeUInt32BE(data.length,0);out.write(type,4,'ascii');
  data.copy(out,8);
  out.writeUInt32BE(crc32(out.subarray(4,8+data.length)),8+data.length);
  return out;
};
const pngMaster=()=>{
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(1600,0);ihdr.writeUInt32BE(1200,4);
  ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.alloc(1200*(1+1600*4));
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a','hex'),
    pngChunk('IHDR',ihdr),pngChunk('IDAT',deflateSync(raw)),
    pngChunk('IEND',Buffer.alloc(0)),
  ]);
};

test('reference catalogue includes exact 25 immutable private text-only entries',()=>{
  const all=privateReferenceCatalogue();
  assert.equal(all.length,25);
  assert.equal(new Set(all.map(x=>x.id)).size,25);
  assert.equal(filterPrivateReferenceCatalogue({family:'speech'}).length,5);
  assert.equal(filterPrivateReferenceCatalogue({scene:'home-support'}).length,5);
  assert.equal(filterPrivateReferenceCatalogue({family:'unknown'}).length,0);
  for(const x of all){
    assert.equal(x.styleVersion,'m5-b-v1');
    assert.equal(x.imageUrl,null);
    assert.equal(x.storageKey,null);
    assert.equal(x.publishEnabled,false);
    assert.equal(x.guardianReadEnabled,false);
    assert.equal(x.previewAvailable,false);
    assert.equal(Object.isFrozen(x),true);
    assert.match(x.accessibleLabel,/image pending review/);
  }
});
test('generation plan is pinned to same 25 exact refs and has zero release/provider side effects',async()=>{
  const batch=await makePrivateGenerationBatch(evidence());
  const again=await makePrivateGenerationBatch(evidence());
  assert.equal(batch.batchRevision,again.batchRevision);
  assert.equal(batch.jobs.length,25);
  assert.equal(batch.styleVersion,'m5-b-v1');
  assert.equal(PRIVATE_GENERATION_TEMPLATE,'m5-b-v1/private-generation-brief-v1');
  assert.deepEqual(PRIVATE_MASTER_SIZE,{width:1600,height:1200,safeSquare:1200});
  assert.equal(PRIVATE_PIPELINE_RELEASE_ENABLED,false);
  assert.equal(batch.generationEnabled,false);
  assert.equal(batch.published,false);
  assert.equal(batch.clinicalGate,'NO_GO_G2_G2b');
  assert.deepEqual(new Set(batch.jobs.map(j=>j.referenceId)),
    new Set(privateReferenceCatalogue().map(j=>j.id)));
  for(const job of batch.jobs){
    assert.equal(job.status,'PLANNED_PRIVATE_ONLY');
    assert.equal(job.publishEnabled,false);
    assert.equal(job.guardianReadEnabled,false);
    assert.equal(job.imageUrl,null);
    assert.equal(job.storageKey,null);
    assert.equal(job.providerTermsSha256,sha('a'));
    assert.equal(job.commercialLicenseSha256,sha('b'));
    assert(!/patient name|clinical note|real child/i.test(job.prompt));
    assert.equal(Object.isFrozen(job),true);
  }
  assert.throws(()=>{batch.jobs[0].publishEnabled=true;},TypeError);
});
test('missing, malformed, accessor or unbounded license/provider evidence fails closed',async()=>{
  for(const x of [{}, {providerId:'fake',providerTermsSha256:sha('a'),commercialLicenseSha256:''},
    {providerId:'https://evil.example',providerTermsSha256:sha('a'),commercialLicenseSha256:sha('b')},
    {providerId:'safe-provider',providerTermsSha256:sha('g'),commercialLicenseSha256:sha('b')}])
    await assert.rejects(makePrivateGenerationBatch(x),PrivatePipelineError);
  let calls=0;
  const poisoned={get providerId(){calls++;throw Error('must not invoke');}};
  await assert.rejects(makePrivateGenerationBatch(poisoned),PrivatePipelineError);
  assert.equal(calls,0);
});
test('structurally valid 1600x1200 synthetic PNG only reaches private quarantine preflight',async()=>{
  const job=(await makePrivateGenerationBatch(evidence())).jobs[0];
  const png=pngMaster();
  const r=inspectPrivateMaster(job,png);
  assert.equal(r.status,'QUARANTINE_PENDING_FULL_DECODE_AV_AND_HUMAN_REVIEW');
  assert.equal(r.width,1600);assert.equal(r.height,1200);
  assert.equal(r.structuralPreflightOnly,true);
  assert.equal(r.scanVerified,false);
  assert.equal(r.rightsVerified,false);
  assert.equal(r.imageUrl,null);
  assert.equal(r.readEnabled,false);
  assert.equal(r.published,false);
  assert.equal(r.clinicalGate,'NO_GO_G2_G2b');
  const wrongSize=Buffer.from(png);wrongSize.writeUInt32BE(1599,16);
  for(const bytes of [wrongSize,png.subarray(0,40),Buffer.alloc(120),
    Buffer.concat([png,Buffer.from('junk')]),Buffer.alloc(12*1024*1024+1)]){
    assert.throws(()=>inspectPrivateMaster(job,bytes),PrivatePipelineError);
  }
  const altered={...job,styleVersion:'m5-b-v999'};
  assert.throws(()=>inspectPrivateMaster(altered,png),PrivatePipelineError);
  assert.throws(()=>inspectPrivateMaster({...job,publishEnabled:true},png),PrivatePipelineError);
});
