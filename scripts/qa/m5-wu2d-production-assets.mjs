/**
 * M5 WU2-D: 25-slot production artwork intake + PRIVATE QA inventory.
 * No provider call, client route, image publication, patient imagery,
 * reviewer-signature substitution or public/guardian asset read.
 */
import {createHash} from 'node:crypto';
import {makePrivateGenerationBatch,inspectPrivateMaster} from './m5-wu2b-private-generation.mjs';
import {stagePrivateIllustrationOnHost} from './m5-wu2c-private-custody.mjs';

const SHA=/^[0-9a-f]{64}$/;
const LABEL=/^[A-Za-z0-9][A-Za-z0-9._:-]{3,95}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export const PRODUCTION_IMAGE_PUBLICATION_ENABLED=false;
export const WU2D_STYLE_VERSION='m5-b-v1';
export class ProductionAssetError extends Error {
  constructor(){super('Production illustration intake denied; no publication is permitted.');}
}
const deny=()=>{throw new ProductionAssetError();};
const INPUT_KEYS=Object.freeze([
  'referenceId','sourceConceptSha256','styleVersion','promptSha256',
  'batchRevision','providerId','providerTermsSha256','commercialLicenseSha256',
  'providerRunId','modelId','modelVersion','costMicros','masterSha256',
  'sourceKind','containsRealChildData','approved','publishEnabled','guardianReadEnabled',
]);
function snapshotPlain(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.getPrototypeOf(value)!==Object.prototype)deny();
  const desc=Object.getOwnPropertyDescriptors(value);
  if(Reflect.ownKeys(value).length!==keys.length ||
     keys.some(key=>!Object.hasOwn(desc,key)||!Object.hasOwn(desc[key],'value')))deny();
  return Object.freeze(Object.fromEntries(keys.map(key=>[key,desc[key].value])));
}
function validLabel(value){return typeof value==='string'&&LABEL.test(value);}
function getJob(batch,id){
  const job=batch.jobs.find(item=>item.referenceId===id);
  if(!job)deny();
  return job;
}

/** Derive the ONLY allowed 5 × 5 production scope from the SHA-pinned batch. */
export async function planProductionAssets(evidence){
  try{
    const batch=await makePrivateGenerationBatch(evidence);
    if(batch.jobs.length!==25||batch.styleVersion!==WU2D_STYLE_VERSION||
       batch.published!==false||batch.generationEnabled!==false)deny();
    const slots=Object.freeze(batch.jobs.map(job=>Object.freeze({
      referenceId:job.referenceId,scene:job.scene,family:job.family,
      sourceConceptSha256:job.sourceConceptSha256,
      styleVersion:job.styleVersion,promptSha256:job.promptSha256,
      templateVersion:job.templateVersion,
      providerId:job.providerId,
      providerTermsSha256:job.providerTermsSha256,
      commercialLicenseSha256:job.commercialLicenseSha256,
      expectedMaster:Object.freeze({width:1600,height:1200,format:'PNG'}),
      safeSquare:Object.freeze({x:200,y:0,width:1200,height:1200}),
      state:'AWAITING_REAL_PRODUCTION_MASTER',approved:false,
      imageUrl:null,publishEnabled:false,guardianReadEnabled:false,
    })));
    if(new Set(slots.map(s=>s.referenceId)).size!==25)deny();
    return Object.freeze({
      schemaVersion:1,batchRevision:batch.batchRevision,
      sourcePackSha256:batch.sourcePackSha256,styleVersion:batch.styleVersion,
      plannedCount:25,productionMastersProvided:0,
      independentAssetReview:'NOT_PROVIDED',
      providerGenerationExecuted:false,published:false,guardianReadEnabled:false,
      clinicalGate:'NO_GO_G2_G2b',slots,
    });
  }catch{deny();}
}

