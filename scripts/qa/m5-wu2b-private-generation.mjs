/**
 * WU2-B: Offline, synthetic-only generation planner and intake preflight.
 * Deliberately has NO provider SDK, network call, media upload, publication,
 * review signing, or model invocation. The manifest is for an authorized
 * private operator workflow; neither it nor its assets are served to clients.
 */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {ILLUSTRATION_REFERENCE_SLOTS, ILLUSTRATION_STYLE_VERSION}
  from '../../apps/web/src/lib/illustration-style.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const HEX = /^[0-9a-f]{64}$/;
const PACK = Object.freeze({
  zip: 'a32ba0c3037e607beb95f8bcefad50cdd580d2d08f01d2163684798355571379',
  manifest: 'bf26b55138f09bfdea7b4f5041ebf881356c1ecfe33029109264576044e72b77',
});
export const PRIVATE_GENERATION_TEMPLATE = 'm5-b-v1/private-generation-brief-v1';
export const PRIVATE_MASTER_SIZE = Object.freeze({width:1600,height:1200,safeSquare:1200});
export const PRIVATE_PIPELINE_RELEASE_ENABLED = false;

export class PrivatePipelineError extends Error {
  constructor() {super('Private artwork preflight denied; no publication or release permitted.');}
}
const deny = () => {throw new PrivatePipelineError();};
const own = (object,key) => {
  if (!object || typeof object !== 'object' || Array.isArray(object)) deny();
  const desc=Object.getOwnPropertyDescriptor(object,key);
  if(!desc || !Object.hasOwn(desc,'value')) deny();
  return desc.value;
};
const validEvidence = value => typeof value==='string' && HEX.test(value);
const validLabel = value => typeof value==='string' &&
  /^[A-Za-z0-9][A-Za-z0-9._:-]{3,79}$/.test(value);
