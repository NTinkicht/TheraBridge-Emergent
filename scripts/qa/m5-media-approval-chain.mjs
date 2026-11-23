/**
 * M5-13/14/15: OFFLINE EVIDENCE VALIDATOR, NOT AN API/PUBLISH/CONSENT GRANT.
 * The public repository ships NO trust anchors and NO human approvals.
 * Independently provisioned Ed25519 public keys/role assignments are required.
 * A typed APPROVED string, license field or self-signed embedded key does not
 * authorize media. Runtime approved-snapshot and G2/G2b remain disabled.
 */
import {createHash,createPublicKey,verify} from 'node:crypto';
export const M5_MEDIA_STYLE_VERSION='m5-b-v1';
export const M5_MEDIA_CHAIN_STAGES=Object.freeze({
  STYLE:Object.freeze(['OWNER_STYLE','DESIGN_STYLE','CLINICAL_STYLE']),
  SECURITY:Object.freeze(['SECURITY_STORAGE','PRIVACY_STORAGE']),
  ASSET:Object.freeze(['LEGAL_RIGHTS','DESIGN_ASSET','CLINICAL_ASSET']),
});
const SHA=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAME=/^[a-z0-9][a-z0-9._-]{2,95}$/;
const exact=(obj,fields)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
  Object.getPrototypeOf(obj)===Object.prototype&&Reflect.ownKeys(obj).length===fields.length&&
  fields.every(key=>Object.hasOwn(obj,key) &&
    Object.hasOwn(Object.getOwnPropertyDescriptor(obj,key),'value'));
const sha=value=>createHash('sha256').update(value).digest('hex');

export function mediaEvidenceSubject(kind,input){
  if(kind==='STYLE'){
    const keys=['styleVersion','guideSha256','referenceBoardSha256'];
    if(!exact(input,keys)||input.styleVersion!==M5_MEDIA_STYLE_VERSION||
       !SHA.test(input.guideSha256)||!SHA.test(input.referenceBoardSha256)){
      throw new TypeError('Style standard/reference board must be immutable and digest-pinned');
    }
    return sha(JSON.stringify(['M5-13',...keys.map(k=>input[k])]));
  }
  if(kind==='SECURITY'){
    const keys=['implementationSha256','threatModelSha256','scannerPolicySha256','storagePolicySha256'];
    if(!exact(input,keys)||keys.some(k=>!SHA.test(input[k]))){
      throw new TypeError('Media storage/scan/security review requires all four immutable digests');
    }
    return sha(JSON.stringify(['M5-14',...keys.map(k=>input[k])]));
  }
  if(kind==='ASSET'){
    const keys=['centerId','templateId','templateVersion','candidateSha256','styleSubjectSha256',
      'securitySubjectSha256','rightsEvidenceSha256','derivativesSha256','altLocalizationSha256'];
    if(!exact(input,keys)||!UUID.test(input.centerId)||!UUID.test(input.templateId)||
       !Number.isSafeInteger(input.templateVersion)||input.templateVersion<1||
       keys.slice(3).some(k=>!SHA.test(input[k]))){
      throw new TypeError('Asset approval must bind tenant, template version, candidate and rights/crops/alt digests');
    }
    return sha(JSON.stringify(['M5-15/16',...keys.map(k=>input[k])]));
  }
  throw new TypeError('Unknown illustration evidence subject');
}

export function canonicalMediaApproval(receipt){
  const fields=['schemaVersion','stage','role','subjectSha256','reviewerId','signedAt','decision','signatureB64'];
  if(!exact(receipt,fields)||receipt.schemaVersion!==1||
     !Object.hasOwn(M5_MEDIA_CHAIN_STAGES,receipt.stage)||
     !M5_MEDIA_CHAIN_STAGES[receipt.stage].includes(receipt.role)||
     typeof receipt.subjectSha256!=='string'||!SHA.test(receipt.subjectSha256)||
     typeof receipt.reviewerId!=='string'||!NAME.test(receipt.reviewerId)||
     receipt.decision!=='APPROVED'||
     typeof receipt.signedAt!=='string'||
     !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(receipt.signedAt)||
     !Number.isFinite(Date.parse(receipt.signedAt))||
     new Date(receipt.signedAt).toISOString()!==
       (receipt.signedAt.includes('.')?receipt.signedAt:receipt.signedAt.replace('Z','.000Z'))||
     Date.parse(receipt.signedAt)<Date.parse('2026-01-01T00:00:00Z')||
     Date.parse(receipt.signedAt)>Date.now()||
     typeof receipt.signatureB64!=='string'||
     !/^[A-Za-z0-9+/]{86}==$/.test(receipt.signatureB64)){
    throw new TypeError('Malformed or unsigned human media review evidence');
  }
  return Buffer.from(JSON.stringify([
    'therabridge:m5-media-human-review:v1',receipt.schemaVersion,
    receipt.stage,receipt.role,receipt.subjectSha256,
    receipt.reviewerId,receipt.signedAt,receipt.decision
  ]));
}

/** trustAnchors: Map<id, {publicKey: externally trusted Ed25519 PEM, allowedRoles: string[]}>.
 * Never read the trust anchor from the receipt itself; signer possession alone
 * does not prove professional authority or review quality. The reviewer
 * registry must be operated independently and require actual human vetting.
 */
