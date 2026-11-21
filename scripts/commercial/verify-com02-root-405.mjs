#!/usr/bin/env node
// COM-02 #405: observe one independently pinned immutable Git source manifest
// and compare it to original npm tarball. NEVER a publisher-build attestation,
// rights clearance or actual SaaS/Enterprise release receipt.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import https from 'node:https';
import {parseLock,validatedUrl,verifyIntegrity} from './verify-published-tarballs.mjs';
import {extractPublishedManifest} from './compare-nondt-published-manifests.mjs';
const SHA=/^[a-f0-9]{64}$/, GIT=/^[a-f0-9]{40}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
const blobSha=x=>createHash('sha1').update(Buffer.from('blob '+x.length+'\0')).update(x).digest('hex');
const fail=x=>{throw Error('COM02_405_'+x)};
const pinned=Object.freeze({
 name:'unicode-emoji-modifier-base',version:'1.0.0',
 repository:'mathiasbynens/unicode-emoji-modifier-base',
 commit:'16333bdecc0e399f18bedd00b36995f3399ac5ec',
 gitManifestBlobSha1:'41420b11a80e2ba36975c65e2503e6f4327ad41c',
 sourceManifestSha256:'242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301',
 archiveSha256:'b753860ffa1f54f2b415de82e23d2ce79a89bfdc5fff1a4361a32cc8215ff4e5'
});
const sourceUrl=new URL('https://raw.githubusercontent.com/'+pinned.repository+'/'+pinned.commit+'/package.json');
function verifyCurrentRoot(queue,lockText,source,archive,{pins=pinned}={}){
 if(queue?.schema!=='therabridge-com02-nondt-publication-evidence-workqueue-v1'||
   queue.counts?.allExceptions!==44||queue.counts?.definitelyTypedExcluded!==21||
   queue.counts?.nonDefinitelyTyped!==23||queue.records?.length!==23||
   queue.commercialApproval!==false||queue.saasReleaseApproved!==false||
   queue.enterpriseReleaseApproved!==false||!SHA.test(queue.sourceEvidenceSha256?.correspondence||''))
   fail('UNTRUSTED_QUEUE_OR_CURRENT_LOCK');
 if(!GIT.test(pins.commit)||!GIT.test(pins.gitManifestBlobSha1)||
    !SHA.test(pins.sourceManifestSha256)||!SHA.test(pins.archiveSha256))
   fail('INVALID_IMMUTABLE_PINS');
 const matches=queue.records.filter(r=>r?.name===pins.name&&r.version===pins.version);
 if(matches.length!==1)fail('MISSING_OR_DUPLICATE_CURRENT_VERSION');
 const row=matches[0];
 if(row.category!=='SOURCE_ROOT_MANIFEST_ONLY'||row.sourceCommitCandidate!==pins.commit||
    row.publishedTarballSha256!==pins.archiveSha256||row.npmPublicationBuildAttested!==false||
    row.sourceRightsApproved!==false||row.commerciallyCleared!==false||
    row.saasNetworkRightsApproved!==false||row.enterpriseRedistributionRightsApproved!==false||
    row.actualEditionDistributionVerified!==false)
   fail('UNTRUSTED_SOURCE_OR_APPROVAL');
 const lockRows=parseLock(lockText).get(JSON.stringify([pins.name,pins.version]))||[];
 if(lockRows.length!==1)fail('AMBIGUOUS_LOCK_ENTRY');
 const npmUrl=validatedUrl(lockRows[0].resolved);
 if(!Buffer.isBuffer(source)||source.length<1||source.length>1024*1024||
    sha(source)!==pins.sourceManifestSha256||blobSha(source)!==pins.gitManifestBlobSha1)
   fail('SOURCE_BYTES_DO_NOT_MATCH_PINNED_GIT_OBJECT');
 let sourceJSON;try{sourceJSON=JSON.parse(source.toString('utf8'));}catch{fail('INVALID_SOURCE_MANIFEST')}
 if(sourceJSON.name!==pins.name||sourceJSON.version!==pins.version)fail('SOURCE_PACKAGE_IDENTITY_DRIFT');
 if(!Buffer.isBuffer(archive)||archive.length<1||archive.length>16*1024*1024)fail('INVALID_ARCHIVE_BYTES');
 verifyIntegrity(archive,lockRows[0].integrity);
 if(sha(archive)!==pins.archiveSha256)fail('REGISTRY_ARCHIVE_SHA256_DRIFT');
 const published=extractPublishedManifest(archive);
 let publishedJSON;try{publishedJSON=JSON.parse(published.toString('utf8'));}catch{fail('INVALID_PUBLISHED_MANIFEST')}
 if(publishedJSON.name!==pins.name||publishedJSON.version!==pins.version)
   fail('PUBLISHED_PACKAGE_IDENTITY_DRIFT');
 return {schema:'therabridge-com02-405-exact-source-npm-root-comparison-v1',
  status:sha(published)===sha(source)?
   'EXACT_RAW_MANIFEST_MATCH_NOT_PUBLISHER_ATTESTATION':
   'RAW_MANIFEST_DIFFERS_FROM_IMMUTABLE_GIT_SOURCE',
  name:pins.name,version:pins.version,upstreamRepository:pins.repository,
  sourceCommit:pins.commit,gitManifestBlobSha1:pins.gitManifestBlobSha1,
  sourceManifestSha256:sha(source),publishedManifestSha256:sha(published),
  registryArchiveSha256:sha(archive),
  sourceUrl:'https://raw.githubusercontent.com/'+pins.repository+'/'+pins.commit+'/package.json',
  npmArchiveUrl:npmUrl.href,queueSha256:sha(JSON.stringify(queue)),lockSha256:sha(lockText),
  sourceGitObjectVerified:true,archiveIntegrityVerified:true,
  publisherBuildLineageIndependentlyAttested:false,sourceCopyrightRightsApproved:false,
  commercialApproval:false,saasReleaseApproved:false,enterpriseReleaseApproved:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false};
}
async function getBytes(url,max=16*1024*1024){
 if(!['raw.githubusercontent.com','registry.npmjs.org','registry.yarnpkg.com'].includes(url.hostname)||
    url.protocol!=='https:'||url.username||url.password||url.port)fail('NOT_ALLOWLISTED');
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{timeout:12000,headers:{'user-agent':'TheraBridge-COM02-405/1.0'}},res=>{
   if(res.statusCode!==200){res.resume();reject(Error('HTTP_'+res.statusCode));return;}
   let n=0;const buffers=[];
   res.on('data',b=>{n+=b.length;if(n>max){req.destroy(Error('TOO_LARGE'));return;}buffers.push(b)});
   res.on('end',()=>resolve(Buffer.concat(buffers)));res.on('error',reject);
  });
  const timer=setTimeout(()=>req.destroy(Error('TOTAL_TIMEOUT')),15000);
  req.on('close',()=>clearTimeout(timer));
  req.on('timeout',()=>req.destroy(Error('READ_TIMEOUT')));req.on('error',reject);
 });
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  if(process.argv.length!==5||new Set(process.argv.slice(2)).size!==3)fail('USAGE');
  const [queuePath,lockPath,outPath]=process.argv.slice(2);
  for(const p of [queuePath,lockPath])if(statSync(p).size>32*1024*1024)fail('OVERSIZED_INPUT');
  const q=JSON.parse(readFileSync(queuePath,'utf8')),lockText=readFileSync(lockPath,'utf8');
  const rows=parseLock(lockText).get(JSON.stringify([pinned.name,pinned.version]))||[];
  if(rows.length!==1)fail('AMBIGUOUS_LOCK_ENTRY');
  // Independent source and npm archive GETs; no mutable Git refs/redirects.
  const [source,archive]=await Promise.all([getBytes(sourceUrl,1024*1024),getBytes(validatedUrl(rows[0].resolved))]);
  const receipt=verifyCurrentRoot(q,lockText,source,archive);
  writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({name:receipt.name,version:receipt.version,status:receipt.status,
    sourceGitObjectVerified:receipt.sourceGitObjectVerified,archiveIntegrityVerified:receipt.archiveIntegrityVerified,
    publisherBuildLineageIndependentlyAttested:false}));
 }catch(e){console.error('COM02_405_NOT_CLEARED',e.message);process.exitCode=1}
}
export {verifyCurrentRoot,blobSha,pinned,getBytes};