// Every chunk CRC is checked before decoding; no ancillary metadata is admitted.
const crc32=buffer=>{
  let crc=0xffffffff;
  for(const octet of buffer){
    crc^=octet;
    for(let n=0;n<8;n++) crc=(crc>>>1) ^ ((crc & 1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
};

/** All references are fixed, user-reported screened concepts, not signed clinical receipts. */
export async function makePrivateGenerationBatch(evidence) {
  const provider = own(evidence,'providerId');
  const providerTerms = own(evidence,'providerTermsSha256');
  const license = own(evidence,'commercialLicenseSha256');
  if (!validLabel(provider) || !validEvidence(providerTerms) || !validEvidence(license)) deny();
  const json = JSON.parse(await readFile(new URL(
    '../../docs/product/M5-WU2A-THERAPIST-CONCEPT-APPROVAL-REPORT.json',import.meta.url),'utf8'));
  if(json.styleVersion!==ILLUSTRATION_STYLE_VERSION ||
     json.referencePack?.zipSha256!==PACK.zip ||
     json.referencePack?.manifestSha256!==PACK.manifest ||
     json.referencePack?.productionMastersProvided!==false ||
     !Array.isArray(json.concepts) || json.concepts.length!==25)deny();
  const concepts=new Map();
  for (const item of json.concepts) {
    if(!item || typeof item.referenceId!=='string' || concepts.has(item.referenceId) ||
       !validEvidence(item.sha256) ||
       item.conceptReview!=='ACCEPTED_AS_REPORTED_BY_USER' ||
       item.publishEnabled!==false ||
       item.signedClinicianEvidence!=='NOT_PROVIDED')deny();
    concepts.set(item.referenceId,item);
  }
  const jobs=ILLUSTRATION_REFERENCE_SLOTS.map(slot=>{
    const approved=concepts.get(slot.id);
    if (!approved || approved.scene!==slot.scene || approved.family!==slot.family)deny();
    // Prompts contain ONLY a fixed editorial brief and an enumerated scene.
    // Never include health notes, child identifiers or unbounded user text.
    const brief=`Original fictional ${slot.family} therapy activity illustration; ${slot.scene.replaceAll('-', ' ')}; calm Direction B semi-flat editorial artwork, gentle shading, anatomically plausible hands, safe supervised equipment, diverse fictional people; 1600x1200 4:3, centered square-safe crop. No words, logos, real child likeness, trademark or copyrighted character. No therapeutic instruction or real patient data.`;
    const job=Object.freeze({
      referenceId:slot.id,scene:slot.scene,family:slot.family,
      sourceConceptSha256:approved.sha256,
      styleVersion:ILLUSTRATION_STYLE_VERSION,
      templateVersion:PRIVATE_GENERATION_TEMPLATE,
      requestedSize:PRIVATE_MASTER_SIZE,
      providerId:provider,providerTermsSha256:providerTerms,
      commercialLicenseSha256:license,
      promptSha256:sha(brief),prompt:brief,
      status:'PLANNED_PRIVATE_ONLY',
      candidateId:null, imageUrl:null, storageKey:null,
      publishEnabled:false, guardianReadEnabled:false,
      signedClinicalApproval:false,
    });
    return job;
  });
  if(concepts.size!==jobs.length || jobs.length!==25)deny();
  const revision=sha(jobs.map(job=>[
    job.referenceId,job.sourceConceptSha256,job.styleVersion,
    job.promptSha256,job.providerTermsSha256,job.commercialLicenseSha256,
  ].join(':')).join('\n'));
  return Object.freeze({
    schemaVersion:1, batchRevision:revision,
    sourcePackSha256:PACK.zip,styleVersion:ILLUSTRATION_STYLE_VERSION,
    generationEnabled:false, published:false, guardianReadEnabled:false,
    productionMastersProvided:false, independentMediaSecurityReview:'NOT_VERIFIED',
    humanAssetReview:'PENDING', clinicalGate:'NO_GO_G2_G2b',
    jobs:Object.freeze(jobs),
  });
}

/**
 * Minimal PNG framing preflight: this is NOT a full raster decode or malware
 * scan and deliberately never yields an approved or readable asset.
 */
export function inspectPrivateMaster(job,bytes) {
  try {
    if(!job || !ILLUSTRATION_REFERENCE_SLOTS.some(slot=>
      slot.id===own(job,'referenceId') && slot.family===own(job,'family') &&
      slot.scene===own(job,'scene')))deny();
    if(own(job,'styleVersion')!==ILLUSTRATION_STYLE_VERSION ||
       own(job,'templateVersion')!==PRIVATE_GENERATION_TEMPLATE ||
       own(job,'status')!=='PLANNED_PRIVATE_ONLY' ||
       own(job,'publishEnabled')!==false ||
       !validEvidence(own(job,'sourceConceptSha256')) ||
       !validEvidence(own(job,'promptSha256')))deny();
    if(!Buffer.isBuffer(bytes)||bytes.length<60||bytes.length>12*1024*1024)deny();
    if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')deny();
    if(bytes.readUInt32BE(8)!==13 || bytes.toString('ascii',12,16)!=='IHDR' ||
       bytes.readUInt32BE(16)!==1600 || bytes.readUInt32BE(20)!==1200 ||
       bytes[24]!==8 || ![2,6].includes(bytes[25]) ||
       bytes[26]!==0 || bytes[27]!==0 || bytes[28]!==0)deny();
    let at=8, sawIDAT=false, sawIEND=false;
    const compressed=[];
    while(at<bytes.length){
      if(at+12>bytes.length)deny();
      const length=bytes.readUInt32BE(at), type=bytes.toString('ascii',at+4,at+8);
      if(length>bytes.length-at-12 || !/^[A-Za-z]{4}$/.test(type))deny();
      if(at===8 && type!=='IHDR')deny();
      if(at!==8 && type==='IHDR')deny();
      if(!['IHDR','IDAT','IEND'].includes(type))deny();
      if(bytes.readUInt32BE(at+8+length)!==crc32(bytes.subarray(at+4,at+8+length)))deny();
      if(type==='IDAT'){sawIDAT=true;compressed.push(bytes.subarray(at+8,at+8+length));}
      if(type==='IEND'){
        if(length!==0 || at+12!==bytes.length)deny();
        sawIEND=true;
      }
      // This is only a format and raw-stream check; full image inspection,
      // malicious-content scanning and derivative QA remain separate gates.
      at += length+12;
      if(sawIEND)break;
    }
    if(!sawIDAT||!sawIEND||at!==bytes.length)deny();
    // The inflated raster is tightly bounded to prevent compressed bombs.
    const expected=1200*(1+1600*(bytes[25]===6?4:3));
    const raw=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected});
    if(raw.length!==expected)deny();
    const pitch=1+1600*(bytes[25]===6?4:3);
    for(let row=0;row<1200;row++) if(raw[row*pitch]>4)deny();
    return Object.freeze({
      referenceId:job.referenceId,sha256:sha(bytes),
      width:1600,height:1200,
      status:'QUARANTINE_PENDING_FULL_DECODE_AV_AND_HUMAN_REVIEW',
      structuralPreflightOnly:true, scanVerified:false,
      encryptedStorageVerified:false, rightsVerified:false,
      published:false, imageUrl:null, readEnabled:false,
      guardianReadEnabled:false,clinicalGate:'NO_GO_G2_G2b',
    });
  }catch{deny();}
}
