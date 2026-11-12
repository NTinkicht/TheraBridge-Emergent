import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash,sign} from 'node:crypto';
import {mergeCaptures} from './merge-release-captures.mjs';
import {checkAttestation,pae,ENVELOPE_TYPE,PREDICATE} from './verify-oci-dsse.mjs';

const H='a'.repeat(64);
const sha=x=>createHash('sha256').update(x).digest('hex');
function candidate(edition){
 return {schema:'therabridge-com02-release-file-evidence-v1',
  commercialApproval:false,
  images:[{edition,imageRef:'registry.example:5000/therabridge/api:v1',
   ociDigest:'sha256:'+H,filesystemCaptureStatus:'UNATTESTED_CANDIDATE',
   releaseApproval:false,files:[{path:'opt/app/file',sha256:H,bytes:2}],
   captureLimitations:{source:'LOCAL_DOCKER_EXPORT_NOT_DEPLOYMENT_ATTESTATION',
    nonRegularEntriesOmitted:{symlinks:0,hardlinks:0,directories:1,other:0},
    volumesAndRuntimeMountsNotIncluded:true,independentSignatureVerified:false,
    commercialApproval:false}}]};
}
function fixture(){
 const capture=mergeCaptures(candidate('SAAS'),candidate('ENTERPRISE'));
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const pem=publicKey.export({type:'spki',format:'pem'});
 const fingerprint=sha(publicKey.export({type:'spki',format:'der'}));
 const captures=capture.captureSummary.captures.map(x=>({
   edition:x.edition,imageRef:x.imageRef,digest:x.ociDigest,
   fileInventorySha256:x.fileInventorySha256
 }));
 const statement={
  _type:'https://in-toto.io/Statement/v1',predicateType:PREDICATE,
  subject:captures.map(x=>({name:x.imageRef,digest:{sha256:x.digest.slice(7)}})),
  predicate:{captures}
 };
 const makeEnvelope=(value=statement,key=privateKey,fp=fingerprint)=>{
  const payload=Buffer.from(JSON.stringify(value));
  return {payloadType:ENVELOPE_TYPE,payload:payload.toString('base64'),
   signatures:[{keyid:fp,sig:sign(null,pae(ENVELOPE_TYPE,payload),key).toString('base64')}]};
 };
 return {capture,pem,fingerprint,statement,makeEnvelope,privateKey};
}
test('cryptographically validates exact edition/digest/bytes claims, never promotes release authority',()=>{
 const f=fixture(),result=checkAttestation(f.capture,f.makeEnvelope(),f.pem,f.fingerprint);
 assert.equal(result.dsseSignatureVerified,true);
 assert.equal(result.signerIdentityOrAuthorityIndependentlyVerified,false);
 assert.equal(result.registryArtifactOrDeploymentIndependentlyVerified,false);
 assert.equal(result.commercialApproval,false);
 assert.equal(result.g2ClinicalApproved,false);
 assert.equal(result.g2bClinicalApproved,false);
 assert.equal(result.imageCandidates.length,2);
});
test('rejects wrong signer trust key even when signature is cryptographically valid',()=>{
 const f=fixture(),other=generateKeyPairSync('ed25519');
 const otherPem=other.publicKey.export({type:'spki',format:'pem'});
 assert.throws(()=>checkAttestation(f.capture,f.makeEnvelope(),otherPem,f.fingerprint),
  /UNTRUSTED_PUBLIC_KEY/);
});
test('rejects payload or signature tampering',()=>{
 const f=fixture(),envelope=f.makeEnvelope();
 envelope.payload=Buffer.from(JSON.stringify({...f.statement,predicateType:'forged'})).toString('base64');
 assert.throws(()=>checkAttestation(f.capture,envelope,f.pem,f.fingerprint),
  /DSSE_SIGNATURE_INVALID/);
 const tampered=f.makeEnvelope();
 tampered.signatures[0].sig=Buffer.alloc(64).toString('base64');
 assert.throws(()=>checkAttestation(f.capture,tampered,f.pem,f.fingerprint),
  /DSSE_SIGNATURE_INVALID/);
});
test('rejects signed wrong digest, wrong inventory, swapped edition and wrong subject',()=>{
 for(const change of [
  x=>{x.subject[0].digest.sha256='b'.repeat(64);},
  x=>{x.predicate.captures[0].fileInventorySha256='b'.repeat(64);},
  x=>{x.predicate.captures[0].edition='ENTERPRISE';},
  x=>{x.subject[1].name='other/image';}
 ]){
  const f=fixture(),statement=JSON.parse(JSON.stringify(f.statement));change(statement);
  assert.throws(()=>checkAttestation(f.capture,f.makeEnvelope(statement),f.pem,f.fingerprint),
   /SIGNED_CLAIM_DOES_NOT_MATCH_CAPTURE/);
 }
});
test('rejects unsigned, extra signature, wrong PAE type, fabricated legal fields and trust omissions',()=>{
 const f=fixture(),env=f.makeEnvelope();
 const cases=[
  e=>{e.signatures=[];},
  e=>{e.signatures.push({...e.signatures[0]});},
  e=>{e.signatures[0].keyid='b'.repeat(64);},
  e=>{e.payloadType='application/json';},
  e=>{e.commercialApproval=true;},
  e=>{e.payload='bad!';}
 ];
 for(const change of cases){const bad=structuredClone(env);change(bad);
  assert.throws(()=>checkAttestation(f.capture,bad,f.pem,f.fingerprint));}
 assert.throws(()=>checkAttestation(f.capture,env,f.pem,null),/MISSING_TRUSTED_KEY/);
});
test('rejects fabricated capture rights, lost edition, and file byte mutation',()=>{
 for(const change of [
  x=>{x.commercialApproval=true;},
  x=>{x.images.pop();},
  x=>{x.images[0].captureLimitations.independentSignatureVerified=true;},
  x=>{x.images[0].files[0].bytes=300;}
 ]){
  const f=fixture(),changed=structuredClone(f.capture);change(changed);
  assert.throws(()=>checkAttestation(changed,f.makeEnvelope(),f.pem,f.fingerprint));
 }
});
test('rejects non-Ed25519 key, not just mismatched fingerprint',()=>{
 const f=fixture(),rsa=generateKeyPairSync('rsa',{modulusLength:2048});
 const der=rsa.publicKey.export({type:'spki',format:'der'});
 assert.throws(()=>checkAttestation(f.capture,f.makeEnvelope(),
  rsa.publicKey.export({type:'spki',format:'pem'}),sha(der)),/EXPECTED_ED25519/);
});
