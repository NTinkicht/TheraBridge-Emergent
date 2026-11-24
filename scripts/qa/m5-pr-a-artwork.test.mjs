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

import {verifyStagedArtworkPack} from './m5-pr-a-artwork-pack.mjs';
test('custody verification denies a nonexistent source pack before touching host custody',async()=>{
  await assert.rejects(verifyStagedArtworkPack({packDir:'/nonexistent-m5-source-pack',custodyRoot:'/nonexistent-m5-custody',journalPath:'/nonexistent-m5-journal'}));
});
test('host verification checks exact master and authenticated encrypted assets without public delivery',async()=>{
  const source=await file('scripts/qa/m5-pr-a-artwork-pack.mjs');
  assert.match(source,/rows.length!==pack.verifiedReferences/);
  assert.match(source,/event.assetDigest!==row.manifestSha256/);
  assert.match(source,/manifest.assets\?\.master\?\.sha256!==item.masterSha256/);
  assert.match(source,/decipher.setAuthTag/);
  assert.match(source,/bytes.fill\(0\)/);
  assert.match(source,/verify-staged/);
  assert(!/fetch\(|createServer\(/.test(source));
});

import {spawnSync} from 'node:child_process';
test('isolated operator runtime does not change or expose the application image',async()=>{
  const docker=await file('Dockerfile.artwork-custody');
  const compose=await file('compose.artwork-custody.yaml');
  const script=await file('scripts/qa/artwork-custody-entrypoint.sh');
  assert.match(docker,/clamav-daemon/);assert.match(docker,/USER node/);
  assert(!/EXPOSE|COPY \. \/|COPY \. \./.test(docker));
  assert.match(compose,/network_mode: none/);assert.match(compose,/read_only: true/);
  assert.match(compose,/cap_drop: \[ALL\]/);assert.match(compose,/no-new-privileges:true/);
  assert.equal((compose.match(/create_host_path: false/g)||[]).length,4);
  assert(!/^\s*ports:/m.test(compose));
  assert.match(script,/StreamMaxLength 16M/);assert.match(script,/LocalSocketMode 0600/);
  assert.match(script,/mmin -2880/);assert.match(script,/verify-staged/);
  assert.equal(spawnSync('bash',['-n'],{input:script}).status,0);
  const denied=spawnSync('bash',['-c',script,'artwork-custody','invalid'],{encoding:'utf8'});
  assert.notEqual(denied.status,0);assert.match(denied.stderr,/preflight failed/);
});

test('complete local gallery stays on the authorized staff branch, not family activity cards',async()=>{
 const page=await file('apps/web/src/app/app/activities/page.tsx');
 const gallery=await file('apps/web/src/components/clinical/GeneratedArtworkGallery.tsx');
 assert.match(page,/\['THERAPIST','CLINICAL_SUPERVISOR'\]\.includes\(session.activeContext.role\)/);
 assert(page.indexOf('<GeneratedArtworkGallery')<page.indexOf('function FamilyActivities'));
 assert(!page.slice(page.indexOf('function FamilyActivities')).includes('<GeneratedArtworkGallery'));
 assert.match(gallery,/files.length!==GENERATED_ARTWORK.length/);
 assert.match(gallery,/verifyGeneratedReviewBytes/);
 assert(!/fetch\(|localStorage|sessionStorage|dangerouslySetInnerHTML/.test(gallery));
});
