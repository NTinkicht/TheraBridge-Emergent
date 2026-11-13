// M4-F02 — measured Istanbul coverage gate, not a suite-count proxy.
// CI may evaluate fully instrumented API/Web summary files; missing data FAILS.
// The existing single-module fingerprint gate is NOT application coverage.
import {readFileSync} from 'node:fs';
const METRICS=['lines','branches','functions','statements'];
function score(summary,metric){
 const item=summary?.total?.[metric];
 if(!item||!Number.isFinite(item.total)||!Number.isFinite(item.covered)||
  item.total<=0||item.covered<0||item.covered>item.total)throw Error('invalid_coverage_data');
 return (item.covered/item.total)*100; // Unrounded for gate comparisons.
}
export function measuredCoverage({api,web,threshold=90}={}){
 if(!Number.isFinite(threshold)||threshold<=0||threshold>100)throw Error('invalid_threshold');
 const scopes={};
 const raw={};
 for(const [name,source] of Object.entries({api,web})){
  if(!source?.total)throw Error('missing_'+name+'_application_coverage');
  raw[name]=Object.fromEntries(METRICS.map(key=>[key,score(source,key)]));
  scopes[name]=Object.fromEntries(METRICS.map(key=>[key,Math.round(raw[name][key]*100)/100]));
 }
 const missing=Object.entries(raw).flatMap(([name,metrics])=>
   Object.entries(metrics).filter(([,n])=>n<threshold).map(([metric])=>name+'_'+metric));
 return {measurement:'istanbul_json_summary',threshold,scopes,
  result:missing.length?'FAIL':'PASS',belowThreshold:missing};
}
if(process.argv[1]?.endsWith('/m4-measured-coverage.mjs')){
 try{
  const [apiPath,webPath]=process.argv.slice(2);
  if(!apiPath||!webPath)throw Error('coverage_files_required');
  const report=measuredCoverage({
   api:JSON.parse(readFileSync(apiPath,'utf8')),
   web:JSON.parse(readFileSync(webPath,'utf8'))
  });
  console.log(JSON.stringify(report));if(report.result!=='PASS')process.exitCode=1;
 }catch{console.error('Application-wide measured coverage not available or invalid');process.exitCode=1;}
}
