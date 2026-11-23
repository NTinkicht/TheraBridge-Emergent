import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ILLUSTRATION_REFERENCE_SLOTS,ILLUSTRATION_STYLE_STATE,ILLUSTRATION_STYLE_VERSION}
  from '../../apps/web/src/lib/illustration-style.mjs';
import {REFERENCE_PINS} from './m5-wu2a-review-integrity.mjs';
const path=new URL('../../docs/product/M5-WU2A-THERAPIST-CONCEPT-APPROVAL-REPORT.json',import.meta.url);
const read=async()=>JSON.parse(await readFile(path,'utf8'));
const SHA=/^[a-f0-9]{64}$/;
function validate(x){
  assert.equal(x.schemaVersion,1);
  assert.equal(x.recordedOn,'2026-11-23');
  assert.equal(x.styleVersion,ILLUSTRATION_STYLE_VERSION);
  assert.equal(ILLUSTRATION_STYLE_STATE,'CANDIDATE_NOT_APPROVED');
  assert.equal(x.referencePack.zipSha256,REFERENCE_PINS.zip);
  assert.equal(x.referencePack.manifestSha256,REFERENCE_PINS.manifest);
  assert.equal(x.referencePack.contactSha256,REFERENCE_PINS.contact);
  assert.equal(x.referencePack.sourceSha256,REFERENCE_PINS.source);
  assert.equal(x.referencePack.previewSize,'320x240');
  assert.equal(x.referencePack.productionMastersProvided,false);
  assert.equal(x.report.subject,'ALL_25_CONCEPT_PREVIEWS');
  assert.equal(x.report.outcome,'ALL_25_ACCEPTED_AS_REPORTED');
  assert.equal(x.report.evidenceStatus,'USER_REPORTED_NOT_SIGNED_OR_IDENTITY_VERIFIED');
  assert.equal(x.report.clinicianName,null);
  assert.equal(x.report.clinicianRegistryVerified,false);
  assert.equal(x.report.clinicalStyleEd25519Receipt,null);
  assert.equal(x.gates.ownerStyleApproval,'NOT_VERIFIED');
  assert.equal(x.gates.designStyleApproval,'NOT_VERIFIED');
  assert.equal(x.gates.clinicalStyleSignedApproval,'NOT_PROVIDED');
  assert.equal(x.gates.independentPrivacySecurityApproval,'NOT_APPROVED');
  assert.equal(x.gates.legalIpRights,'NOT_APPROVED');
  assert.equal(x.gates.productionImageClinicalReview,'NOT_RUN');
  assert.equal(x.gates.approvedImageDelivery,'DISABLED');
  assert.equal(x.gates.clinicalGate,'NO_GO_G2_G2b');
  assert(Array.isArray(x.concepts)&&x.concepts.length===25);
  const ids=new Set(),paths=new Set(),digests=new Set();
  for(const [i,item] of x.concepts.entries()){
    const slot=ILLUSTRATION_REFERENCE_SLOTS[i],row=Math.floor(i/5),col=i%5;
    assert.deepEqual(Object.keys(item).sort(),[
      'referenceId','scene','family','fileName','sha256','conceptReview',
      'signedClinicianEvidence','productionAssetReview','publishEnabled'].sort());
    assert.equal(item.referenceId,slot.id);
    assert.equal(item.scene,slot.scene);
    assert.equal(item.family,slot.family);
    assert.equal(item.fileName,String(row+1).padStart(2,'0')+'-'+
      String(col+1).padStart(2,'0')+'-'+item.family+'-'+item.scene+'.webp');
    assert(SHA.test(item.sha256));
    assert(!ids.has(item.referenceId)&&!paths.has(item.fileName)&&!digests.has(item.sha256));
    ids.add(item.referenceId);paths.add(item.fileName);digests.add(item.sha256);
    assert.equal(item.conceptReview,'ACCEPTED_AS_REPORTED_BY_USER');
    assert.equal(item.signedClinicianEvidence,'NOT_PROVIDED');
    assert.equal(item.productionAssetReview,'NOT_EVALUATED');
    assert.equal(item.publishEnabled,false);
  }
  return true;
}
test('reports therapist acceptance for each of 25 hash-bound concepts without granting publication',async()=>{
  assert.equal(validate(await read()),true);
});
test('cannot upgrade user-reported concept feedback to authenticated human approval or clinical release',async()=>{
  const original=await read();
  for(const mutate of [
    x=>{x.report.clinicianRegistryVerified=true;},
    x=>{x.report.clinicalStyleEd25519Receipt={signature:'fake'};},
    x=>{x.gates.clinicalStyleSignedApproval='APPROVED';},
    x=>{x.gates.clinicalGate='GO';},
    x=>{x.concepts[0].publishEnabled=true;},
    x=>{x.concepts[0].signedClinicianEvidence='APPROVED';},
    x=>{x.referencePack.manifestSha256='0'.repeat(64);},
    x=>{x.concepts.pop();},
    x=>{x.concepts[0].childName='private data';},
    x=>{x.concepts[0].referenceId='wrong';},
  ]){const next=structuredClone(original);mutate(next);assert.throws(()=>validate(next));}
});
