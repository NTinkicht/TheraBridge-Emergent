#!/usr/bin/env node
// M4-08: fail-closed API source-coverage gap diagnostics from genuine Jest
// instrumented counters. Sanitized file paths and integers only; no fixtures,
// secrets, SQL, clinical data or patient information are logged/uploaded.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {apiSourceFiles} from './m4-integrated-coverage.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const apiRoot=resolve(root,'apps/api/src');
const coverageFile=resolve(root,'.workspace/m4-coverage/api/coverage-summary.json');
const output=resolve(root,'.workspace/m4-coverage/m4-api-hotspots.json');
const metrics=['lines','branches','functions','statements'];
function invalid(why){throw Error('M4_API_HOTSPOT_SCOPE_'+why);}
export function apiHotspots({summary,expectedSourcePaths,sourceRoot}){
 if(!summary?.total||!Array.isArray(expectedSourcePaths)||!expectedSourcePaths.length)invalid('missing_scope');
 const base=resolve(sourceRoot),expected=new Set();
 for(const p of expectedSourcePaths){
   const absolute=resolve(p),rel=relative(base,absolute);
   if(!rel||rel==='..'||rel.startsWith('..'+sep)||!rel.endsWith('.ts')||rel.endsWith('.d.ts'))invalid('invalid_source');
   if(expected.has(absolute))invalid('duplicate_source');expected.add(absolute);
 }
 const keys=Object.keys(summary).filter(x=>x!=='total');
 if(keys.length!==expected.size)invalid('incomplete_denominator');
 const seen=new Set(),files=[];
 const totals=Object.fromEntries(metrics.map(k=>[k,{total:0,covered:0}]));
 for(const key of keys){
   const absolute=resolve(key);
   if(!expected.has(absolute)||seen.has(absolute))invalid('unexpected_instrumentation');
   seen.add(absolute);
   const rel=relative(base,absolute).replaceAll('\\','/');
   if(!/^[a-zA-Z0-9_./()[\]-]+\.ts$/.test(rel)||rel.includes('..')||rel.includes('//'))invalid('unsafe_path');
   const measures={};
   for(const m of metrics){
     const x=summary[key]?.[m];
     if(!Number.isSafeInteger(x?.total)||x.total<0||
       !Number.isSafeInteger(x.covered)||x.covered<0||x.covered>x.total)invalid('malformed_'+m);
     measures[m]={total:x.total,covered:x.covered};
     totals[m].total+=x.total;totals[m].covered+=x.covered;
   }
   files.push({path:'apps/api/src/'+rel,counts:measures});
 }
 for(const m of metrics){
   if(summary.total[m]?.total!==totals[m].total||
      summary.total[m]?.covered!==totals[m].covered||totals[m].total===0)invalid('mismatch_'+m);
 }
 const ratio=(n)=>n.total===0?100:Number((n.covered/n.total*100).toFixed(2));
 const needed=n=>Math.max(0,Math.ceil(n.total*0.95-1e-9)-n.covered);
 const top=(metric)=>files.map(f=>({
   path:f.path,uncovered:f.counts[metric].total-f.counts[metric].covered,
   percentage:ratio(f.counts[metric])
 })).sort((a,b)=>b.uncovered-a.uncovered||a.path.localeCompare(b.path)).slice(0,25);
 return {
   schemaVersion:1,kind:'m4_api_full_source_hotspot_diagnostic_not_release_approval',
   sourceCount:files.length,thresholdPercent:95,
   metrics:Object.fromEntries(metrics.map(m=>[m,{...totals[m],percent:ratio(totals[m]),additionalCoveredUnitsTo95:needed(totals[m])}])),
   zeroExecutedFiles:files.filter(f=>f.counts.statements.covered===0).length,
   topUncoveredLines:top('lines'),topUncoveredBranches:top('branches'),topUncoveredFunctions:top('functions'),
   note:'Actual source-instrumented Jest counters, full API source denominator, never a clinical or production-release approval'
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const report=apiHotspots({
    summary:JSON.parse(readFileSync(coverageFile,'utf8')),
    expectedSourcePaths:apiSourceFiles(apiRoot),sourceRoot:apiRoot
  });
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log('M4-08 API branch hotspot diagnostics: '+JSON.stringify({
    sourceCount:report.sourceCount,zeroExecutedFiles:report.zeroExecutedFiles,
    metrics:report.metrics,topBranchGaps:report.topUncoveredBranches.slice(0,12)
  }));
 }catch(e){console.error('M4-08 API hotspot audit rejected: '+e.message);process.exitCode=1;}
}
