/**
 * M5 WU2-F — isolated SYNTHETIC-DB pilot readiness, NOT a release verifier.
 *
 * Reads the canonical center-scoped inventory under one repeatable-read
 * transaction, matches operator-proposed template/version -> immutable
 * illustration-reference slots, and refuses fabricated published coverage.
 * No child, real patient, asset bytes, URL, storage paths, reviewer signatures,
 * clinical policy, or authorization to publish pass through this module.
 */
import {createHash} from 'node:crypto';
import {buildSyntheticMediaInventory,validateM5MediaInventoryReceipt}
  from './m5-media-inventory.mjs';
import {reconcileProductionAssets} from './m5-wu2d-production-assets.mjs';
import {ILLUSTRATION_FAMILIES,ILLUSTRATION_SCENE_ARCHETYPES,
  ILLUSTRATION_STYLE_VERSION} from '../../apps/web/src/lib/illustration-style.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
const MAX_TEMPLATES=10000,MAX_PILOT=25;
const EVIDENCE_KEYS=['providerId','providerTermsSha256','commercialLicenseSha256'];
const RECEIPT_KEYS=['referenceId','batchRevision','providerRunId','masterSha256',
  'bundleId','custodyManifestSha256','status'];
const PROPOSAL_KEYS=['centerId','templateId','templateVersion','referenceId'];
const BLOCKERS=Object.freeze([
  'PUBLISHED_ACTIVITY_RELEASE_MODEL_NOT_PRESENT',
  'PRODUCTION_MASTERS_NOT_INDEPENDENTLY_VERIFIED',
  'CLINICAL_DESIGN_AND_RIGHTS_APPROVALS_MISSING',
  'PRIVATE_MEDIA_OPERATIONAL_SECURITY_NOT_QUALIFIED',
  'MANUAL_FIVE_WIDTH_KEYBOARD_SCREEN_READER_NOT_ACCEPTED',
  'CLINICAL_G2_G2B_NO_GO',
]);
const sha=value=>createHash('sha256').update(value).digest('hex');
const own=(o,k)=>{
  if(!o||typeof o!=='object')throw new PilotReadinessError();
  const p=Object.getOwnPropertyDescriptor(o,k);
  if(!p||!Object.hasOwn(p,'value'))throw new PilotReadinessError();
  return p.value;
};
const deny=()=>{throw new PilotReadinessError();};

export const PILOT_PUBLICATION_ENABLED=false;
export class PilotReadinessError extends Error{
  constructor(){super('Illustration pilot evidence denied; publication and approval stay disabled.');}
}
function snapshotPlain(x,keys){
  if(!x||typeof x!=='object'||Array.isArray(x)||
    Object.getPrototypeOf(x)!==Object.prototype)deny();
  const desc=Object.getOwnPropertyDescriptors(x);
  if(Reflect.ownKeys(x).length!==keys.length||
    keys.some(k=>!Object.hasOwn(desc,k)||!Object.hasOwn(desc[k],'value')))deny();
  return Object.freeze(Object.fromEntries(keys.map(k=>[k,desc[k].value])));
}
function snapshotList(xs,keys,max){
  if(!Array.isArray(xs)||Object.getPrototypeOf(xs)!==Array.prototype||
    xs.length>max)deny();
  const desc=Object.getOwnPropertyDescriptors(xs);
  if(Reflect.ownKeys(xs).length!==xs.length+1)deny();
  return Object.freeze(Array.from({length:xs.length},(_,i)=>{
    if(!Object.hasOwn(desc,String(i))||!Object.hasOwn(desc[String(i)],'value'))deny();
    return snapshotPlain(desc[String(i)].value,keys);
  }));
}
function shape(x,keys){
  if(!x||typeof x!=='object'||Array.isArray(x)||
    Object.getPrototypeOf(x)!==Object.prototype||
    Reflect.ownKeys(x).length!==keys.length||keys.some(k=>!Object.hasOwn(x,k)))deny();
}
const countFields=['storedCenterTemplates','syntheticGlobalSamples',
  'privateQuarantineProposals','operatorReportedPrivateMasters','remainingMasterSlots',
  'proposedDistinctStoredActivities'];
const RECEIPT_FIELDS=['schemaVersion','source','status','styleVersion','referenceBatchRevision',
  'sourceInventoryDigestSha256','publishedActivityCount','publishedIllustrationCount',
  'publishedIllustrationCoveragePercent','publishedActivityStatusAvailable',
  'approvedReleaseModelPresent','pilotCandidateMinimum','pilotCandidateMaximum',
  'reportedPilotProposalCount','reportedPilotEligibleActivityCount',
  'canStartClinicalPilot','allActualMastersIndependentlyVerified',
  'humanClinicalDesignRightsAcceptance','independentMediaSecurityAcceptance',
  'manualAccessibilityAndFiveWidthAcceptance','counts',
  'families','scenes','blockers','imageUrl','guardianReadEnabled',
  'publishEnabled','clinicalGate','digestIsSignature','receiptSha256'];