/** Validate operator-reported provider provenance against an actual 1600×1200 PNG. */
export async function validateProductionMaster({evidence,submission,masterBytes}){
  // Snapshot untrusted bytes BEFORE the first async boundary.
  if(!Buffer.isBuffer(masterBytes)||masterBytes.length<60||
     masterBytes.length>12*1024*1024)deny();
  const bytes=Buffer.from(masterBytes);
  try{
    const claim=snapshotPlain(submission,INPUT_KEYS);
    const batch=await makePrivateGenerationBatch(evidence);
    const job=getJob(batch,claim.referenceId);
    if(claim.styleVersion!==WU2D_STYLE_VERSION||
       claim.sourceConceptSha256!==job.sourceConceptSha256||
       claim.promptSha256!==job.promptSha256||
       claim.batchRevision!==batch.batchRevision||
       claim.providerId!==job.providerId||
       claim.providerTermsSha256!==job.providerTermsSha256||
       claim.commercialLicenseSha256!==job.commercialLicenseSha256||
       !validLabel(claim.providerRunId)||!validLabel(claim.modelId)||
       !validLabel(claim.modelVersion)||
       !Number.isSafeInteger(claim.costMicros)||claim.costMicros<0||
       claim.costMicros>1_000_000_000||
       typeof claim.masterSha256!=='string'||!SHA.test(claim.masterSha256)||
       claim.sourceKind!=='ORIGINAL_FICTIONAL_GENERATED'||
       claim.containsRealChildData!==false||
       claim.approved!==false||claim.publishEnabled!==false||
       claim.guardianReadEnabled!==false)deny();
    const digest=sha(bytes);
    if(digest!==claim.masterSha256)deny();
    const checked=inspectPrivateMaster(job,bytes);
    if(checked.sha256!==digest||checked.width!==1600||checked.height!==1200||
       checked.published!==false||checked.readEnabled!==false)deny();
    return Object.freeze({
      referenceId:job.referenceId,scene:job.scene,family:job.family,
      styleVersion:job.styleVersion,batchRevision:batch.batchRevision,
      sourceConceptSha256:job.sourceConceptSha256,promptSha256:job.promptSha256,
      providerId:job.providerId,
      providerTermsSha256:job.providerTermsSha256,
      commercialLicenseSha256:job.commercialLicenseSha256,
      providerRunId:claim.providerRunId,modelId:claim.modelId,
      modelVersion:claim.modelVersion,costMicros:claim.costMicros,
      masterSha256:digest,masterDimensions:Object.freeze([1600,1200]),
      sourceKind:'OPERATOR_ASSERTED_FICTIONAL_MASTER_NOT_INDEPENDENTLY_VERIFIED',
      rightsVerified:false,assetDesignApproved:false,assetClinicalApproved:false,
      status:'PRIVATE_PREFLIGHT_ONLY',published:false,readEnabled:false,
      guardianReadEnabled:false,clinicalGate:'NO_GO_G2_G2b',
    });
  }catch{deny();}
}

/**
 * Actual operator-only execution path. Existing host adapter MUST supply the
 * real scanner and secret; neither may be provided in an HTTP payload.
 * The returned receipt is NOT a trusted reviewer signature, delivery grant,
 * independent rights proof or end-to-end production infrastructure approval.
 */
export async function admitProductionMasterOnHost({
  root,operatorId,evidence,submission,masterBytes,nowMs,retentionDays,
},env=process.env){
  if(!Buffer.isBuffer(masterBytes))deny();
  const snapshot=Buffer.from(masterBytes);
  try{
    // Snapshot all caller-owned metadata BEFORE first await; the same rights
    // evidence is used for preflight and the authenticated custody manifest.
    const fixedEvidence=snapshotPlain(evidence,[
      'providerId','providerTermsSha256','commercialLicenseSha256',
    ]);
    const fixedSubmission=snapshotPlain(submission,INPUT_KEYS);
    const provenance=await validateProductionMaster({
      evidence:fixedEvidence,submission:fixedSubmission,masterBytes:snapshot,
    });
    const productionProvenance={
      referenceId:provenance.referenceId,
      providerRunId:provenance.providerRunId,modelId:provenance.modelId,
      modelVersion:provenance.modelVersion,costMicros:provenance.costMicros,
      masterSha256:provenance.masterSha256,promptSha256:provenance.promptSha256,
      sourceConceptSha256:provenance.sourceConceptSha256,
      batchRevision:provenance.batchRevision,
    };
    const staged=await stagePrivateIllustrationOnHost({
      root,operatorId,evidence:fixedEvidence,referenceId:provenance.referenceId,
      masterBytes:snapshot,productionProvenance,nowMs,retentionDays,
    },env);
    if(!staged||staged.status!=='PRIVATE_QUARANTINED'||
       staged.assetCount!==3||staged.storageEncrypted!==true||
       staged.scannerReportedClean!==true||
       staged.published!==false||staged.readEnabled!==false||
       staged.guardianReadEnabled!==false||
       !UUID.test(staged.bundleId||'')||!SHA.test(staged.manifestSha256||''))deny();
    return Object.freeze({
      ...provenance,bundleId:staged.bundleId,
      custodyManifestSha256:staged.manifestSha256,
      custodyAuditSequence:staged.auditSequence,
      privateMasterAndDerivatives:3,
      status:'PRIVATE_QUARANTINED_PENDING_INDEPENDENT_ASSET_QA',
      storageStatus:'OPERATOR_SCANNED_ENCRYPTED_NOT_PRODUCTION_QUALIFIED',
      approved:false,published:false,readEnabled:false,
      guardianReadEnabled:false,clinicalGate:'NO_GO_G2_G2b',
    });
  }catch{deny();}
  finally{snapshot.fill(0);}
}