export function verifyMediaHumanReceipt(receipt,trustAnchors){
  try {
    const message=canonicalMediaApproval(receipt);
    if(!(trustAnchors instanceof Map)||!trustAnchors.has(receipt.reviewerId))return false;
    const trustee=trustAnchors.get(receipt.reviewerId);
    if(!trustee||!Array.isArray(trustee.allowedRoles)||
       !trustee.allowedRoles.includes(receipt.role)||trustee.revoked===true)return false;
    const key=createPublicKey(trustee.publicKey);
    if(key.asymmetricKeyType!=='ed25519')return false;
    const signature=Buffer.from(receipt.signatureB64,'base64');
    if(signature.length!==64||signature.toString('base64')!==receipt.signatureB64)return false;
    return verify(null,message,key,signature);
  }catch{return false;}
}

const output=(status,missing,styleReady,securityReady,assetReady)=>Object.freeze({
  status,missingRoles:Object.freeze(missing),
  verifiedStyleEvidence:styleReady,verifiedSecurityEvidence:securityReady,
  verifiedAssetEvidence:assetReady,
  // This tool cannot authorize live media reads, rights licensing, consent,
  // publication, clinical signing or G2/G2b decisions.
  publishEnabled:false,readEnabled:false,clinicalReleaseEnabled:false,
  clinicalGate:'NO_GO_G2_G2b'
});

/**
 * Returns independent per-stage evidence readiness, not any authorization.
 * Style and security must both be signed before asset signoffs are considered.
 * Distinct human identities must fill independent roles in each phase.
 */
export function inspectM5MediaApprovalChain({
  styleSubjectSha256,securitySubjectSha256,assetSubjectSha256,receipts,trustAnchors
}){
  if(!SHA.test(styleSubjectSha256)||!SHA.test(securitySubjectSha256)||
     (assetSubjectSha256!==null&&!SHA.test(assetSubjectSha256))||
     !Array.isArray(receipts)||receipts.length>128||
     !(trustAnchors instanceof Map)){
    throw new TypeError('Explicit immutable subjects and independent reviewer registry required');
  }
  const seen=new Set();
  const verified=new Map();
  for(const record of receipts){
    // Reject hostile getter/proxy-like records before touching stage/role.
    const fields=['schemaVersion','stage','role','subjectSha256','reviewerId','signedAt','decision','signatureB64'];
    if(!exact(record,fields))continue;
    const key=record.stage+':'+record.role;
    // Multiple signed approvals for one role are ambiguous; reject that role,
    // rather than cherry-pick the one that says "approved".
    if(seen.has(key)){verified.delete(key);continue;}
    seen.add(key);
    const expected=record.stage==='STYLE'?styleSubjectSha256:
      record.stage==='SECURITY'?securitySubjectSha256:
      record.stage==='ASSET'?assetSubjectSha256:null;
    if(!expected||record.subjectSha256!==expected||
       !verifyMediaHumanReceipt(record,trustAnchors))continue;
    verified.set(key,record.reviewerId);
  }
  const rolesFor=(stage)=>M5_MEDIA_CHAIN_STAGES[stage].map(role=>({
    role,key:stage+':'+role,who:verified.get(stage+':'+role)
  }));
  const allStyle=rolesFor('STYLE');
  const styleReady=allStyle.every(x=>x.who) &&
    new Set(allStyle.map(x=>x.who)).size===allStyle.length;
  const allSecurity=rolesFor('SECURITY');
  const securityReady=allSecurity.every(x=>x.who) &&
    new Set(allSecurity.map(x=>x.who)).size===allSecurity.length &&
    allSecurity.every(x=>!allStyle.some(v=>v.who===x.who));
  const allAssets=rolesFor('ASSET');
  const assetReady=!!assetSubjectSha256&&styleReady&&securityReady&&
    allAssets.every(x=>x.who)&&new Set(allAssets.map(x=>x.who)).size===allAssets.length &&
    allAssets.every(x=>![...allStyle,...allSecurity].some(v=>v.who===x.who));
  const missing=[
    ...(!styleReady?allStyle.filter(x=>!x.who).map(x=>x.key):[]),
    ...(!securityReady?allSecurity.filter(x=>!x.who).map(x=>x.key):[]),
    ...(!assetReady&&assetSubjectSha256?allAssets.filter(x=>!x.who).map(x=>x.key):[]),
  ];
  // Distinct-reviewer failures also block, even when roles nominally signed.
  if(!styleReady&&!missing.some(x=>x.startsWith('STYLE:')))missing.push('STYLE:INDEPENDENCE');
  if(!securityReady&&!missing.some(x=>x.startsWith('SECURITY:')))missing.push('SECURITY:INDEPENDENCE');
  if(assetSubjectSha256&&!assetReady&&!missing.some(x=>x.startsWith('ASSET:')))missing.push('ASSET:INDEPENDENCE');
  const status=!styleReady?'BLOCKED_STYLE_HUMAN_APPROVAL':
    !securityReady?'BLOCKED_SECURITY_PRIVACY_APPROVAL':
    !assetSubjectSha256?'UPSTREAM_EVIDENCE_VERIFIED_NO_ASSET_SELECTED':
    !assetReady?'BLOCKED_ASSET_RIGHTS_AND_CLINICAL_REVIEW':
    'OFFLINE_EVIDENCE_VERIFIED_NO_PUBLICATION_AUTHORITY';
  return output(status,missing,styleReady,securityReady,assetReady);
}
