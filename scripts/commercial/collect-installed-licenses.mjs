#!/usr/bin/env node
// Record package licenses actually present on disk; not a legal determination.
// Run after "yarn install --frozen-lockfile" in CI. No network or file mutations.
import {readFileSync,readdirSync,lstatSync,realpathSync,existsSync,writeFileSync} from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';

const root=realpathSync(process.argv[2]||'.');
const outfile=process.argv[3];
if(process.argv.length>4||!outfile){console.error('Usage: node collect-installed-licenses.mjs repo-root output.json');process.exit(2);}
const seenDirs=new Set(),packages=[];
const licenseRe=/^(?:licen[cs]e|copying|notice|copyright)(?:\.[a-z0-9_-]+)?$/i;
function packageAt(dir){
 let meta;
 try{meta=JSON.parse(readFileSync(join(dir,'package.json'),'utf8'))}catch{return;}
 if(typeof meta.name!=='string'||typeof meta.version!=='string')return;
 const files=[];
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(!entry.isFile()||!licenseRe.test(entry.name))continue;
  const bytes=readFileSync(join(dir,entry.name));
  files.push({file:entry.name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
 }
 files.sort((a,b)=>a.file.localeCompare(b.file,'en'));
 packages.push({name:meta.name,version:meta.version,installedPath:relative(root,dir).replaceAll('\\','/'),
  manifestLicenseDeclared:typeof meta.license==='string'?meta.license:null,
  foundLicenseFiles:files,actualLicenseTextReviewed:false,commercialApproval:false,
  reviewStatus:files.length?'EXACT_INSTALLED_FILES_PRESENT_NOT_REVIEWED':'NO_LICENSE_FILE_FOUND'});
}
function scanNodeModules(base){
 const nm=join(base,'node_modules');
 if(!existsSync(nm))return;
 const real=realpathSync(nm);
 if(seenDirs.has(real))return;
 seenDirs.add(real);
 for(const d of readdirSync(nm,{withFileTypes:true})){
  if(!d.isDirectory()||d.name.startsWith('.'))continue;
  if(d.name.startsWith('@')){
   for(const item of readdirSync(join(nm,d.name),{withFileTypes:true})){
    if(!item.isDirectory())continue;
    visit(join(nm,d.name,item.name));
   }
  }else visit(join(nm,d.name));
 }
}
function visit(dir){
 // Never follow symlinked node_modules directories or workspace links.
 if(!lstatSync(dir).isDirectory())return;
 packageAt(dir);
 scanNodeModules(dir);
}
scanNodeModules(root);
// Yarn workspaces can contain physical non-hoisted dependencies. Discover their
// node_modules explicitly; root node_modules workspace symlinks remain ignored.
let project;
try{project=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));}
catch{project={};}
const workspaces=project.workspaces ?? [];
const patterns=Array.isArray(workspaces)?workspaces:workspaces?.packages;
if(!Array.isArray(patterns)||patterns.some(x=>typeof x!=='string'||!/^[a-zA-Z0-9_-]+\/\*$/.test(x))){
 console.error('Unsupported workspace patterns; update license collector to avoid incomplete evidence');
 process.exit(1);
}
for(const glob of patterns){
 const dir=join(root,glob.slice(0,-2));
 if(!existsSync(dir)||!lstatSync(dir).isDirectory()){
  console.error('Missing or unsafe workspaces parent: '+glob);process.exit(1);
 }
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(!entry.isDirectory())continue; // skip symlinked workspaces
  const workspace=join(dir,entry.name);
  if(!existsSync(join(workspace,'package.json')))continue;
  scanNodeModules(workspace);
 }
}
packages.sort((a,b)=>a.name.localeCompare(b.name,'en')||a.version.localeCompare(b.version,'en')||a.installedPath.localeCompare(b.installedPath,'en'));
if(packages.length===0){console.error('No installed packages discovered');process.exit(1);}
const data={schema:'therabridge-installed-license-file-inventory-v1',
 qualification:'INSTALLED FILE HASHES ONLY — NOT LICENSE COMPLIANCE OR APPROVAL',
 nodeModulesFrom:'.',count:packages.length,
 withFile:packages.filter(x=>x.foundLicenseFiles.length>0).length,
 missingFile:packages.filter(x=>!x.foundLicenseFiles.length).length,
 approved:0,packages};
writeFileSync(resolve(outfile),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({count:data.count,withFile:data.withFile,missingFile:data.missingFile,approval:'NONE'}));