const RECEIPT_KEYS=Object.freeze([
  'referenceId','batchRevision','providerRunId','masterSha256',
  'bundleId','custodyManifestSha256','status',
]);
/**
 * Inventory consumes only minimal, NON-authoritative receipt projections.
 * It never declares assets approved even for 25/25 syntactically valid entries.
 */
export async function reconcileProductionAssets(evidence,inputReceipts=[]){
  try{
    const batch=await makePrivateGenerationBatch(evidence);
    if(!Array.isArray(inputReceipts)||inputReceipts.length>25)deny();
    const byRef=new Map(),runs=new Set(),masters=new Set(),bundles=new Set();
    for(const value of inputReceipts){
      const receipt=snapshotPlain(value,RECEIPT_KEYS);
      const job=getJob(batch,receipt.referenceId);
      if(receipt.batchRevision!==batch.batchRevision||
         receipt.status!=='PRIVATE_QUARANTINED_PENDING_INDEPENDENT_ASSET_QA'||
         !validLabel(receipt.providerRunId)||
         typeof receipt.masterSha256!=='string'||
         typeof receipt.custodyManifestSha256!=='string'||
         typeof receipt.bundleId!=='string'||
         !SHA.test(receipt.masterSha256)||!SHA.test(receipt.custodyManifestSha256)||
         !UUID.test(receipt.bundleId)||
         byRef.has(job.referenceId)||runs.has(receipt.providerRunId)||
         masters.has(receipt.masterSha256)||bundles.has(receipt.bundleId))deny();
      byRef.set(job.referenceId,receipt);
      runs.add(receipt.providerRunId);
      masters.add(receipt.masterSha256);
      bundles.add(receipt.bundleId);
    }
    const entries=Object.freeze(batch.jobs.map(job=>{
      const recorded=byRef.get(job.referenceId);
      return Object.freeze({
        referenceId:job.referenceId,scene:job.scene,family:job.family,
        state:recorded?'OPERATOR_REPORTED_PRIVATE_QUARANTINE_UNVERIFIED':
          'PRODUCTION_MASTER_NOT_PROVIDED',
        masterSha256:recorded?.masterSha256??null,
        designReview:'NOT_PROVIDED',clinicalReview:'NOT_PROVIDED',
        rightsReview:'NOT_VERIFIED',securityReview:'NOT_VERIFIED',
        accessibleAltReview:'NOT_RUN',published:false,guardianReadEnabled:false,
      });
    }));
    return Object.freeze({
      schemaVersion:1,batchRevision:batch.batchRevision,slots:25,
      reportedPrivateMasterCount:byRef.size,
      remainingProductionMasters:25-byRef.size,
      allActualAssetsIndependentlyVerified:false,
      allProductionAssetsApproved:false,
      publishedAssetCoveragePercent:null,
      humanDesignClinicalRightsAcceptance:'NOT_PROVIDED',
      operationalMediaSecurityAcceptance:'NOT_VERIFIED',
      guardianReadEnabled:false,publishEnabled:false,clinicalGate:'NO_GO_G2_G2b',
      entries,
    });
  }catch{deny();}
}
