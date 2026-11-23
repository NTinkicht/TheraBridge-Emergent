import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {M5_MEDIA_CHAIN_STAGES,mediaEvidenceSubject,canonicalMediaApproval,
  verifyMediaHumanReceipt,inspectM5MediaApprovalChain} from './m5-media-approval-chain.mjs';
const hex=c=>c.repeat(64);
const ID='11111111-1111-4111-8111-111111111111';
const TEMPLATE='22222222-2222-4222-8222-222222222222';
const style=mediaEvidenceSubject('STYLE',{
  styleVersion:'m5-b-v1',guideSha256:hex('a'),referenceBoardSha256:hex('b')});
const security=mediaEvidenceSubject('SECURITY',{
  implementationSha256:hex('c'),threatModelSha256:hex('d'),
  scannerPolicySha256:hex('e'),storagePolicySha256:hex('f')});
const asset=mediaEvidenceSubject('ASSET',{
  centerId:ID,templateId:TEMPLATE,templateVersion:7,candidateSha256:hex('1'),
  styleSubjectSha256:style,securitySubjectSha256:security,
  rightsEvidenceSha256:hex('2'),derivativesSha256:hex('3'),altLocalizationSha256:hex('4')});
const args=(receipts,trustAnchors,assetSubjectSha256=asset)=>({
  styleSubjectSha256:style,securitySubjectSha256:security,assetSubjectSha256,
  receipts,trustAnchors,
});
function createHumanReceipts(){
  // Temporary in-memory test keys are never proof of ANY real human review.
  const trustAnchors=new Map(),receipts=[];
  for(const [stage,roles] of Object.entries(M5_MEDIA_CHAIN_STAGES)){
    for(const role of roles){
      const reviewerId='test-reviewer-'+role.toLowerCase().replace(/_/g,'-');
      const pair=generateKeyPairSync('ed25519');
      trustAnchors.set(reviewerId,{publicKey:pair.publicKey.export({format:'pem',type:'spki'}),allowedRoles:[role]});
      const receipt={
        schemaVersion:1,stage,role,
        subjectSha256:stage==='STYLE'?style:stage==='SECURITY'?security:asset,
        reviewerId,signedAt:'2026-11-22T12:00:00.000Z',
        decision:'APPROVED',signatureB64:'A'.repeat(86)+'==',
      };
      receipt.signatureB64=sign(null,canonicalMediaApproval(receipt),pair.privateKey).toString('base64');
      assert.equal(verifyMediaHumanReceipt(receipt,trustAnchors),true);
      receipts.push(receipt);
    }
  }
  return {receipts,trustAnchors};
}
test('M5-13/14 require actual approved guide+reference and threat/storage implementation digests',()=>{
  assert.match(style,/^[0-9a-f]{64}$/);
  assert.match(security,/^[0-9a-f]{64}$/);
  assert.match(asset,/^[0-9a-f]{64}$/);
  assert.notEqual(style,security);
  assert.throws(()=>mediaEvidenceSubject('STYLE',{
    styleVersion:'m5-b-v1',guideSha256:hex('a'),referenceBoardSha256:'NOT_APPROVED'}));
  assert.throws(()=>mediaEvidenceSubject('ASSET',{
    centerId:ID,templateId:TEMPLATE,templateVersion:7,candidateSha256:hex('1'),
    styleSubjectSha256:style,securitySubjectSha256:security,
    rightsEvidenceSha256:hex('2'),derivativesSha256:hex('3'),altLocalizationSha256:'NOT_RUN'}));
  assert.throws(()=>mediaEvidenceSubject('SECURITY',{implementationSha256:hex('c')}));
});
test('M5-13 style+M5-14 security approvals block all downstream imagery by default',()=>{
  const result=inspectM5MediaApprovalChain(args([],new Map()));
  assert.equal(result.status,'BLOCKED_STYLE_HUMAN_APPROVAL');
  assert.equal(result.verifiedStyleEvidence,false);
  assert.equal(result.verifiedSecurityEvidence,false);
  assert.equal(result.verifiedAssetEvidence,false);
  assert.equal(result.missingRoles.length,8);
  assert.equal(result.publishEnabled,false);
  assert.equal(result.readEnabled,false);
  assert.equal(result.clinicalReleaseEnabled,false);
  assert.equal(result.clinicalGate,'NO_GO_G2_G2b');
});
test('M5 real cryptographic evidence may qualify OFFLINE review, never public release',()=>{
  const {receipts,trustAnchors}=createHumanReceipts();
  const r=inspectM5MediaApprovalChain(args(receipts,trustAnchors));
  assert.equal(r.status,'OFFLINE_EVIDENCE_VERIFIED_NO_PUBLICATION_AUTHORITY');
  assert.equal(r.verifiedStyleEvidence,true);
  assert.equal(r.verifiedSecurityEvidence,true);
  assert.equal(r.verifiedAssetEvidence,true);
  assert.equal(r.missingRoles.length,0);
  assert.equal(r.publishEnabled,false);
  assert.equal(r.readEnabled,false);
  assert.equal(r.clinicalReleaseEnabled,false);
  assert.equal(r.clinicalGate,'NO_GO_G2_G2b');
  const beforeAsset=inspectM5MediaApprovalChain(args(receipts,trustAnchors,null));
  assert.equal(beforeAsset.status,'UPSTREAM_EVIDENCE_VERIFIED_NO_ASSET_SELECTED');
  assert.equal(beforeAsset.verifiedAssetEvidence,false);
});
test('M5 forged approvals, crossed subjects, revoked keys or false reviewer claims never pass',()=>{
  const {receipts,trustAnchors}=createHumanReceipts();
  for(const mutation of [
    rows=>{rows[0].signatureB64='A'.repeat(86)+'==';},
    rows=>{rows[0].subjectSha256=hex('9');},
    rows=>{rows[0].decision='REJECTED';},
    rows=>{rows[0].signedAt='2099-01-01T12:00:00.000Z';},
    rows=>{rows[0].reviewerId='unknown-reviewer';},
    rows=>{rows[0].publicKey='self-supplied-should-never-qualify';},
    rows=>{rows[0].role='LEGAL_RIGHTS';},
    rows=>{rows[0].userEmail='sensitive@example.org';},
    rows=>{rows[0].signatureB64={ value:'A'.repeat(86)+'==' };},
  ]){
    const changed=structuredClone(receipts);mutation(changed);
    const r=inspectM5MediaApprovalChain(args(changed,trustAnchors));
    assert.equal(r.verifiedStyleEvidence,false);
    assert.equal(r.publishEnabled,false);
  }
  const revoked=new Map(trustAnchors);
  revoked.set(receipts[0].reviewerId,{...revoked.get(receipts[0].reviewerId),revoked:true});
  assert.equal(inspectM5MediaApprovalChain(args(receipts,revoked)).verifiedStyleEvidence,false);
  assert.equal(inspectM5MediaApprovalChain(args(receipts,new Map())).verifiedStyleEvidence,false);
});
test('M5 independent roles cannot be filled by duplicated or reused reviewer identity',()=>{
  const {receipts,trustAnchors}=createHumanReceipts();
  const duplicate=[...receipts,structuredClone(receipts[0])];
  assert.equal(inspectM5MediaApprovalChain(args(duplicate,trustAnchors)).verifiedStyleEvidence,false);
  const changed=structuredClone(receipts);
  const second=changed[1];
  // Theft of one signature never creates an additional authorized human.
  second.reviewerId=changed[0].reviewerId;
  assert.equal(inspectM5MediaApprovalChain(args(changed,trustAnchors)).verifiedStyleEvidence,false);
  assert.equal(verifyMediaHumanReceipt({...receipts[0],signatureB64:'A'.repeat(86)+'=='},trustAnchors),false);
});
test('M5 approved words alone are not evidence and no unknown subject can qualify',()=>{
  const {receipts,trustAnchors}=createHumanReceipts();
  const noKeys=inspectM5MediaApprovalChain(args(
    receipts.map(r=>({...r,signatureB64:'A'.repeat(86)+'=='})),new Map()));
  assert.equal(noKeys.status,'BLOCKED_STYLE_HUMAN_APPROVAL');
  const wrongSubject=inspectM5MediaApprovalChain({
    ...args(receipts,trustAnchors),securitySubjectSha256:hex('0')
  });
  assert.equal(wrongSubject.status,'BLOCKED_SECURITY_PRIVACY_APPROVAL');
  const missingRights=inspectM5MediaApprovalChain(args(
    receipts.filter(r=>r.role!=='LEGAL_RIGHTS'),trustAnchors));
  assert.equal(missingRights.status,'BLOCKED_ASSET_RIGHTS_AND_CLINICAL_REVIEW');
});
