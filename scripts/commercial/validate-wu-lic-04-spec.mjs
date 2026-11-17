#!/usr/bin/env node
// WU-LIC-04: non-authorizing pre-freeze specification checker.
// This intentionally contains NO runtime entitlement, billing or clinical switch.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const REQUIRED_STATES=['TRIAL','ACTIVE','PAST_DUE','GRACE','EXPIRED','SUSPENDED','TERMINATED'];
const EDITIONS=['SAAS','ENTERPRISE'],PLANS=['STARTER','PROFESSIONAL','ENTERPRISE'];
const SAFETY=['authenticated_read_previously_authorized_records','legally_required_data_export','audit_record_access','security_incident_response','privacy_request_handling','necessary_safety_handover'];
const FORBIDDEN=['clinical_report_signing','therapist_report_release','real_patient_ai_processing','clinical_consent_grant','clinical_g2_or_g2b_override'];
const REQUIRED_GATES=['documented_v1_freeze_owner_signoff','commercial_owner_entity_and_ip_verified','counsel_separate_edition_approval','signed_exact_release_oci_and_sbom','package_asset_rights_resolved','billing_finance_tax_approval','privacy_security_data_residency_signoff','clinical_g2_g2b_separate_authorization_for_real_patient_processing','tenant_isolation_and_adversarial_migration_tests','backup_restore_and_rollback_drill','independent_codex_review_and_full_ci'];
const fail=x=>{throw Error('WU_LIC_04_SPEC_NOT_AUTHORIZED_'+x)};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const unique=a=>Array.isArray(a)&&new Set(a).size===a.length;
const onlyKeys=(value,keys)=>value&&eq(Object.keys(value).sort(),[...keys].sort());
export function validateCommercialSpec(x){
 if(x?.schema!=='therabridge-wu-lic-04-commercial-spec-v1'||
  x.stage!=='SPECIFICATION_ONLY_PRE_V1_FEATURE_FREEZE'||
  x.featureFreeze?.verified!==false||x.featureFreeze.ownerApproval!==false||
  x.featureFreeze.approvalArtifactSha256!==null||x.featureFreeze.featureFreezeCommit!==null)
  fail('FREEZE_CLAIM');
 if(!onlyKeys(x.runtime,['billingEnabled','entitlementEnforcementEnabled','checkoutEnabled','enterpriseActivationEnabled','realCustomerOnboardingEnabled','clinicalReleaseEnabled','automaticProductionMigrationEnabled'])||
  Object.values(x.runtime).some(v=>v!==false))fail('RUNTIME_BEFORE_FREEZE');
 if(!onlyKeys(x.editions,EDITIONS)||x.editions.SAAS.delivery!=='OWNER_HOSTED'||
  x.editions.ENTERPRISE.delivery!=='CUSTOMER_MANAGED_SIGNED_BUNDLE'||
  !eq(x.editions.SAAS.plans,['STARTER','PROFESSIONAL'])||
  !eq(x.editions.ENTERPRISE.plans,['ENTERPRISE'])||
  EDITIONS.some(e=>x.editions[e].licensed!==false||x.editions[e].actualDeploymentScope!=='NOT_AUTHENTICATED'))
  fail('EDITION_BOUNDARY');
 if(!onlyKeys(x.plans,PLANS)||PLANS.some(p=>{
  const v=x.plans[p];return v?.edition!==(p==='ENTERPRISE'?'ENTERPRISE':'SAAS')||
    v.overages!=='BLOCKED_UNTIL_CONTRACTED'||!unique(v.features)||
    v.features.some(f=>!['nonclinical_center_admin','nonclinical_scheduling','synthetic_demo','nonclinical_reporting','customer_managed_deployment'].includes(f))||
    !v.metrics||Object.values(v.metrics).some(q=>!['TBD_FINANCE','TBD_CONTRACT'].includes(q))||
    Object.keys(v.metrics).some(q=>/price/i.test(q)&&!String(v.metrics[q]).startsWith('TBD_'));
 }))fail('UNAPPROVED_PRICING_OR_FEATURES');
 if(!x.safety||!eq(x.safety.alwaysAvailableOperations,SAFETY)||
  !eq(x.safety.neverLicensedBySubscription,FORBIDDEN)||
  x.safety.billingNeverChangesRoleOrTenantAuthorization!==true||
  x.safety.billingNeverOverridesG2G2b!==true||x.safety.publicRepoNotLicense!==true)
  fail('SAFETY_ACCESS');
 const sub=x.subscription;
 if(!sub||!eq(sub.states,REQUIRED_STATES)||
  !onlyKeys(sub.transitions,REQUIRED_STATES)||REQUIRED_STATES.some(s=>
    !unique(sub.transitions[s])||sub.transitions[s].some(t=>!REQUIRED_STATES.includes(t)||t===s))||
  sub.transitions.TERMINATED.length!==0||!sub.transitions.ACTIVE.includes('SUSPENDED')||
  !sub.transitions.GRACE.includes('EXPIRED')||!sub.transitions.TRIAL.includes('EXPIRED')||
  sub.graceDays!=='TBD_OWNER_POLICY'||sub.activation!=='REQUIRES_FINANCE_AND_LEGAL_EVIDENCE'||
  sub.billingProviderUnavailable!=='NO_UNVERIFIED_GRANT_AND_PRESERVE_SAFETY_ACCESS'||
  sub.expiry!=='RESTRICT_ONLY_PAID_NONCLINICAL_NEW_MUTATIONS'||
  sub.termination!=='NEVER_AUTOMATICALLY_DELETE_PATIENT_OR_REGULATED_RECORDS')
  fail('SUBSCRIPTION_OR_SAFETY_TRANSITIONS');
 if(x.billing?.provider!=='UNSELECTED'||x.billing.currency!=='TBD_FINANCE'||
  x.billing.vatJurisdiction!=='TBD_TAX_COUNSEL'||x.billing.taxRate!=='TBD_TAX_COUNSEL'||
  x.billing.invoiceNumber!=='UNASSIGNED'||x.billing.chargeAuthorization!=='BLOCKED'||
  x.billing.customerEmails!=='BLOCKED'||x.billing.paymentData!=='PROVIDER_HOSTED_NEVER_STORE_CARD_PAN'||
  x.billing.ledger!=='APPEND_ONLY_RECONCILED'||
  x.billing.webhook!=='REQUIRES_VERIFIED_SIGNATURE_AND_IDEMPOTENCY')
  fail('PAYMENT_OR_TAX_FALSE_APPROVAL');
 if(!onlyKeys(x.apiContracts,['editionRead','editionUpdate','billingWebhook','enterpriseActivation'])||
  Object.values(x.apiContracts).some(api=>api?.status!=='POST_FREEZE'||!/^\/api\/commercial\//.test(api.path)||!['GET','POST'].includes(api.method)||
   !String(api.auth).includes('ADMIN')&&!String(api.auth).includes('SIGNATURE'))||
  !x.apiContracts.editionUpdate.headers.includes('Idempotency-Key')||
  !x.apiContracts.editionUpdate.headers.includes('If-Match')||
  !x.apiContracts.billingWebhook.headers.includes('provider-signature'))
  fail('API_OR_WEBHOOK_CONTRACT');
 if(!onlyKeys(x.onboarding,EDITIONS)||EDITIONS.some(e=>!unique(x.onboarding[e])||
  !x.onboarding[e].includes('separate_edition_launch_authorization'))||
  !x.onboarding.ENTERPRISE.includes('signed_immutable_delivery_digest')||
  !x.onboarding.SAAS.includes('contract_and_dpa_executed')||
  !unique(x.enterprise?.requiredInfrastructure)||
  !x.enterprise.requiredInfrastructure.includes('signed_oci_and_runtime_sbom')||
  !x.enterprise.requiredInfrastructure.includes('third_party_notices_and_source_offers')||
  x.enterprise.distribution!=='MUST_BE_SIGNED_REAL_BUNDLE_AND_DELIVERY_RECEIPT'||
  !x.enterprise.offlineBehavior.includes('NEVER_BLOCK_SAFETY_EXPORT'))
  fail('ONBOARDING_OR_ENTERPRISE_DEPLOYMENT');
 if(!unique(x.postFreezeReleaseGates)||REQUIRED_GATES.some(g=>!x.postFreezeReleaseGates.includes(g))||
  !onlyKeys(x.approvals,['productPricing','finance','legal','security','privacy','release','saas','enterprise','clinicalG2','clinicalG2b'])||
  Object.values(x.approvals).some(a=>a!==false))
  fail('APPROVAL_OR_FREEZE_GATE');
 return {schema:'therabridge-wu-lic-04-contract-qualification-v1',
  status:'VALID_SPEC_ONLY_NO_RUNTIME_ACTIVATION',editionCount:2,planCount:3,
  postFreezeImplementationAllowed:false,billingAllowed:false,
  enterpriseDeploymentAllowed:false,clinicalAllowed:false};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{if(process.argv.length!==3)fail('USAGE');
 const result=validateCommercialSpec(JSON.parse(readFileSync(process.argv[2],'utf8')));
 console.log(JSON.stringify(result));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