function assertNonnegative(x,max=MAX_TEMPLATES){
  if(!Number.isSafeInteger(x)||x<0||x>max)deny();
}
function assertCounts(x,names,expectedTotal){
  shape(x,names);
  let total=0;
  for(const name of names){
    const n=own(x,name);assertNonnegative(n,MAX_PILOT);total+=n;
  }
  if(total!==expectedTotal)deny();
}
/** Validate *structure and fail-closed truth*, not authenticity or ownership. */
export function validateBlockedPilotReceipt(x){
  shape(x,RECEIPT_FIELDS);
  if(own(x,'schemaVersion')!==1||own(x,'source')!=='SYNTHETIC_DB_AND_OPERATOR_REPORTS'||
    own(x,'status')!=='BLOCKED_FOR_EXTERNAL_APPROVAL'||
    own(x,'styleVersion')!==ILLUSTRATION_STYLE_VERSION||
    typeof own(x,'referenceBatchRevision')!=='string'||
    !SHA.test(own(x,'referenceBatchRevision'))||
    typeof own(x,'sourceInventoryDigestSha256')!=='string'||
    !SHA.test(own(x,'sourceInventoryDigestSha256'))||
    own(x,'publishedActivityCount')!==null||
    own(x,'publishedIllustrationCount')!==null||
    own(x,'publishedIllustrationCoveragePercent')!==null||
    own(x,'publishedActivityStatusAvailable')!==false||
    own(x,'approvedReleaseModelPresent')!==false||
    own(x,'pilotCandidateMinimum')!==20||own(x,'pilotCandidateMaximum')!==30||
    own(x,'reportedPilotEligibleActivityCount')!==null||
    own(x,'canStartClinicalPilot')!==false||
    own(x,'allActualMastersIndependentlyVerified')!==false||
    own(x,'humanClinicalDesignRightsAcceptance')!=='NOT_VERIFIED'||
    own(x,'independentMediaSecurityAcceptance')!=='NOT_VERIFIED'||
    own(x,'manualAccessibilityAndFiveWidthAcceptance')!=='NOT_RUN'||
    own(x,'imageUrl')!==null||own(x,'guardianReadEnabled')!==false||
    own(x,'publishEnabled')!==false||own(x,'clinicalGate')!=='NO_GO_G2_G2b'||
    own(x,'digestIsSignature')!==false)deny();
  const n=own(x,'counts');shape(n,countFields);
  for(const k of countFields)assertNonnegative(own(n,k));
  if(n.operatorReportedPrivateMasters>25||
    n.remainingMasterSlots!==25-n.operatorReportedPrivateMasters||
    n.proposedDistinctStoredActivities>Math.min(MAX_PILOT,n.storedCenterTemplates)||
    n.privateQuarantineProposals>n.proposedDistinctStoredActivities+MAX_TEMPLATES ||
    own(x,'reportedPilotProposalCount')!==n.proposedDistinctStoredActivities)deny();
  assertCounts(own(x,'families'),[...ILLUSTRATION_FAMILIES],n.proposedDistinctStoredActivities);
  assertCounts(own(x,'scenes'),[...ILLUSTRATION_SCENE_ARCHETYPES],n.proposedDistinctStoredActivities);
  const blockers=own(x,'blockers');
  if(!Array.isArray(blockers)||blockers.length!==BLOCKERS.length||
    blockers.some((v,i)=>v!==BLOCKERS[i]))deny();
  const digest=own(x,'receiptSha256');
  if(typeof digest!=='string'||!SHA.test(digest))deny();
  const {receiptSha256:ignored,...body}=x;
  if(sha(JSON.stringify(body))!==digest)deny();
  return true;
}
/** Runs only against the isolated local CI demo DB, never production. */
export async function buildSyntheticIllustrationPilot({
  db,centerId,evidence,privateReceipts=[],pilotProposals=[],
}){
  try{
    if(typeof centerId!=='string'||!UUID.test(centerId)||
      !db||typeof db.$transaction!=='function')deny();
    // Snapshot every untrusted input, including arrays, before the first await.
    const safeEvidence=snapshotPlain(evidence,EVIDENCE_KEYS);
    const candidateReceipts=snapshotList(privateReceipts,RECEIPT_KEYS,25);
    const candidates=snapshotList(pilotProposals,PROPOSAL_KEYS,MAX_PILOT);
    const result=await db.$transaction(async tx=>{
      if(!tx||!tx.activityTemplate||typeof tx.activityTemplate.findMany!=='function')deny();
      // One consistent repeatable-read snapshot for canonical inventory AND
      // proposed template/version matches. The inner adapter never commits.
      const inventory=await buildSyntheticMediaInventory({
        $transaction:fn=>fn(tx),
      },centerId);
      validateM5MediaInventoryReceipt(inventory);
      const templates=await tx.activityTemplate.findMany({
        where:{centerId},
        select:{id:true,centerId:true,version:true,service:true},
        orderBy:{id:'asc'},take:MAX_TEMPLATES+1,
      });
      if(!Array.isArray(templates)||templates.length>MAX_TEMPLATES||
        templates.length!==inventory.counts.centerStoredTemplates)deny();
      const byTemplate=new Map();
      for(const t of templates){
        const id=own(t,'id'),scope=own(t,'centerId'),
          version=own(t,'version'),service=own(t,'service');
        if(typeof id!=='string'||!UUID.test(id)||scope!==centerId||
          !Number.isSafeInteger(version)||version<1||
          typeof service!=='string'||!service||byTemplate.has(id))deny();
        byTemplate.set(id,{version,service});
      }
      const privateInventory=await reconcileProductionAssets(safeEvidence,candidateReceipts);
      if(privateInventory.slots!==25||
        privateInventory.allActualAssetsIndependentlyVerified!==false||
        privateInventory.publishedAssetCoveragePercent!==null||
        privateInventory.guardianReadEnabled!==false)deny();
      const byReference=new Map(privateInventory.entries.map(x=>[x.referenceId,x]));
      if(byReference.size!==25)deny();
      const seenTemplates=new Set(),seenRefs=new Set();
      const families=Object.fromEntries(ILLUSTRATION_FAMILIES.map(x=>[x,0]));
      const scenes=Object.fromEntries(ILLUSTRATION_SCENE_ARCHETYPES.map(x=>[x,0]));
      const familyForService=Object.freeze({
        speech:'speech',occupational:'occupational',feeding:'occupational',
        behavioral:'behavioral',developmental:'behavioral',physical:'physical',
      });
      for(const p of candidates){
        if(typeof p.centerId!=='string'||p.centerId!==centerId||
          typeof p.templateId!=='string'||!UUID.test(p.templateId)||
          typeof p.referenceId!=='string'||
          !Number.isSafeInteger(p.templateVersion)||p.templateVersion<1||
          seenTemplates.has(p.templateId)||seenRefs.has(p.referenceId))deny();
        const t=byTemplate.get(p.templateId),slot=byReference.get(p.referenceId);
        if(!t||!slot||t.version!==p.templateVersion||
          familyForService[t.service]!==slot.family)deny();
        seenTemplates.add(p.templateId);seenRefs.add(p.referenceId);
        families[slot.family]++; scenes[slot.scene]++;
      }
      const counts=Object.freeze({
        storedCenterTemplates:inventory.counts.centerStoredTemplates,
        syntheticGlobalSamples:inventory.counts.globalSyntheticSamples,
        privateQuarantineProposals:inventory.counts.quarantinedUnrevokedCandidates,
        operatorReportedPrivateMasters:privateInventory.reportedPrivateMasterCount,
        remainingMasterSlots:privateInventory.remainingProductionMasters,
        proposedDistinctStoredActivities:seenTemplates.size,
      });
      const body=Object.freeze({
        schemaVersion:1,source:'SYNTHETIC_DB_AND_OPERATOR_REPORTS',
        status:'BLOCKED_FOR_EXTERNAL_APPROVAL',
        styleVersion:ILLUSTRATION_STYLE_VERSION,
        referenceBatchRevision:privateInventory.batchRevision,
        sourceInventoryDigestSha256:sha(JSON.stringify(inventory)),
        publishedActivityCount:null,publishedIllustrationCount:null,
        publishedIllustrationCoveragePercent:null,
        publishedActivityStatusAvailable:false,approvedReleaseModelPresent:false,
        pilotCandidateMinimum:20,pilotCandidateMaximum:30,
        reportedPilotProposalCount:seenTemplates.size,
        reportedPilotEligibleActivityCount:null,canStartClinicalPilot:false,
        allActualMastersIndependentlyVerified:false,
        humanClinicalDesignRightsAcceptance:'NOT_VERIFIED',
        independentMediaSecurityAcceptance:'NOT_VERIFIED',
        manualAccessibilityAndFiveWidthAcceptance:'NOT_RUN',
        counts,families:Object.freeze(families),scenes:Object.freeze(scenes),
        blockers:BLOCKERS,imageUrl:null,guardianReadEnabled:false,
        publishEnabled:false,clinicalGate:'NO_GO_G2_G2b',digestIsSignature:false,
      });
      const receipt=Object.freeze({...body,receiptSha256:sha(JSON.stringify(body))});
      validateBlockedPilotReceipt(receipt);
      return receipt;
    },{isolationLevel:'RepeatableRead',timeout:30000});
    return result;
  }catch{deny();}
}
