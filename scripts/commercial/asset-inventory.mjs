#!/usr/bin/env node
// Machine inventory of tracked non-code assets; DOES NOT prove licensing rights.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
const listed=execFileSync('git',['ls-files','-z'],{encoding:'buffer',maxBuffer:16*1024*1024})
  .toString('utf8').split('\0').filter(Boolean);
const matches=listed.filter(x=>/\.(?:svg|png|jpe?g|webp|gif|avif|ico|woff2?|ttf|otf)$/i.test(x) ||
  /(?:^|\/)Dockerfile(?:\.[^/]*)?$/i.test(x)).sort();
const assets=matches.map(path=>{
 const bytes=readFileSync(path);
 return {path,sha256:createHash('sha256').update(bytes).digest('hex'),
   bytes:bytes.length,licenseStatus:'NOT_VERIFIED',rightsHolder:'NOT_VERIFIED'};
});
const out={schema:'therabridge-tracked-asset-inventory-v1',
 qualification:'TRACKED ASSETS ONLY; EXTERNAL PROVIDERS, MODEL TERMS AND RIGHTS UNVERIFIED',
 gitCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 total:assets.length,assets};
const args=process.argv.slice(2);
const json=JSON.stringify(out,null,2)+'\n';
if(args.length===0)process.stdout.write(json);
else if(args.length===2&&args[0]==='--output'){
 const dst=resolve(args[1]);const rel=relative(process.cwd(),dst);
 if(isAbsolute(args[1])||!rel||rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)||existsSync(dst)){
  console.error('Output must be a new relative file inside the repository');process.exit(2);
 }
 writeFileSync(dst,json,{flag:'wx'});
}else{console.error('Usage: asset-inventory.mjs [--output new-relative.json]');process.exit(2);}
