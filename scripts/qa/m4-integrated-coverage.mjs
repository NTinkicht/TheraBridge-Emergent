#!/usr/bin/env node
// M4-08: consolidate measured API and independently audited full-Web coverage.
// Aggregate-only evidence; never equate measurement availability with release approval.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {measuredCoverage} from './m4-measured-coverage.mjs';
const metrics=['lines','branches','functions','statements'];
export function integratedReceipt({api,web,webAudit,runId,sha,eventName='push',prHeadSha=null,prBaseSha=null}){
 if(!api?.total||!web?.total||!webAudit||
   webAudit.kind!=='m4_web_full_source_instrumented_baseline_not_release_gate'||
   !Number.isSafeInteger(webAudit.sourceFileCount)||webAudit.sourceFileCount<1||
   webAudit.instrumentedFileCount!==webAudit.sourceFileCount||
   !Number.isSafeInteger(webAudit.zeroStatementCoverageFiles)||
   webAudit.zeroStatementCoverageFiles<0||
   webAudit.zeroStatementCoverageFiles>webAudit.sourceFileCount)throw Error('unqualified_web_source_audit');
 if(typeof runId!=='string'||!/^[0-9]+$/.test(runId)||
   typeof sha!=='string'||!/^[0-9a-f]{40}$/.test(sha))throw Error('missing_exact_execution_provenance');
 if(!['push','pull_request'].includes(eventName))throw Error('unsupported_coverage_event');
 if(eventName==='pull_request'&&(
   typeof prHeadSha!=='string'||!/^[0-9a-f]{40}$/.test(prHeadSha)||
   typeof prBaseSha!=='string'||!/^[0-9a-f]{40}$/.test(prBaseSha)))
   throw Error('missing_pr_head_base_provenance');
 const measured=measuredCoverage({api,web});
 for(const metric of metrics){
  const item=web.total[metric],score=Math.round(item.covered/item.total*10000)/100;
  if(webAudit.percentages?.[metric]!==score)throw Error('web_audit_metric_mismatch_'+metric);
 }
 const shortfalls=metrics.filter(metric=>web.total[metric].covered/web.total[metric].total*100<95);
 if(JSON.stringify(webAudit.below95)!==JSON.stringify(shortfalls))throw Error('web_audit_threshold_mismatch');
 const apiFiles=Object.keys(api).filter(x=>x!=='total');
 const webFiles=Object.keys(web).filter(x=>x!=='total');
 if(!apiFiles.length||webFiles.length!==webAudit.instrumentedFileCount)throw Error('incomplete_source_scope');
 const result={
  schemaVersion:1,kind:'m4_08_integrated_measured_coverage_not_release_approval',
  source:'real_istanbul_coverage_summary',runId,
  testedCheckoutSha:sha,headSha:eventName==='pull_request'?prHeadSha:sha,
  prBaseSha:eventName==='pull_request'?prBaseSha:null,
  testedRefType:eventName==='pull_request'?'synthetic_pr_merge_checkout':'push_commit',
  scope:{apiSourceFiles:apiFiles.length,webSourceFiles:webAudit.sourceFileCount,
   webZeroStatementCoverageFiles:webAudit.zeroStatementCoverageFiles},
  threshold:95,percentages:measured.scopes,belowThreshold:measured.belowThreshold,
  m4_08_gate:'NOT_QUALIFIED',
  reason:measured.belowThreshold.length?'measured_threshold_shortfalls':'independent_release_approval_pending',
  note:'Four metrics measured for API and Web; no clinical release authorization or approved exclusions'
 };
 return result;
}
const direct=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 try{
  const root=resolve(process.cwd(),'.workspace/m4-coverage');
  const args={
   api:JSON.parse(readFileSync(resolve(root,'api/coverage-summary.json'),'utf8')),
   web:JSON.parse(readFileSync(resolve(root,'web-istanbul/coverage-summary.json'),'utf8')),
   webAudit:JSON.parse(readFileSync(resolve(root,'m4-web-coverage-baseline.json'),'utf8')),
   runId:process.env.GITHUB_RUN_ID,
   sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
   eventName:process.env.GITHUB_EVENT_NAME,
   prHeadSha:process.env.TB_PR_HEAD_SHA||null,
   prBaseSha:process.env.TB_PR_BASE_SHA||null,
  };
  if(args.sha!==process.env.GITHUB_SHA)throw Error('checkout_sha_does_not_match_workflow_sha');
  const report=integratedReceipt(args);
  const out=resolve(root,'m4-08-integrated-coverage.json');
  mkdirSync(dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(report));
 }catch(error){console.error('M4-08 integrated measurement rejected: '+error.message);process.exitCode=1;}
}
