/**
 * M5-17 — actual PostgreSQL inventory of the existing DRAFT/QUARANTINED
 * architecture. No approved media table, release authority or child data.
 *
 * Private IDs, activity titles, scanner details, source references, raw image
 * bytes and license text NEVER leave this function in the aggregate receipt.
 * All stored activity templates are inventoried, but schema has no active or
 * published flag. Do not call these "published" or invent 100% coverage.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MEDIA_INVENTORY_STATE='BLOCKED_NO_APPROVED_RELEASE_MODEL';
const LIMIT=250;
const MAX_ROWS=10000;
const own=(record,key)=>{
  if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Unsafe inventory row');
  const p=Object.getOwnPropertyDescriptor(record,key);
  if(!p||!Object.hasOwn(p,'value'))throw new TypeError('Missing or accessor-backed inventory field');
  return p.value;
};

async function loadAll(table,where,select){
  const all=[],seen=new Set();
  let cursor=null;
  for(let iteration=0;iteration<=MAX_ROWS/LIMIT;iteration++){
    const page=await table.findMany({
      where,select,orderBy:{id:'asc'},take:LIMIT,
      ...(cursor?{cursor:{id:cursor},skip:1}:{})
    });
    if(!Array.isArray(page)||page.length>LIMIT)throw new Error('Malformed inventory pagination');
    if(!page.length)return all;
    for(const row of page){
      const id=own(row,'id');
      if(typeof id!=='string'||!UUID.test(id)||seen.has(id)||all.length>=MAX_ROWS){
        throw new Error('Invalid, duplicate or oversized activity inventory');
      }
      seen.add(id);all.push(row);
    }
    if(page.length<LIMIT)return all;
    const next=own(page[page.length-1],'id');
    if(cursor===next)throw new Error('Inventory cursor did not advance');
    cursor=next;
  }
  throw new Error('Unbounded media inventory');
}

function aggregate(templates,drafts,candidates,centerId){
  const templateById=new Map(templates.map(t=>[own(t,'id'),t]));
  const draftById=new Map(drafts.map(d=>[own(d,'id'),d]));
  let centerTemplates=0, samples=0, staleDrafts=0, rejected=0, validDrafts=0, otherDrafts=0;
  const byService=new Set();
  for(const t of templates){
    if(own(t,'centerId')===centerId)centerTemplates++;
    else if(own(t,'centerId')===null)samples++;
    else throw new Error('Foreign template entered synthetic inventory');
    if(!Number.isSafeInteger(own(t,'version'))||t.version<1)throw new Error('Invalid template version');
    if(typeof own(t,'service')!=='string'||!t.service)throw new Error('Invalid specialty');
    byService.add(t.service);
  }
  for(const d of drafts){
    const t=templateById.get(own(d,'templateId'));
    if(own(d,'centerId')!==centerId||!t||t.centerId!==centerId){
      throw new Error('Cross-center or missing activity draft');
    }
    if(!['DRAFT','REJECTED'].includes(own(d,'state')))throw new Error('Unrecognized approval state');
    if(d.state==='REJECTED')rejected++;
    if(!Number.isSafeInteger(own(d,'templateVersion'))||d.templateVersion<1)throw new Error('Invalid draft version');
    if(d.templateVersion!==t.version)staleDrafts++;
    else if(d.state==='DRAFT')validDrafts++;
    else otherDrafts++;
  }
  let quarantined=0,revoked=0,staleCandidates=0,orphanCandidates=0,rightsUnverified=0,unsafeState=0;
  for(const c of candidates){
    if(own(c,'centerId')!==centerId||own(c,'kind')!=='ACTIVITY_IMAGE'){
      throw new Error('Cross-center or non-activity candidate entered inventory');
    }
    const t=templateById.get(own(c,'templateId'));
    const d=draftById.get(own(c,'mediaDraftId'));
    if(!t||t.centerId!==centerId||!d||d.templateId!==c.templateId){
      orphanCandidates++; continue;
    }
    if(!Number.isSafeInteger(own(c,'templateVersion'))||c.templateVersion<1){
      throw new Error('Invalid candidate version');
    }
    if(c.templateVersion!==t.version||c.templateVersion!==d.templateVersion)staleCandidates++;
    if(own(c,'rightsState')==='UNVERIFIED')rightsUnverified++;
    // Pending private candidates may never become approved. Any unexpected
    // value is a security finding; do not count it as legal rights acceptance.
    if(!['UNVERIFIED','REJECTED'].includes(c.rightsState))unsafeState++;
    if(c.status==='QUARANTINED' && own(c,'revokedAt')===null && d.state==='DRAFT')quarantined++;
    else if(c.status==='REVOKED' && c.revokedAt!==null)revoked++;
    else unsafeState++;
    if(d.state==='REJECTED'&&c.status==='QUARANTINED'&&c.revokedAt===null)unsafeState++;
  }
  return Object.freeze({
    schemaVersion:1, environment:'ISOLATED_SYNTHETIC_CI',
    evidenceType:'ACTUAL_DATABASE_METADATA_NO_MEDIA_APPROVAL',
    scope:'ONE_CENTER_PLUS_GLOBAL_SAMPLES',
    status:MEDIA_INVENTORY_STATE,
    clinicalGate:'NO_GO_G2_G2b',
    styleReview:'NOT_APPROVED',securityReview:'NOT_APPROVED',
    legalRightsReview:'NOT_APPROVED',designAndClinicalImageReview:'NOT_RUN',
    publishedActivityCount:null, publishedIllustrationCoveragePercent:null,
    publishedActivityStatusAvailable:false, immutableApprovedMediaModelExists:false,
    counts:Object.freeze({
      centerStoredTemplates:centerTemplates,globalSyntheticSamples:samples,
      distinctStoredTemplates:templates.length,distinctServiceIdentifiers:byService.size,
      mediaDrafts:drafts.length,currentVersionUnrejectedDrafts:validDrafts,
      oldVersionDrafts:staleDrafts,rejectedDrafts:rejected,
      currentVersionRejectedDrafts:otherDrafts,
      privateImageCandidates:candidates.length,quarantinedUnrevokedCandidates:quarantined,
      revokedCandidates:revoked,staleVersionCandidates:staleCandidates,
      orphanedCandidates:orphanCandidates,rightsUnverifiedCandidates:rightsUnverified,
      unsafeCandidateStates:unsafeState,
      approvedImages:0,publishedImages:0,
    }),
    pilotEligibility:'NOT_EVALUATED_NO_APPROVED_STYLE_OR_ASSETS',
    screenshotOrImageBytesArchived:false
  });
}

export function validateM5MediaInventoryReceipt(x){
  const fields=['schemaVersion','environment','evidenceType','scope','status','clinicalGate',
    'styleReview','securityReview','legalRightsReview','designAndClinicalImageReview',
    'publishedActivityCount','publishedIllustrationCoveragePercent',
    'publishedActivityStatusAvailable','immutableApprovedMediaModelExists',
    'counts','pilotEligibility','screenshotOrImageBytesArchived'];
  if(!x||typeof x!=='object'||Array.isArray(x)||
     Object.getPrototypeOf(x)!==Object.prototype||Reflect.ownKeys(x).length!==fields.length||
     fields.some(k=>!Object.hasOwn(x,k))||
     x.schemaVersion!==1||x.environment!=='ISOLATED_SYNTHETIC_CI'||
     x.evidenceType!=='ACTUAL_DATABASE_METADATA_NO_MEDIA_APPROVAL'||
     x.scope!=='ONE_CENTER_PLUS_GLOBAL_SAMPLES'||x.status!==MEDIA_INVENTORY_STATE||
     x.clinicalGate!=='NO_GO_G2_G2b'||x.styleReview!=='NOT_APPROVED'||
     x.securityReview!=='NOT_APPROVED'||x.legalRightsReview!=='NOT_APPROVED'||
     x.designAndClinicalImageReview!=='NOT_RUN'||
     x.publishedActivityCount!==null||x.publishedIllustrationCoveragePercent!==null||
     x.publishedActivityStatusAvailable!==false||x.immutableApprovedMediaModelExists!==false||
     x.pilotEligibility!=='NOT_EVALUATED_NO_APPROVED_STYLE_OR_ASSETS'||
     x.screenshotOrImageBytesArchived!==false){
    throw new Error('Invented image/publication approval or unsafe inventory receipt');
  }
  const keys=['centerStoredTemplates','globalSyntheticSamples','distinctStoredTemplates',
    'distinctServiceIdentifiers','mediaDrafts','currentVersionUnrejectedDrafts',
    'oldVersionDrafts','rejectedDrafts','currentVersionRejectedDrafts',
    'privateImageCandidates','quarantinedUnrevokedCandidates','revokedCandidates',
    'staleVersionCandidates','orphanedCandidates','rightsUnverifiedCandidates',
    'unsafeCandidateStates','approvedImages','publishedImages'];
  if(!x.counts||typeof x.counts!=='object'||Array.isArray(x.counts)||
     Object.getPrototypeOf(x.counts)!==Object.prototype||
     Reflect.ownKeys(x.counts).length!==keys.length||
     keys.some(k=>!Object.hasOwn(x.counts,k)||!Number.isSafeInteger(x.counts[k])||
       x.counts[k]<0||x.counts[k]>MAX_ROWS)||
     x.counts.distinctStoredTemplates!==x.counts.centerStoredTemplates+x.counts.globalSyntheticSamples||
     x.counts.approvedImages!==0||x.counts.publishedImages!==0||
     x.counts.currentVersionUnrejectedDrafts+x.counts.oldVersionDrafts+
       x.counts.currentVersionRejectedDrafts!==x.counts.mediaDrafts ||
     x.counts.quarantinedUnrevokedCandidates+x.counts.revokedCandidates>
       x.counts.privateImageCandidates){
    throw new Error('Invalid or privacy-unsafe aggregate counters');
  }
  return true;
}

export async function buildSyntheticMediaInventory(db,centerId){
  const url=new URL(process.env.DATABASE_URL||'');
  if(process.env.DEPLOYMENT_ENV!=='ci'||!['localhost','127.0.0.1'].includes(url.hostname)||
    !url.pathname.endsWith('_demo_test')||typeof centerId!=='string'||!UUID.test(centerId)){
    throw new Error('Media inventory only authorized for isolated synthetic demo database');
  }
  if(typeof db?.$transaction!=='function')throw new TypeError('Database transaction required');
  const result=await db.$transaction(async tx=>{
    const templates=await loadAll(tx.activityTemplate,
      {OR:[{centerId},{centerId:null}]},{id:true,centerId:true,version:true,service:true});
    const drafts=await loadAll(tx.activityMediaDraft,{centerId},
      {id:true,centerId:true,templateId:true,templateVersion:true,state:true});
    const candidates=await loadAll(tx.privateMediaCandidate,{centerId,kind:'ACTIVITY_IMAGE'},
      {id:true,centerId:true,kind:true,templateId:true,templateVersion:true,
       mediaDraftId:true,status:true,rightsState:true,revokedAt:true});
    return aggregate(templates,drafts,candidates,centerId);
  },{isolationLevel:'RepeatableRead',timeout:30000});
  validateM5MediaInventoryReceipt(result);
  if(result.counts.unsafeCandidateStates>0||result.counts.orphanedCandidates>0){
    throw new Error('Invalid or orphaned private media candidate detected in actual synthetic database');
  }
  return result;
}
