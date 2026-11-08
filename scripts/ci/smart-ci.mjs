#!/usr/bin/env node
/**
 * TheraBridge Smart CI. Deterministic, fail-closed PR diff classification.
 * The six pre-existing CI checks remain fully executed in shadow mode.
 * Targeted execution requires a separately required smart-ci-gate check.
 */
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';

const SHA=/^[0-9a-f]{40}$/;
const DOC=/(^|\/)[^/]+\.mdx?$/i;
const WEB_STYLE=/^apps\/web\/(?:src\/.*\.css|public\/(?:[^/]+\/)*[^/]+)$/;
const HARD_BLOCK=/(^|\/)(?:AGENTS\.md|SECURITY\.md|CODEOWNERS|Dockerfile(?:\.[^/]*)?|render\.yaml)$/i;
const VALID_STATUS=new Set(['A','M','D','T','U']);
const jobs=['secret-scan','test','live-session','demo-journey','compose','preview-container','smart-targeted'];

export function classifyPaths(changes) {
 if(!Array.isArray(changes)||!changes.length||changes.length>300)
   return {candidate:'full',reason:'empty_or_excessive_diff'};
 let docs=0,web=0;
 for(const {path,status} of changes){
   if(typeof path!=='string'||!path||path.length>512||path.includes('\0')||
      path.startsWith('/')||path.includes('\\')||path.split('/').includes('..')||
      !VALID_STATUS.has(status))return {candidate:'full',reason:'invalid_change'};
   if(HARD_BLOCK.test(path))return {candidate:'full',reason:'protected_file'};
   if(path.startsWith('docs/')&&DOC.test(path)){docs++;continue;}
   if(path==='README.md'||path==='CONTRIBUTING.md'){docs++;continue;}
   if(WEB_STYLE.test(path)&&status!=='D'){web++;continue;}
   return {candidate:'full',reason:'code_or_unclassified_change'};
 }
 if(web)return {candidate:'web-style',reason:'static_web_and_docs_only'};
 if(docs)return {candidate:'docs',reason:'documentation_only'};
 return {candidate:'full',reason:'not_selectable'};
}
export function decodeNameStatusNul(data){
 const parts=data.split('\0');
 if(parts.at(-1)==='')parts.pop();
 if(!parts.length||parts.length%2!==0)throw Error('invalid_git_diff');
 const result=[];
 for(let i=0;i<parts.length;i+=2){
   const code=parts[i],path=parts[i+1];
   if(!/^[AMDTU]$/.test(code))throw Error('invalid_git_status');
   result.push({status:code,path});
 }
 return result;
}
export function expectedJobs(mode){
 const selected=mode==='docs'?['secret-scan','smart-targeted']:
   mode==='web-style'?['secret-scan','live-session','demo-journey','smart-targeted']:
   mode==='full'?jobs.filter(x=>x!=='smart-targeted'):null;
 if(!selected)throw Error('invalid_mode');
 return Object.fromEntries(jobs.map(name=>[name,selected.includes(name)?'success':'skipped']));
}
export function decide({changes,eventName,baseRef,mode,requiredGateReady,fromFork,ownerPolicyApproved=false}){
 const classified=classifyPaths(changes);
 let execution='full',reason='shadow_or_nonpr';
 if(mode==='targeted'&&!ownerPolicyApproved)reason='rule16_owner_approval_required';
 if(eventName==='pull_request'&&baseRef==='main'&&!fromFork &&
    mode==='targeted'&&requiredGateReady===true &&ownerPolicyApproved===true &&
    classified.candidate!=='full'){
   execution=classified.candidate;
   reason=classified.reason;
 }
 return {execution,candidate:classified.candidate,reason,required:expectedJobs(execution)};
}
function readChanges(base,head){
 if(!SHA.test(base)||!SHA.test(head))throw Error('invalid_sha');
 const git=args=>execFileSync('git',args,{encoding:'utf8',timeout:30000,maxBuffer:1048576});
 git(['cat-file','-e',base+'^{commit}']);
 git(['cat-file','-e',head+'^{commit}']);
 // This diff errs on the side of extra changed files when the base advanced.
 return decodeNameStatusNul(git(['diff','--name-status','-z','--no-renames',base,head]));
}
function writeOutput(record){
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,
   'mode='+record.execution+'\n'+'candidate='+record.candidate+'\n'+'reason='+record.reason+'\n');
 if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
   'Smart CI: **'+record.execution+'**, candidate **'+record.candidate+
   '**, reason '+record.reason+'.\n\nShadow is default. Rule 16 owner approval and a required smart-ci-gate are mandatory; neither CI variable alone can activate targeted mode.\n');
 console.log(JSON.stringify({execution:record.execution,candidate:record.candidate,reason:record.reason}));
}
if(process.argv[1]?.endsWith('/smart-ci.mjs')){
 let outcome;
 try{
  const eventName=process.env.GITHUB_EVENT_NAME||'';
  const changes=eventName==='pull_request'?
    readChanges(process.env.TB_SMART_BASE_SHA||'',process.env.TB_SMART_HEAD_SHA||''):[];
  outcome=decide({changes,eventName,baseRef:process.env.TB_SMART_BASE_REF,
    mode:process.env.TB_SMART_CI_MODE,
    requiredGateReady:process.env.TB_SMART_CI_REQUIRED_GATE_READY==='true',
    fromFork:process.env.TB_SMART_FORK==='true',
    // Rule 16 still requires all six full-CI jobs. Environment variables
    // must NEVER override that owner-authorized merge policy. This constant
    // may be changed only in a separately approved AGENTS.md policy PR.
    ownerPolicyApproved:false});
 }catch{
  // Missing refs, git failures, malformed diff or unexpected data NEVER reduce tests.
  outcome={execution:'full',candidate:'full',reason:'diff_unavailable_fail_closed'};
 }
 writeOutput(outcome);
}
