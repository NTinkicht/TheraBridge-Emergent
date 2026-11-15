#!/usr/bin/env node
// COM-02: Verify a detached, DSSE-signed two-edition image *claim* against a
// separately pinned Ed25519 public key. This is NOT registry, publisher,
// transparency-log, deployment, legal-rights, or clinical-release verification.
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {createHash,createPublicKey,verify as verifySignature,timingSafeEqual} from 'node:crypto';
import {mergeCaptures} from './merge-release-captures.mjs';

const HEX=/^[a-f0-9]{64}$/;
const ENVELOPE_TYPE='application/vnd.in-toto+json';
const PREDICATE='https://therabridge.example/evidence/oci-candidate-inventory/v1';
const hash=x=>createHash('sha256').update(x).digest('hex');
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function strictKeys(value,keys){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(k=>own(value,k));
}
function bytes64(value){
 if(typeof value!=='string'||value.length<4||value.length>1024*1024||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('BAD_BASE64');
 const bytes=Buffer.from(value,'base64');
 if(bytes.toString('base64')!==value)throw Error('NONCANONICAL_BASE64');
 return bytes;
}
function pae(type,payload){
 const t=Buffer.from(type,'utf8');
 return Buffer.concat([
  Buffer.from('DSSEv1 '+t.length+' '),t,
  Buffer.from(' '+payload.length+' '),payload
 ]);
}
function expectedClaims(capture){
 if(!strictKeys(capture,['schema','commercialApproval','images','captureSummary'])||
    !Array.isArray(capture.images)||capture.images.length!==2||
    !strictKeys(capture.captureSummary,[
      'schema','independentlyVerifiedReleaseImages','finalNoticesIssued',
      'commercialLicenseGranted','captures'])||
    capture.captureSummary.schema!=='therabridge-com02-unattested-capture-summary-v1'||
    capture.captureSummary.independentlyVerifiedReleaseImages!==0||
    capture.captureSummary.finalNoticesIssued!==false||
    capture.captureSummary.commercialLicenseGranted!==false)
  throw Error('INVALID_UNATTESTED_CAPTURE');
 const a=capture.images.find(x=>x.edition==='SAAS');
 const b=capture.images.find(x=>x.edition==='ENTERPRISE');
 if(!a||!b)throw Error('MISSING_EDITION');
 const normalized=mergeCaptures(
  {schema:capture.schema,commercialApproval:capture.commercialApproval,images:[a]},
  {schema:capture.schema,commercialApproval:capture.commercialApproval,images:[b]}
 );
 if(JSON.stringify(normalized)!==JSON.stringify(capture))
  throw Error('CAPTURE_MODIFIED_AFTER_MERGE');
 return normalized.captureSummary.captures.map(c=>({
  edition:c.edition,imageRef:c.imageRef,
  digest:c.ociDigest,fileInventorySha256:c.fileInventorySha256
 }));
}
function checkAttestation(capture,envelope,pem,expectedKeySpkiSha256){
 const expected=expectedClaims(capture);
 if(typeof expectedKeySpkiSha256!=='string'||!HEX.test(expectedKeySpkiSha256))
  throw Error('MISSING_TRUSTED_KEY_FINGERPRINT');
 const key=createPublicKey(pem);
 if(key.asymmetricKeyType!=='ed25519')throw Error('EXPECTED_ED25519_TRUST_KEY');
 const spki=key.export({type:'spki',format:'der'});
 const actual=hash(spki);
 if(!timingSafeEqual(Buffer.from(actual,'hex'),
                     Buffer.from(expectedKeySpkiSha256,'hex')))
  throw Error('UNTRUSTED_PUBLIC_KEY');
 if(!strictKeys(envelope,['payloadType','payload','signatures'])||
    envelope.payloadType!==ENVELOPE_TYPE||
    !Array.isArray(envelope.signatures)||envelope.signatures.length!==1)
  throw Error('INVALID_DSSE_ENVELOPE');
 const sig=envelope.signatures[0];
 if(!strictKeys(sig,['keyid','sig'])||sig.keyid!==expectedKeySpkiSha256)
  throw Error('DSSE_KEY_ID_MISMATCH');
 const signature=bytes64(sig.sig);
 if(signature.length!==64)throw Error('INVALID_ED25519_SIGNATURE');
 const payload=bytes64(envelope.payload);
 if(payload.length>65536)throw Error('OVERSIZED_STATEMENT');
 if(!verifySignature(null,pae(envelope.payloadType,payload),key,signature))
  throw Error('DSSE_SIGNATURE_INVALID');
 let statement;
 try{statement=JSON.parse(payload.toString('utf8'));}catch{throw Error('INVALID_SIGNED_STATEMENT');}
 if(!strictKeys(statement,['_type','predicateType','subject','predicate'])||
    statement._type!=='https://in-toto.io/Statement/v1'||
    statement.predicateType!==PREDICATE||
    !Array.isArray(statement.subject)||statement.subject.length!==2||
    !strictKeys(statement.predicate,['captures'])||
    !Array.isArray(statement.predicate.captures)||
    statement.predicate.captures.length!==2)
  throw Error('INVALID_SIGNED_CLAIM');
 for(let i=0;i<2;i++){
  const subject=statement.subject[i],row=statement.predicate.captures[i],truth=expected[i];
  if(!strictKeys(subject,['name','digest'])||
     !strictKeys(subject.digest,['sha256'])||
     subject.name!==truth.imageRef||subject.digest.sha256!==truth.digest.slice(7)||
     !strictKeys(row,['edition','imageRef','digest','fileInventorySha256'])||
     row.edition!==truth.edition||row.imageRef!==truth.imageRef||
     row.digest!==truth.digest||row.fileInventorySha256!==truth.fileInventorySha256)
   throw Error('SIGNED_CLAIM_DOES_NOT_MATCH_CAPTURE');
 }
 return {
  schema:'therabridge-com02-local-dsse-signature-review-v1',
  signedStatementSha256:hash(payload),
  trustedKeySpkiSha256:actual,
  imageCandidates:expected,
  dsseSignatureVerified:true,
  signerIdentityOrAuthorityIndependentlyVerified:false,
  registryArtifactOrDeploymentIndependentlyVerified:false,
  commercialApproval:false,finalNoticesIssued:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false,
  status:'VALID_SIGNATURE_TO_EXPLICITLY_PINNED_KEY_ONLY_NOT_RELEASE_AUTHORITY'
 };
}
function load(path,limit){
 if(statSync(path).size>limit)throw Error('INPUT_TOO_LARGE');
 return readFileSync(path);
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const paths=process.argv.slice(2);
 if(paths.length!==5||new Set([paths[0],paths[1],paths[2],paths[4]]).size!==4){
  console.error('Usage: verify-oci-dsse.mjs captures.json envelope.json public-key.pem trusted-spki-sha256 output.json');
  process.exit(2);
 }
 try{
  const result=checkAttestation(
   JSON.parse(load(paths[0],32*1024*1024)),
   JSON.parse(load(paths[1],128*1024)),
   load(paths[2],8192),
   paths[3]);
  writeFileSync(paths[4],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({signatureVerified:result.dsseSignatureVerified,
    releaseAuthorityVerified:false,commercialApproval:false}));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
export {checkAttestation,pae,expectedClaims,ENVELOPE_TYPE,PREDICATE};
