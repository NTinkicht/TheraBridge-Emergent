import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assess} from './verify-launch-decision.mjs';
const input=JSON.parse(readFileSync(new URL('../../docs/commercial/launch-decision-register.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(input);
test('separate SaaS and Enterprise have explicit unresolved evidence and no commercial or clinical approval',()=>{
 const result=assess(clone());
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.editions.SAAS.status,'BLOCKED');
 assert.equal(result.editions.ENTERPRISE.status,'BLOCKED');
 assert.ok(result.editions.ENTERPRISE.missingEvidence.includes('thirdPartyRedistributionRights'));
 assert.ok(result.editions.SAAS.missingEvidence.includes('thirdPartyNetworkRights'));
 assert.equal(result.commercialAuthorization,false);
 assert.equal(result.clinicalAuthorization,false);
});
test('forged SaaS approval is rejected',()=>{const r=clone();r.editions.SAAS.status='APPROVED';assert.throws(()=>assess(r),/UNTRUSTED/);});
test('forged enterprise image digest is not independently verified',()=>{const r=clone();r.editions.ENTERPRISE.releaseDigest='sha256:'+'f'.repeat(64);assert.throws(()=>assess(r),/UNTRUSTED/);});
test('missing and duplicate legal obligations fail closed',()=>{
 const r=clone();r.editions.SAAS.required[0]=r.editions.SAAS.required[1];assert.throws(()=>assess(r),/UNTRUSTED/);
 const s=clone();s.editions.ENTERPRISE.required.pop();assert.throws(()=>assess(s),/UNTRUSTED/);
});
test('fake signed evidence or unexpected fields cannot be used to approve',()=>{
 const r=clone();r.editions.SAAS.evidence.counselApproval='SIGNED';assert.throws(()=>assess(r),/UNTRUSTED/);
 const s=clone();s.commercialLicenseGranted=true;assert.throws(()=>assess(s),/UNTRUSTED/);
});
test('clinical G2/G2b and personal-data protection cannot be bypassed',()=>{
 const a=clone();a.clinical.g2='GO';assert.throws(()=>assess(a),/UNTRUSTED/);
 const b=clone();b.clinical.realPatientProcessingAllowed=true;assert.throws(()=>assess(b),/UNTRUSTED/);
});
