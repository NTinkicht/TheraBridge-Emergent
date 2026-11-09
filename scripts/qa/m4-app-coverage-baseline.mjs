// M4-08: observed application-wide coverage baseline.
// A baseline is NEVER a >=95% acceptance receipt. No source coverage is inferred
// from static source-reading tests, source-file counts or passing test suites.
import {readFileSync,readdirSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const metrics=['lines','branches','functions','statements'];
function percent(metric) {
  const total=metric?.total,covered=metric?.covered;
  if(!Number.isFinite(total)||!Number.isFinite(covered)||total<=0||
     covered<0||covered>total) throw Error('invalid_measured_api_coverage');
  return Math.round((covered/total)*10000)/100;
}
function sourceFiles(dir) {
  let out=[];
  for(const e of readdirSync(dir,{withFileTypes:true})){
    const p=join(dir,e.name);
    if(e.isDirectory()) out=out.concat(sourceFiles(p));
    else if(e.isFile()&&/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)&&
      !/\.d\.ts$/.test(e.name))out.push(p);
  }
  return out;
}
export function reportBaseline({apiSummary,webSourceCount,webInstrumentedPaths=[],webSummary=null,webAudit=null}) {
  if(!apiSummary?.total || !Number.isInteger(webSourceCount)||webSourceCount<1 ||
     !Array.isArray(webInstrumentedPaths))throw Error('missing_coverage_inputs');
  const files=Object.keys(apiSummary).filter(x=>x!=='total');
  if(!files.length)throw Error('missing_api_source_instrumentation');
  const observed=Object.fromEntries(metrics.map(k=>[k,percent(apiSummary.total[k])]));
  const webObserved=new Set(webInstrumentedPaths);
  const measuredWeb=webSummary!==null || webAudit!==null;
  let webMetrics=null,webGap=null;
  if(measuredWeb){
    if(!webSummary?.total||webAudit?.kind!=='m4_web_full_source_instrumented_baseline_not_release_gate'||
       webAudit.sourceFileCount!==webSourceCount||webAudit.instrumentedFileCount!==webSourceCount||
       Object.keys(webSummary).filter(x=>x!=='total').length!==webSourceCount)
      throw Error('unqualified_measured_web_scope');
    webMetrics=Object.fromEntries(metrics.map(k=>[k,percent(webSummary.total[k])]));
    for(const metric of metrics){
      if(webAudit.percentages?.[metric]!==webMetrics[metric])throw Error('web_metric_mismatch_'+metric);
    }
    webGap=metrics.filter(k=>webSummary.total[k].covered/webSummary.total[k].total*100<95);
    if(JSON.stringify(webGap)!==JSON.stringify(webAudit.below95))throw Error('web_gap_mismatch');
  }
  return {
    schemaVersion:1,kind:'m4_application_coverage_baseline_not_release_gate',
    api:{sourceScope:'apps/api/src/**/*.ts',instrumentedFileCount:files.length,
      percentages:observed,below95:metrics.filter(k=>observed[k]<95)},
    web:{sourceScope:'apps/web/src/**/*.{ts,tsx,js,jsx}',
      applicationSourceFileCount:webSourceCount,
      observedRuntimeModuleCount:webObserved.size,
      istanbulCoverageMeasured:measuredWeb,percentages:webMetrics,below95:webGap},
    m4_08_gate:'NOT_QUALIFIED',
    reason:measuredWeb?'API_and_Web_measured_but_95percent_acceptance_not_qualified':'web_application_coverage_not_instrumented_and_api_threshold_not_proven',
    note:'A passing CI baseline does not satisfy >=95% API/Web lines,branches,functions,statements.'
  };
}
export function observedWebPaths({directory,webPrefix}){
 const found=[];
 for(const f of readdirSync(directory).filter(x=>x.endsWith('.json'))){
   const x=JSON.parse(readFileSync(join(directory,f),'utf8'));
   for(const item of x.result??[]){
     const uri=item.url||'';
     // V8 URLs may refer to compiled JS, but never infer line/branch coverage.
     if(uri.startsWith('file:') && uri.includes(webPrefix))found.push(uri);
   }
 }
 return [...new Set(found)];
}
if(process.argv[1]?.endsWith('/m4-app-coverage-baseline.mjs')){
 try{
   const root=resolve(process.cwd());
   const api=JSON.parse(readFileSync(join(root,'.workspace/m4-coverage/api/coverage-summary.json'),'utf8'));
   const webRoot=join(root,'apps/web/src');
   if(!statSync(webRoot).isDirectory())throw Error('web_source_missing');
   const instrumented=observedWebPaths({directory:join(root,'.workspace/m4-coverage/web-v8'),webPrefix:'/apps/web/src/'});
   const report=reportBaseline({apiSummary:api,
     webSourceCount:sourceFiles(webRoot).length,webInstrumentedPaths:instrumented,
    webSummary:JSON.parse(readFileSync(join(root,'.workspace/m4-coverage/web-istanbul/coverage-summary.json'),'utf8')),
    webAudit:JSON.parse(readFileSync(join(root,'.workspace/m4-coverage/m4-web-coverage-baseline.json'),'utf8'))});
   const out=join(root,'.workspace/m4-coverage');
   mkdirSync(out,{recursive:true});
   writeFileSync(join(out,'m4-coverage-baseline.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
   console.log(JSON.stringify(report));
 }catch{
   console.error('M4 application coverage baseline generation failed (no acceptance claim)');
   process.exitCode=1;
 }
}
