import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildReview} from './build-com02-obligations-queue.mjs';
function evidence(){
 const direct={schema:'therabridge-direct-license-evidence-v1',status:'NOT_LEGAL_CLEARANCE',records:[{name:'alpha'}]};
 const installed={schema:'therabridge-installed-license-file-inventory-v1',approved:0,count:2,packages:[
 {name:'alpha',version:'1.0.0',installedPath:'node_modules/alpha',commercialApproval:false,actualLicenseTextReviewed:false,foundLicenseFiles:[{file:'LICENSE'}]},
 {name:'transitive',version:'1.0.0',installedPath:'node_modules/transitive',commercialApproval:false,actualLicenseTextReviewed:false,foundLicenseFiles:[]}]};
 const publisher={schema:'therabridge-publisher-tarball-evidence-v1',legallyApproved:0,records:[
 {name:'alpha',version:'1.0.0',status:'TARBALL_INTEGRITY_VERIFIED_LICENSE_FILES_HASHED',installedLicenseComparison:'EXACT_SHA256_MATCH',legalApproval:false,licenseObligationsReviewed:false}]};
 return {direct,installed,publisher,assets:[{path:'apps/web/public/icon.svg',sha256:'a'.repeat(64),bytes:50}]};
}
test('retains transitive and artwork in explicit unresolved commercial queue',()=>{
 const e=evidence(),r=buildReview(e.direct,e.installed,e.publisher,e.assets);
 assert.equal(r.counts.directEntries,1);assert.equal(r.counts.transitiveOrOtherInstalled,1);
 assert.equal(r.counts.trackedAssets,1);assert.equal(r.counts.legallyApproved,0);
 assert.equal(r.direct[0].enterpriseRedistributionRights,'PENDING_LEGAL_REVIEW');
 assert.equal(r.transitive[0].approval,false);assert.equal(r.assets[0].rightsHolder,'NOT_VERIFIED');
});
test('falsified approval never enters obligations queue',()=>{
 for(const mutate of [e=>e.publisher.records[0].legalApproval=true,
 e=>e.installed.packages[1].commercialApproval=true,
 e=>e.installed.approved=1]){
  const e=evidence();mutate(e);
  assert.throws(()=>buildReview(e.direct,e.installed,e.publisher,e.assets));
 }
});
test('invalid asset digests are not accepted as provenance',()=>{
 const e=evidence();e.assets[0].sha256='not-a-hash';
 assert.throws(()=>buildReview(e.direct,e.installed,e.publisher,e.assets),/INVALID_ASSET/);
});

test('accepts missing direct dependency only as explicit unresolved record',()=>{
 const e=evidence();
 e.direct.records.push({name:'not-installed'});
 e.publisher.records.push({name:'not-installed',version:null,status:'DIRECT_DEPENDENCY_NOT_INSTALLED',legalApproval:false,licenseObligationsReviewed:false,installedLicenseComparison:'NOT_EVALUATED'});
 const r=buildReview(e.direct,e.installed,e.publisher,e.assets);
 assert.equal(r.direct.find(x=>x.name==='not-installed').technicalStatus,'DIRECT_DEPENDENCY_NOT_INSTALLED');
 assert.equal(r.direct.find(x=>x.name==='not-installed').approval,false);
});
