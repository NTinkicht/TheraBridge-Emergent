import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash,sign} from 'node:crypto';
import {mergeCaptures} from './merge-release-captures.mjs';
import {pae,ENVELOPE_TYPE,PREDICATE} from './verify-oci-dsse.mjs';
import {reconcileSignedReleaseRights as reconcile} from './reconcile-signed-release-rights.mjs';

const A='a'.repeat(64),B='b'.repeat(64),sha=x=>createHash('sha256').update(x).digest('hex');
function image(edition){
 return {schema:'therabridge-com02-release-file-evidence-v1',commercialApproval:false,images:[{
  edition,imageRef:'registry.example/therabridge/'+edition.toLowerCase()+':v1',
  ociDigest:'sha256:'+A,filesystemCaptureStatus:'UNATTESTED_CANDIDATE',
  releaseApproval:false,files:[{path:'opt/asset/icon.svg',sha256:A,bytes:7}],
  captureLimitations:{source:'LOCAL_DOCKER_EXPORT_NOT_DEPLOYMENT_ATTESTATION',
   nonRegularEntriesOmitted:{symlinks:0,hardlinks:0,directories:1,other:0},
   volumesAndRuntimeMountsNotIncluded:true,independentSignatureVerified:false,
   commercialApproval:false}}]};
}
function fixture(){
 const rights={decision:'UNRESOLVED',commercialApproval:false,
  saasNetworkRights:'PENDING_COUNSEL_REVIEW',
  enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW'};
 const bulk={schema:'therabridge-com02-bulk-rights-review-v1',
  counts:{packages:2,nonPackageAssets:2,packagesStillRequiringIndependentAttestation:2,
   legallyApproved:0},
  packages:[
   {...rights,name:'@types/one',version:'1.2.3',provenanceCategory:'DEFINITELYTYPED_HISTORY_NOT_ATTESTED',
    verifiedPublisherToSourceArtifact:false,sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED'},
   {...rights,name:'lib',version:'2.3.4',provenanceCategory:'NO_PINNED_UPSTREAM_REVISION',
    verifiedPublisherToSourceArtifact:false,sourceVersionCorrespondence:'NOT_INDEPENDENTLY_ATTESTED'}
  ],
  nonPackageAssets:[
   {...rights,path:'assets/icon.svg',sha256:A,category:'IMAGE_OR_ICON'},
   {...rights,path:'assets/other.svg',sha256:B,category:'IMAGE_OR_ICON'}
  ],
  finalNoticesIssued:false,commercialLicenseGranted:false};
 const captures=mergeCaptures(image('SAAS'),image('ENTERPRISE'));
 const {publicKey,privateKey}=generateKeyPairSync('ed25519');
 const pem=publicKey.export({format:'pem',type:'spki'});
 const fp=sha(publicKey.export({format:'der',type:'spki'}));
 const claims=captures.captureSummary.captures.map(c=>({
  edition:c.edition,imageRef:c.imageRef,digest:c.ociDigest,
  fileInventorySha256:c.fileInventorySha256}));
 const statement={_type:'https://in-toto.io/Statement/v1',predicateType:PREDICATE,
  subject:claims.map(c=>({name:c.imageRef,digest:{sha256:c.digest.slice(7)}})),
  predicate:{captures:claims}};
 const envelopeFor=(value=statement)=>{
  const payload=Buffer.from(JSON.stringify(value));
  return {payloadType:ENVELOPE_TYPE,payload:payload.toString('base64'),
   signatures:[{keyid:fp,sig:sign(null,pae(ENVELOPE_TYPE,payload),privateKey).toString('base64')}]};
 };
 return {bulk,captures,pem,fp,statement,envelopeFor};
}
test('verifies actual DSSE bytes then accounts for all packages/assets without legal rights',()=>{
 const f=fixture();
 const result=reconcile(f.bulk,f.captures,f.envelopeFor(),f.pem,f.fp);
 assert.deepEqual(result.counts,{candidateImages:2,assets:2,packages:2,
  independentlyAttestedReleaseImages:0,independentlyVerifiedNpmPublisherSourceLinks:0,legallyApproved:0});
 assert.equal(result.images.every(x=>x.dsseSignatureVerifiedAgainstPinnedKey&&
  !x.independentlyVerifiedProductionDeployment&&!x.commercialApproval),true);
 assert.equal(result.assets[0].editions.SAAS.candidateByteMatch,true);
 assert.equal(result.assets[1].editions.ENTERPRISE.candidateByteMatch,false);
 assert(result.packages.every(x=>!x.exactNpmPublisherToSourceIndependentlyVerified&&!x.commercialApproval));
 assert.equal(result.finalNoticesIssued,false);
 assert.equal(result.g2ClinicalApproved,false);
 assert.equal(result.g2bClinicalApproved,false);
});
test('rejects untrusted source assets, counterfeit grants and missing rows',()=>{
 for(const change of [
  f=>{f.bulk.nonPackageAssets.pop();},
  f=>{f.bulk.nonPackageAssets[0].commercialApproval=true;},
  f=>{f.bulk.nonPackageAssets[0].enterpriseRedistributionRights='APPROVED';},
  f=>{f.bulk.packages[0].sourceVersionCorrespondence='VERIFIED';},
  f=>{f.bulk.packages[0].verifiedPublisherToSourceArtifact=true;},
  f=>{f.bulk.packages.pop();},
  f=>{f.bulk.finalNoticesIssued=true;}
 ]){
  const f=fixture();change(f);
  assert.throws(()=>reconcile(f.bulk,f.captures,f.envelopeFor(),f.pem,f.fp));
 }
});
test('tampered capture, image bytes, external signature and trust fingerprint always fail',()=>{
 for(const change of [
  f=>{f.captures.images[0].files[0].sha256=B;},
  f=>{f.captures.images[1].ociDigest='sha256:'+B;},
  f=>{f.captures.captureSummary.captures[1].fileInventorySha256=B;},
  f=>{f.captures.commercialApproval=true;},
  f=>{f.fp=B;}
 ]){
  const f=fixture();change(f);
  assert.throws(()=>reconcile(f.bulk,f.captures,f.envelopeFor(),f.pem,f.fp));
 }
 const f=fixture(),env=f.envelopeFor();
 env.signatures[0].sig=Buffer.alloc(64).toString('base64');
 assert.throws(()=>reconcile(f.bulk,f.captures,env,f.pem,f.fp),/DSSE_SIGNATURE_INVALID/);
});
test('even a signed false publisher identity or false file scope cannot promote claims',()=>{
 const f=fixture(),claim=structuredClone(f.statement);
 claim.predicate.captures[0].fileInventorySha256=B;
 assert.throws(()=>reconcile(f.bulk,f.captures,f.envelopeFor(claim),f.pem,f.fp),
  /SIGNED_CLAIM_DOES_NOT_MATCH_CAPTURE/);
 const bad=structuredClone(f.statement);
 bad.commercialApproval=true;
 assert.throws(()=>reconcile(f.bulk,f.captures,f.envelopeFor(bad),f.pem,f.fp),
  /INVALID_SIGNED_CLAIM/);
});
