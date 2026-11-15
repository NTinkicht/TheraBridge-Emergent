#!/usr/bin/env node
// COM-05 non-activating design contract, not a license issuer or clinical policy.
import {readFileSync} from 'node:fs';
const keys=(v,expected)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===expected.length&&expected.every(k=>Object.hasOwn(v,k));
const editions=['STARTER','PROFESSIONAL','ENTERPRISE'];
const fields=['users','centers','children','storageGb','aiUnits'];
const states=['TRIAL','ACTIVE','GRACE','EXPIRED','SUSPENDED','CANCELLED'];
const safeguards=[
 'tenantIsolationIndependentOfSubscription','authorizationIndependentOfBilling',
 'clinicalGovernanceCannotBeGrantedByEntitlement','consentCannotBeGrantedByEntitlement',
 'safeguardingCannotBeGrantedByEntitlement','auditHistoryImmutableAcrossExpiry',
 'lawfulDataExportAvailableAcrossExpiry','requiredRetentionAvailableAcrossExpiry',
 'emergencyClinicalContinuityNotBlockedByBilling','failedLicenseServerCannotGrantNewEntitlements',
 'licenseExpiryCannotDeletePatientData','noUnapprovedPhoneHome','g2NoGo','g2bNoGo'
];
function assess(policy){
 if(!keys(policy,['schema','status','pricingApproved','commercialLicenseGranted',
  'runtimeEnforcementEnabled','editions','subscriptionStates','invariants','activation','lifecycle'])||
  policy.schema!=='therabridge-com05-entitlement-design-v1'||
  policy.status!=='DRAFT_NOT_ENABLED'||policy.pricingApproved!==false||
  policy.commercialLicenseGranted!==false||policy.runtimeEnforcementEnabled!==false)
   throw Error('COM05_POLICY_NOT_AN_UNAPPROVED_DRAFT');
 if(!Array.isArray(policy.editions)||policy.editions.length!==editions.length||
   new Set(policy.editions.map(e=>e?.key)).size!==editions.length)
  throw Error('COM05_EDITION_SET_MISMATCH');
 for(const edition of editions){
  const item=policy.editions.find(x=>x.key===edition);
  if(!keys(item,['key','status','limits','overagePolicy'])||
     item.status!=='UNPRICED_UNAPPROVED'||item.overagePolicy!=='UNDECIDED'||
     !keys(item.limits,fields)||fields.some(k=>item.limits[k]!==null))
    throw Error('COM05_PREMATURE_EDITIONS_OR_QUOTAS');
 }
 if(!Array.isArray(policy.subscriptionStates)||policy.subscriptionStates.length!==states.length||
    new Set(policy.subscriptionStates).size!==states.length||
    states.some(x=>!policy.subscriptionStates.includes(x)))
    throw Error('COM05_UNSAFE_SUBSCRIPTION_STATES');
 if(!keys(policy.invariants,[...safeguards,'gracePeriodDurationApproved'])||
    safeguards.some(x=>policy.invariants[x]!==true)||
    policy.invariants.gracePeriodDurationApproved!==false)
    throw Error('COM05_SAFETY_INVARIANT_CHANGED');
 if(!keys(policy.activation,['enabled','approvedIssuer','offlineLicenseVerification','enterpriseInstallationBinding'])||
    policy.activation.enabled!==false||policy.activation.approvedIssuer!==null||
    policy.activation.offlineLicenseVerification!==false||
    policy.activation.enterpriseInstallationBinding!=='UNDECIDED')
    throw Error('COM05_UNAUTHORIZED_ACTIVATION');
 if(!keys(policy.lifecycle,['renewalAutomationEnabled','suspensionAutomationEnabled','automaticPatientDataDeletionEnabled'])||
    Object.values(policy.lifecycle).some(v=>v!==false))
    throw Error('COM05_UNAUTHORIZED_LIFECYCLE_MUTATION');
 return {schema:'therabridge-com05-entitlement-draft-assessment-v1',
  status:'SPECIFICATION_ONLY_NOT_ACTIVATED',editions,
  subscriptionStates:states,pricingApproved:false,
  runtimeEnforcementEnabled:false,commercialLicenseGranted:false,
  protectedClinicalGate:'G2_G2B_NO_GO',humanPolicyDecisionsRemaining:true};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  if(process.argv.length!==3)throw Error('USAGE: verify-com05-policy.mjs policy.json');
  console.log(JSON.stringify(assess(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
 }catch(e){console.error('COM05_DRAFT_POLICY_REJECTED',e.message);process.exitCode=1;}
}
export {assess};
