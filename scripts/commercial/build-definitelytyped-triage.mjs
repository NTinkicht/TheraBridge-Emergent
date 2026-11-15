#!/usr/bin/env node
// COM-02: freeze 26 exact @types package/version obligations to same-run evidence.
// npm metadata/lock SRI != immutable DefinitelyTyped commit or publisher lineage.
import {readFileSync,statSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const expected=[
 'babel__core@7.20.5','babel__generator@7.27.0','babel__template@7.4.4',
 'babel__traverse@7.28.0','cookiejar@2.1.5','eslint@9.6.1',
 'eslint-scope@3.7.7','estree@1.0.9','graceful-fs@4.1.9',
 'istanbul-lib-coverage@2.0.6','istanbul-lib-report@3.0.3',
 'istanbul-reports@3.0.4','jest@29.5.14','json-schema@7.0.15',
 'methods@1.1.4','node@20.19.43','node@26.6.5','prop-types@15.7.15',
 'react@18.3.31','react-dom@18.3.7','stack-utils@2.0.3',
 'superagent@8.1.11','supertest@6.0.3','validator@13.15.10',
 'yargs@17.0.35','yargs-parser@21.0.3'
];
const id=x=>x.name+'@'+x.version;
const hex64=/^[a-f0-9]{64}$/;
const integrity=/^sha512-[A-Za-z0-9+/]+={0,2}$/;
function unique(rows,tag){
 if(!Array.isArray(rows)||rows.length!==53)throw Error('EXPECTED_53_'+tag);
 const m=new Map();
 for(const x of rows){if(!x||!x.name||!x.version||m.has(id(x)))throw Error('DUPLICATE_'+tag);m.set(id(x),x);}
 return m;
}
function build(upstream,correspondence,rights){
 if(upstream?.schema!=='therabridge-com02-upstream-authority-candidates-v1'||
   correspondence?.schema!=='therabridge-com02-githead-source-corroboration-candidates-v1'||
   rights?.schema!=='therabridge-com02-exact-version-rights-queue-v1'||
   upstream.counts?.exceptions!==53||correspondence.counts?.exceptions!==53||
   rights.counts?.exceptions!==53||upstream.commercialLicenseGranted!==false||
   correspondence.commercialLicenseGranted!==false||rights.commercialLicenseGranted!==false||
   upstream.finalNoticesIssued!==false||correspondence.finalNoticesIssued!==false||
   rights.finalNoticesIssued!==false)
    throw Error('UNSAFE_COM02_EVIDENCE_ENVELOPE');
 const u=unique(upstream.records,'UPSTREAM');
 const c=unique(correspondence.records,'CORRESPONDENCE');
 const q=unique(rights.exceptions,'RIGHTS');
 if([...u.keys()].some(k=>!c.has(k)||!q.has(k)))throw Error('MISSING_53_WAY_JOIN');
 const observed=[...u.keys()].filter(k=>k.startsWith('@types/')).sort();
 const target=expected.map(x=>'@types/'+x).sort();
 if(JSON.stringify(observed)!==JSON.stringify(target))throw Error('DEFINITELYTYPED_VERSION_DRIFT');
 const records=target.map(k=>{
  const a=u.get(k),b=c.get(k),e=q.get(k);
  const typeName=a.name.slice(7);
  if(a.dependencyScope!==e.dependencyScope||a.publisherEvidenceStatus!==e.publisherEvidenceStatus||
     !hex64.test(e.tarballSha256||'')||!hex64.test(a.registryManifestSha256||'')||
     !hex64.test(b.registryManifestSha256||'')||
     a.registryManifestSha256!==b.registryManifestSha256||
     !integrity.test(a.lockedIntegrity||'')||a.lockedIntegrity!==e.lockedIntegrity||
     a.candidateDistIntegrity!==a.lockedIntegrity||
     a.manifestMatchesLockedIntegrity!==true||b.lockedIntegrityMatchesRegistry!==true||
     a.candidateRepositoryUrl!=='https://github.com/DefinitelyTyped/DefinitelyTyped.git'||
     a.candidateGitHead!==null||b.candidateGitHead!==null||
     b.candidateRepositoryUrl!==a.candidateRepositoryUrl||
     b.evidenceStatus!=='SOURCE_REVISION_CANDIDATE_UNAVAILABLE'||
     b.sourceVersionCorrespondence!=='NOT_INDEPENDENTLY_ATTESTED'||
     a.publisherProvenanceIndependentlyVerified!==false||
     a.legalReviewStatus!=='UNRESOLVED'||a.commercialApproval!==false||
     e.decision!=='UNRESOLVED'||e.commercialApproval!==false||
     b.commercialApproval!==false||
     a.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
     a.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW'||
     e.saasNetworkRights!=='PENDING_COUNSEL_REVIEW'||
     e.enterpriseRedistributionRights!=='PENDING_COUNSEL_REVIEW')
   throw Error('INVALID_DEFINITELYTYPED_EVIDENCE_'+k);
  return {
   name:a.name,version:a.version,dependencyScope:a.dependencyScope,
   publisherTarballSha256:e.tarballSha256,
   registryManifestSha256:a.registryManifestSha256,
   integritySha256:sha(a.lockedIntegrity),
   candidateSourceRepository:'DefinitelyTyped/DefinitelyTyped',
   candidateSourceSubdirectory:'types/'+typeName,
   immutableSourceCommit:null,
   githubSourceManifestCorroborated:false,
   npmPublisherToSourceIndependentlyVerified:false,
   authoritativeSourceLicenseVerified:false,
   realDistributionScopeVerified:false,
   saasNetworkRights:'PENDING_COUNSEL_REVIEW',
   enterpriseRedistributionRights:'PENDING_COUNSEL_REVIEW',
   review:'REQUIRES_VERSION_SPECIFIC_HISTORICAL_PUBLICATION_AND_RIGHTS_EVIDENCE',
   commercialApproval:false
  };
 });
 return {
  schema:'therabridge-com02-definitelytyped-26-pinned-triage-v1',
  status:'EXACT_NPM_BYTES_AND_REGISTRY_METADATA_ONLY_NO_SOURCE_LINEAGE_OR_LICENSE',
  evidenceSha256:{upstream:sha(JSON.stringify(upstream)),
   correspondence:sha(JSON.stringify(correspondence)),
   rights:sha(JSON.stringify(rights))},
  counts:{sourceExceptionVersions:53,definitelyTypedVersions:26,
   publisherToSourceAttested:0,sourceLicenseLegallyApproved:0,
   commercialLicensesGranted:0},
  records,commercialApproval:false,finalNoticesIssued:false,
  clinicalG2Approved:false,clinicalG2bApproved:false
 };
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const args=process.argv.slice(2);
  if(args.length!==4||new Set(args).size!==4)
   throw Error('USAGE: build-definitelytyped-triage.mjs upstream.json correspondence.json rights.json output.json');
  const values=args.slice(0,3).map(path=>{
   if(statSync(path).size>32*1024*1024)throw Error('EVIDENCE_SIZE_LIMIT');
   return JSON.parse(readFileSync(path,'utf8'));
  });
  const result=build(...values);
  writeFileSync(args[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(result.counts));
 }catch(e){console.error('COM02_DT26_REJECTED',e.message);process.exitCode=1;}
}
export {build,expected};
