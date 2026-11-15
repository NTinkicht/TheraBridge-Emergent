import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assess} from './verify-com05-policy.mjs';
const baseline=JSON.parse(readFileSync(new URL('../../docs/commercial/com05-entitlement-design.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(baseline);
test('all three editions are draft with no fictitious quota, price or commercial approval',()=>{
 const result=assess(copy());
 assert.equal(result.runtimeEnforcementEnabled,false);
 assert.equal(result.commercialLicenseGranted,false);
 assert.deepEqual(result.editions,['STARTER','PROFESSIONAL','ENTERPRISE']);
});
test('rejects forged enterprise grant or preconfigured edition price/quota',()=>{
 const a=copy();a.commercialLicenseGranted=true;assert.throws(()=>assess(a),/COM05_/);
 const b=copy();b.editions[2].limits.users=100;assert.throws(()=>assess(b),/COM05_/);
 const c=copy();c.editions[0].overagePolicy='AUTOMATIC_CHARGE';assert.throws(()=>assess(c),/COM05_/);
});
test('prevents licensing expiry from deleting data or preventing lawful export',()=>{
 const a=copy();a.invariants.licenseExpiryCannotDeletePatientData=false;assert.throws(()=>assess(a),/COM05_/);
 const b=copy();b.invariants.lawfulDataExportAvailableAcrossExpiry=false;assert.throws(()=>assess(b),/COM05_/);
 const c=copy();c.lifecycle.automaticPatientDataDeletionEnabled=true;assert.throws(()=>assess(c),/COM05_/);
});
test('billing may not grant clinical consent, bypass tenant boundaries or change G2/G2b',()=>{
 const a=copy();a.invariants.consentCannotBeGrantedByEntitlement=false;assert.throws(()=>assess(a),/COM05_/);
 const b=copy();b.invariants.tenantIsolationIndependentOfSubscription=false;assert.throws(()=>assess(b),/COM05_/);
 const c=copy();c.invariants.g2bNoGo=false;assert.throws(()=>assess(c),/COM05_/);
});
test('rejects unauthorized phone-home, unknown issuer, default grace or licensing-service fallback',()=>{
 const a=copy();a.invariants.noUnapprovedPhoneHome=false;assert.throws(()=>assess(a),/COM05_/);
 const b=copy();b.activation.approvedIssuer='synthetic';assert.throws(()=>assess(b),/COM05_/);
 const c=copy();c.invariants.gracePeriodDurationApproved=true;assert.throws(()=>assess(c),/COM05_/);
 const d=copy();d.invariants.failedLicenseServerCannotGrantNewEntitlements=false;assert.throws(()=>assess(d),/COM05_/);
});
test('rejects automatic suspension or policy activation',()=>{
 const a=copy();a.lifecycle.suspensionAutomationEnabled=true;assert.throws(()=>assess(a),/COM05_/);
 const b=copy();b.activation.enabled=true;assert.throws(()=>assess(b),/COM05_/);
 const c=copy();c.runtimeEnforcementEnabled=true;assert.throws(()=>assess(c),/COM05_/);
});
test('rejects missing, duplicated or altered edition/state definitions',()=>{
 const a=copy();a.editions.pop();assert.throws(()=>assess(a),/COM05_/);
 const b=copy();b.editions[1].key='STARTER';assert.throws(()=>assess(b),/COM05_/);
 const c=copy();c.subscriptionStates[5]='ACTIVE';assert.throws(()=>assess(c),/COM05_/);
});
