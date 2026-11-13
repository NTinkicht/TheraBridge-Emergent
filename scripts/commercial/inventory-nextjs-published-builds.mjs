#!/usr/bin/env node
// COM-02: inspect the ACTUAL three npm archives and signed upstream build
// recipes. This is an evidence inventory, not a reproducible-build result.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,timingSafeEqual} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import https from 'node:https';
import {validate as validateSource} from './corroborate-signed-nextjs-source.mjs';
import {fetchRaw} from './verify-immutable-license-texts.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const hash512=b=>createHash('sha512').update(b).digest();
const MANIFEST_LIMIT=512*1024;
const MAX_COMPRESSED=48*1024*1024;
const MAX_UNPACKED=256*1024*1024;
const filesFor=Object.freeze({
 '@next/env':'packages/next-env/package.json',
 '@next/swc-linux-x64-gnu':'packages/next-swc/package.json',
 '@next/swc-linux-x64-musl':'packages/next-swc/package.json'
});
function tarballUrl(name,version){
 if(!Object.hasOwn(filesFor,name)||!['14.2.35','14.2.33'].includes(version)||
    (name==='@next/env')!==(version==='14.2.35'))
   throw Error('UNEXPECTED_NPM_PACKAGE');
 const encoded=encodeURIComponent(name);
 const basename=name.split('/').pop();
 return 'https://registry.npmjs.org/'+encoded+'/-/'+basename+'-'+version+'.tgz';
}
function checkSRI(bytes,sri){
 if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>MAX_COMPRESSED||
    typeof sri!=='string'||!/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(sri))
  throw Error('INVALID_TARBALL_OR_SRI');
 const expected=Buffer.from(sri.slice(7),'base64');
 const actual=hash512(bytes);
 if(expected.length!==64||expected.toString('base64')!==sri.slice(7)||
    !timingSafeEqual(expected,actual))
  throw Error('EXACT_NPM_TARBALL_SRI_MISMATCH');
 return sha(bytes);
}
function readArchive(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>MAX_COMPRESSED)
  throw Error('TARBALL_TOO_LARGE');
 let tar;
 try{tar=gunzipSync(bytes,{maxOutputLength:MAX_UNPACKED});}
 catch{throw Error('INVALID_OR_OVERSIZE_NPM_ARCHIVE');}
 let pos=0,files=[],seen=new Set(),pending=null;
 while(pos+512<=tar.length){
  const h=tar.subarray(pos,pos+512);
  if(h.every(x=>x===0))break;
  const lengthText=h.subarray(124,136).toString('ascii').replace(/\0.*$/,'').trim();
  if(!/^[0-7]+$/.test(lengthText))throw Error('UNSUPPORTED_TAR_SIZE');
  const length=parseInt(lengthText,8),start=pos+512,end=start+length;
  if(!Number.isSafeInteger(length)||end>tar.length)throw Error('TRUNCATED_TAR');
  const type=h[156];
  const rawName=h.subarray(0,100).toString('utf8').replace(/\0.*$/,'');
  const prefix=h.subarray(345,500).toString('utf8').replace(/\0.*$/,'');
  let name=prefix?prefix+'/'+rawName:rawName;
  const data=tar.subarray(start,end);
  if(type===120){ // local PAX path attribute: reject all other transforms
   if(pending!==null||length>4096)throw Error('UNSAFE_TAR_EXTENSION');
   const text=data.toString('utf8');
   const match=text.match(/^(\d+) path=([^\n]+)\n$/);
   if(!match||Number(match[1])!==Buffer.byteLength(text))
    throw Error('UNSUPPORTED_PAX_EXTENSION');
   pending=match[2];
  }else if(type===103||type===76||type===75)throw Error('UNSUPPORTED_TAR_EXTENSION');
  else{
   if(pending!==null){name=pending;pending=null;}
   if(!name.startsWith('package/')||name.includes('\\')||name.includes('\0')||
      name.includes('\ufffd')||name.split('/').some(x=>x==='.'||x==='..')||
      name.length>360||seen.has(name))
    throw Error('UNSAFE_OR_DUPLICATE_PACKAGE_PATH');
   seen.add(name);
   if(type!==0&&type!==48&&type!==53)throw Error('UNSUPPORTED_NONREGULAR_TAR_ENTRY');
   if(type!==53){
    files.push({path:name.slice(8),bytes:length,sha256:sha(data),
      extension:name.slice(8).split('.').pop().toLowerCase()});
   }
  }
  pos=start+Math.ceil(length/512)*512;
 }
 if(pending!==null||pos+512>tar.length)throw Error('INCOMPLETE_NPM_TAR');
 if(files.length<1||files.length>10000)throw Error('INVALID_NPM_FILE_COUNT');
 files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
 return {files,tarUnpackedBytes:tar.length};
}
function download(url){
 const target=new URL(url);
 if(target.protocol!=='https:'||target.hostname!=='registry.npmjs.org'||
    target.username||target.password||target.port||target.search||target.hash||
    !/^\/%40next%2F(?:env|swc-linux-x64-(?:gnu|musl))\/-\/[A-Za-z0-9.-]+\.tgz$/i.test(target.pathname))
  return Promise.reject(Error('UNTRUSTED_NPM_ARCHIVE_ORIGIN'));
 return new Promise((resolve,reject)=>{
  const chunks=[];let size=0,settled=false;
  const settle=(err,result)=>{if(settled)return;settled=true;clearTimeout(deadline);
    err?reject(err):resolve(result);};
  const req=https.get(target,{headers:{'user-agent':'TheraBridge-COM02-ReproducibilityEvidence/1.0'},
   timeout:18000},res=>{
   if(res.statusCode!==200){res.destroy();settle(Error('REGISTRY_HTTP_'+res.statusCode));return;}
   res.on('data',b=>{size+=b.length;if(size>MAX_COMPRESSED){req.destroy(Error('TARBALL_TOO_LARGE'));return;}chunks.push(b);});
   res.on('end',()=>settle(null,Buffer.concat(chunks)));
   res.on('error',settle);
  });
  const deadline=setTimeout(()=>req.destroy(Error('REGISTRY_DEADLINE')),25000);
  req.on('timeout',()=>req.destroy(Error('REGISTRY_TIMEOUT')));
  req.on('error',settle);
 });
}
function sourceRecipe(bytes,expected){
 if(!Buffer.isBuffer(bytes)||bytes.length>MANIFEST_LIMIT)
  throw Error('SOURCE_MANIFEST_OVERSIZE');
 let manifest;
 try{manifest=JSON.parse(bytes.toString('utf8'));}catch{throw Error('INVALID_SOURCE_MANIFEST');}
 if(manifest?.name!==expected.name||manifest?.version!==expected.version)
  throw Error('SOURCE_BUILD_RECIPE_VERSION_MISMATCH');
 const scripts=manifest.scripts||{};
 if(expected.name==='@next/env'){
  if(typeof scripts.release!=='string'||!scripts.release.includes('ncc build')||
     typeof scripts.types!=='string'||!scripts.types.includes('tsc '))
   throw Error('ENV_SOURCE_BUILD_RECIPE_MISSING');
  return {type:'NCC_TYPESCRIPT_RELEASE_BUILD',sourcePackageSha256:sha(bytes),
   commands:{release:scripts.release,types:scripts.types},
   pinnedBuildInputs:{ncc:manifest.devDependencies?.['@vercel/ncc']||null},
   reproduciblePublishedArchive:false};
 }
 if(typeof scripts['build-native-release']!=='string'||!scripts['build-native-release'].includes('napi build')||
    typeof manifest.devDependencies?.['@napi-rs/cli']!=='string')
  throw Error('SWC_SOURCE_NATIVE_BUILD_RECIPE_MISSING');
 return {type:'RUST_NAPI_RELEASE_BUILD',sourcePackageSha256:sha(bytes),
  commands:{buildNativeRelease:scripts['build-native-release']},
  pinnedBuildInputs:{napiCli:manifest.devDependencies['@napi-rs/cli']},
  requiresSourceToolchainCargoLockAndTarget:true,reproduciblePublishedArchive:false};
}
async function inventory(candidates,verified,raw,sourceReport,{fetchArchive=download,fetchSource=fetchRaw}={}){
 const expected=validateSource(candidates,verified,raw);
 if(sourceReport?.schema!=='therabridge-com02-signed-nextjs-immutable-source-review-v1'||
    sourceReport.fullRegistryCandidateSha256!==sha(Buffer.from(JSON.stringify(candidates)))||
    sourceReport.npmVerifiedBundleSha256!==sha(raw)||
    sourceReport.verifiedSigstoreReceiptSha256!==sha(Buffer.from(JSON.stringify(verified)))||
    sourceReport.counts?.allOriginalUnresolvedVersions!==53||
    sourceReport.counts?.sigstoreSignedPackages!==3||
    sourceReport.counts?.independentlyReproducedPublishedNpmTarballs!==0||
    sourceReport.counts?.legallyApproved!==0||
    sourceReport.finalNoticesIssued!==false||sourceReport.commercialLicenseGranted!==false||
    sourceReport.g2ClinicalApproved!==false||sourceReport.g2bClinicalApproved!==false||
    !Array.isArray(sourceReport.records)||sourceReport.records.length!==3)
  throw Error('UNTRUSTED_SOURCE_RECONCILIATION');
 const rows=new Map(sourceReport.records.map(r=>[JSON.stringify([r.name,r.version]),r]));
 if(rows.size!==3)throw Error('DUPLICATE_SOURCE_RECONCILIATION');
 const records=[];
 for(const e of expected){
  const src=rows.get(JSON.stringify([e.name,e.version]));
  if(!src||src.signedSourceRevision!==e.signedRevision||
     src.sourcePackagePath!==e.sourceSpec.path||
     src.trustedSignedPackageAndDigest!==true||
     src.commercialApproval!==false||
     !String(src.sourceManifestStatus).includes('_MANIFEST_MATCH')||
     !/^[a-f0-9]{64}$/.test(src.sourceManifestSha256||''))
   throw Error('SOURCE_RECONCILIATION_MISMATCH');
  const record={name:e.name,version:e.version,signedCommit:e.signedRevision,
   publishedArchiveSRI:e.lockedIntegrity,publishedArchiveSha256:null,
   packageFileCount:0,publishedFilesSha256:null,
   generatedJsFiles:0,nativeNodeFiles:0,nativeNodeBytes:0,
   sourceBuildRecipe:null,sourceManifestSha256:src.sourceManifestSha256,
   archiveStatus:'UNVERIFIED',buildRecipeStatus:'NOT_VERIFIED',
   publishArtifactReproducedFromSignedSource:false,
   exactBinaryReproducibilityVerified:false,commercialApproval:false};
  try{
   const url=tarballUrl(e.name,e.version);
   const bytes=await fetchArchive(url);
   record.publishedArchiveSha256=checkSRI(bytes,e.lockedIntegrity);
   const archive=readArchive(bytes);
   const manifestItem=archive.files.find(f=>f.path==='package.json');
   if(!manifestItem)throw Error('ARCHIVE_MANIFEST_ABSENT');
   // Archive manifest content is intentionally not used for identity:
   // signed npm PURL/SRI bind archive bytes, and source is separately checked.
   record.packageFileCount=archive.files.length;
   record.publishedFilesSha256=sha(Buffer.from(JSON.stringify(archive.files)));
   record.generatedJsFiles=archive.files.filter(f=>f.extension==='js'||f.extension==='mjs'||f.extension==='cjs').length;
   const binaries=archive.files.filter(f=>f.extension==='node');
   record.nativeNodeFiles=binaries.length;
   record.nativeNodeBytes=binaries.reduce((x,f)=>x+f.bytes,0);
   if(e.name==='@next/env'&&record.generatedJsFiles===0)throw Error('EXPECTED_GENERATED_NCC_OUTPUT_MISSING');
   if(e.name!=='@next/env'&&record.nativeNodeFiles===0)throw Error('EXPECTED_PLATFORM_NATIVE_BINARY_MISSING');
   record.archiveStatus='INTEGRITY_VERIFIED_PUBLISHED_FILE_INVENTORY_NOT_REPRODUCIBILITY';
  }catch(err){
   record.archiveStatus='UNVERIFIED_'+String(err.message).slice(0,100);
   record.publishedArchiveSha256=null;
  }
  try{
   const source=await fetchSource('https://raw.githubusercontent.com/vercel/next.js/'+e.signedRevision+'/'+e.sourceSpec.path);
   const buf=Buffer.isBuffer(source)?source:Buffer.from(source);
   if(sha(buf)!==src.sourceManifestSha256)throw Error('CHANGED_IMMUTABLE_SOURCE_BYTES');
   const recipe=sourceRecipe(buf,{name:e.sourceSpec.sourceName,version:e.version});
   record.sourceBuildRecipe=recipe;
   record.buildRecipeStatus='SIGNED_COMMIT_BUILD_RECIPE_CAPTURED_NOT_EXECUTED';
  }catch(err){record.buildRecipeStatus='UNVERIFIED_'+String(err.message).slice(0,100);}
  records.push(record);
 }
 records.sort((a,b)=>a.name.localeCompare(b.name,'en'));
 return {schema:'therabridge-com02-published-nextjs-archive-reproducibility-readiness-v1',
  status:'SIGNED_AND_INTEGRITY_VERIFIED_ARCHIVE_INVENTORY_NOT_SOURCE_REPRODUCIBILITY_OR_LICENSE',
  inputSigstoreReceiptSha256:sha(Buffer.from(JSON.stringify(verified))),
  inputSourceReconciliationSha256:sha(Buffer.from(JSON.stringify(sourceReport))),
  counts:{allUnresolvedPackages:53,signedCandidates:3,
   tarballsWithVerifiedSRI:records.filter(r=>r.archiveStatus==='INTEGRITY_VERIFIED_PUBLISHED_FILE_INVENTORY_NOT_REPRODUCIBILITY').length,
   immutableBuildRecipesCaptured:records.filter(r=>r.buildRecipeStatus==='SIGNED_COMMIT_BUILD_RECIPE_CAPTURED_NOT_EXECUTED').length,
   nativeSWCTarballsRebuiltByteIdentically:0,completePublishedArchivesReproduced:0,
   otherNpmVersionsWithoutAdvertisedSigstore:50,legallyApproved:0},
  records,finalNoticesIssued:false,commercialLicenseGranted:false,
  g2ClinicalApproved:false,g2bClinicalApproved:false};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const p=process.argv.slice(2);
 if(p.length!==5||new Set(p).size!==5){
  console.error('Usage: inventory-nextjs-published-builds.mjs registry.json sigstore.json raw-bundles.json source-review.json output.json');
  process.exit(2);
 }
 try{
  const [a,b,c,d]=p.slice(0,4).map(f=>readFileSync(f));
  const report=await inventory(JSON.parse(a),JSON.parse(b),c,JSON.parse(d));
  writeFileSync(p[4],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report.counts));
 }catch(e){console.error('COM02_ARCHIVE_READINESS_FAILED',e.message);process.exitCode=1;}
}
export {tarballUrl,checkSRI,readArchive,sourceRecipe,inventory};
