import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GENERATED_ARTWORK,findGeneratedArtwork,verifyGeneratedReviewBytes}
  from '../../apps/web/src/lib/generated-artwork.mjs';
import {ILLUSTRATION_REFERENCE_SLOTS} from '../../apps/web/src/lib/illustration-style.mjs';
const file=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
test('all 25 locked real image identities align with the canonical matrix and server',async()=>{
  assert.equal(GENERATED_ARTWORK.length,25);
  assert.deepEqual(GENERATED_ARTWORK.map(x=>x.referenceId),ILLUSTRATION_REFERENCE_SLOTS.map(x=>x.id));
  const api=await file('apps/api/src/clinical/generated-artwork-reference.ts');
  for(const x of GENERATED_ARTWORK){
    assert(Object.isFrozen(x));assert.equal(x.approved,false);assert.equal(x.publishEnabled,false);
    assert.equal(x.clinicalReleaseEnabled,false);
    assert(x.reviewByteLength<=512*1024);assert(x.alt.length>10);
    assert(api.includes("'"+x.referenceId+"': { digest:'"+x.reviewSha256+"', bytes:"+x.reviewByteLength+" }"));
    assert.equal(findGeneratedArtwork(x.referenceId),x);
  }
  assert.equal(new Set(GENERATED_ARTWORK.map(x=>x.reviewSha256)).size,25);
  assert.equal(findGeneratedArtwork('__proto__'),null);
  assert.equal(findGeneratedArtwork({toString(){throw Error('must not coerce');}}),null);
});
test('reject substitutions, incorrect PNG dimensions and forged identities',async()=>{
  const a=GENERATED_ARTWORK[0], b=new Uint8Array(a.reviewByteLength);
  assert.equal(await verifyGeneratedReviewBytes(a.referenceId,b),false);
  assert.equal(await verifyGeneratedReviewBytes(a.referenceId,new Uint8Array(33)),false);
  assert.equal(await verifyGeneratedReviewBytes('wrong',b),false);
  const v=new DataView(b.buffer);
  v.setUint32(0,0x89504e47);v.setUint32(4,0x0d0a1a0a);v.setUint32(8,13);v.setUint32(12,0x49484452);
  v.setUint32(16,400);v.setUint32(20,300);b[24]=8;b[25]=2;
  assert.equal(await verifyGeneratedReviewBytes(a.referenceId,b),false);
});
test('staff-only local preview, server verification before scanning, no guardian delivery',async()=>{
  const panel=await file('apps/web/src/components/clinical/ActivityMediaDraftPanel.tsx');
  const selector=await file('apps/web/src/components/clinical/GeneratedArtworkSelector.tsx');
  const service=await file('apps/api/src/clinical/activity-media.service.ts');
  assert.match(panel,/GeneratedArtworkSelector/);
  assert.match(panel,/asset.reviewSha256/);
  assert.match(selector,/verifyGeneratedReviewBytes/);assert.match(selector,/URL.revokeObjectURL/);
  assert.match(selector,/alt=\{preview.asset.alt\}/);
  assert(!/fetch\(|localStorage|sessionStorage|dangerouslySetInnerHTML/.test(selector));
  assert(service.indexOf('assertGeneratedReferenceBytes(prior.sourceReference,pngBase64)')<service.indexOf('const ready=await this.preparePngCandidate'));
  assert.match(service,/assertGeneratedReferenceScope\(dto.sourceReference,t.service,dto.sceneType\)/);
  for(const path of ['ActivityCard.tsx','SessionActivityPicker.tsx','PrivateIllustrationStepPreview.tsx']){
    const s=await file('apps/web/src/components/clinical/'+path);
    assert(!s.includes('GeneratedArtworkSelector'));
  }
});
