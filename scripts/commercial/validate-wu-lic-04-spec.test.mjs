import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCommercialSpec} from './validate-wu-lic-04-spec.mjs';
const read=()=>JSON.parse(readFileSync(new URL('../../docs/commercial/wu-lic-04-activation-contract.json',import.meta.url),'utf8'));
test('validate all three commercial plans while remaining pre-freeze and non-authorizing',()=>{
 const output=validateCommercialSpec(read());
 assert.equal(output.planCount,3);assert.equal(output.editionCount,2);
 assert.equal(output.postFreezeImplementationAllowed,false);
 assert.equal(output.billingAllowed,false);
 assert.equal(output.enterpriseDeploymentAllowed,false);
 assert.equal(output.clinicalAllowed,false);
});
for(const [label,change] of [
 ['reject fake feature freeze',x=>x.featureFreeze.verified=true],
 ['reject fake owner freeze approval',x=>x.featureFreeze.ownerApproval=true],
 ['reject billing enabled',x=>x.runtime.billingEnabled=true],
 ['reject checkout enabled',x=>x.runtime.checkoutEnabled=true],
 ['reject entitlement enforcement before freeze',x=>x.runtime.entitlementEnforcementEnabled=true],
 ['reject removal of clinical disable',x=>delete x.runtime.clinicalReleaseEnabled],
 ['reject actual licensed SaaS claim',x=>x.editions.SAAS.licensed=true],
 ['reject enterprise tier shipped as SaaS',x=>x.plans.ENTERPRISE.edition='SAAS'],
 ['reject paid quota invented',x=>x.plans.STARTER.metrics.staffSeats=12],
 ['reject price invented',x=>x.plans.PROFESSIONAL.metrics.monthlyPriceMinor=60000],
 ['reject clinical feature monetization',x=>x.plans.STARTER.features.push('clinical_report_signing')],
 ['reject automatic overages',x=>x.plans.PROFESSIONAL.overages='AUTO_CHARGE'],
 ['reject disabling legally required export',x=>x.safety.alwaysAvailableOperations.splice(1,1)],
 ['reject billing overriding RBAC',x=>x.safety.billingNeverChangesRoleOrTenantAuthorization=false],
 ['reject ignoring clinical governance',x=>x.safety.billingNeverOverridesG2G2b=false],
 ['reject no terminal state',x=>x.subscription.transitions.TERMINATED=['ACTIVE']],
 ['reject unsafe termination deletion',x=>x.subscription.termination='DELETE_ALL_DATA'],
 ['reject paid mutation across clinical scope',x=>x.subscription.expiry='BLOCK_ALL_ROUTES'],
 ['reject unreviewed grace policy',x=>x.subscription.graceDays=7],
 ['reject price provider activation',x=>x.billing.provider='stripe'],
 ['reject storing card numbers',x=>x.billing.paymentData='STORE_PAN'],
 ['reject financial taxes guessed',x=>x.billing.taxRate='5%'],
 ['reject payment email activation',x=>x.billing.customerEmails='ACTIVE'],
 ['reject unsafe webhook processing',x=>x.billing.webhook='NO_SIGNATURE'],
 ['reject premature route release',x=>x.apiContracts.editionRead.status='LIVE'],
 ['reject unsafe webhook header',x=>x.apiContracts.billingWebhook.headers=[]],
 ['reject missing idempotency',x=>x.apiContracts.editionUpdate.headers=['If-Match']],
 ['reject missing tenant role',x=>x.apiContracts.editionRead.auth='ANY_USER'],
 ['reject missing SaaS DPA onboarding',x=>x.onboarding.SAAS.splice(x.onboarding.SAAS.indexOf('contract_and_dpa_executed'),1)],
 ['reject unreviewed enterprise delivery',x=>x.onboarding.ENTERPRISE.splice(x.onboarding.ENTERPRISE.indexOf('signed_immutable_delivery_digest'),1)],
 ['reject missing Enterprise SBOM',x=>x.enterprise.requiredInfrastructure.splice(x.enterprise.requiredInfrastructure.indexOf('signed_oci_and_runtime_sbom'),1)],
 ['reject local expiry blocking safety export',x=>x.enterprise.offlineBehavior='FAIL_ALL'],
 ['reject approval without rights',x=>x.approvals.enterprise=true],
 ['reject omitting counsel release gate',x=>x.postFreezeReleaseGates.splice(x.postFreezeReleaseGates.indexOf('counsel_separate_edition_approval'),1)],
 ['reject missing restored/rollback testing',x=>x.postFreezeReleaseGates.splice(x.postFreezeReleaseGates.indexOf('backup_restore_and_rollback_drill'),1)]
]){
 test(label,()=>{const c=read();change(c);assert.throws(()=>validateCommercialSpec(c),/WU_LIC_04_SPEC_NOT_AUTHORIZED_/);});
}
