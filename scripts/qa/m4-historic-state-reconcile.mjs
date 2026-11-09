#!/usr/bin/env node
// M4-09: independent frozen GitHub state reconciliation. The snapshot is a
// dated evidence receipt, NOT a live status claim or authorization to close.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseHistoricRows,closureEvidenceSummary} from './check-historic-issues.mjs';

const FROZEN='docs/roadmap/M4-09-HISTORICAL-ISSUE-DISPOSITIONS.csv';
const SNAPSHOT='docs/roadmap/M4-09-LIVE-ISSUE-STATE-SNAPSHOT.csv';
const HEADER='frozen_issue,issue_url,github_state,closed_at,updated_at';
const ID_URL='https://github.com/NTinkicht/TheraBridge-Emergent/issues/';
function fields(line) {
  const out=[];let v='',q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(q) {if(c==='"'&&line[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
    else if(c==='"')q=true;else if(c===','){out.push(v);v='';}else v+=c;
  }
  if(q)throw Error('unterminated_github_state_csv');
  out.push(v);
  if(out.length!==5)throw Error('invalid_github_state_columns');
  return out;
}
export function reconcileHistoricalState(registerCsv,stateCsv) {
  const original=parseHistoricRows(registerCsv);
  if(original.length!==75)throw Error('invalid_historic_register_size');
  const lines=stateCsv.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  if(lines.shift()!==HEADER)throw Error('invalid_state_snapshot_schema');
  if(lines.length!==75)throw Error('historical_state_count_mismatch');
  const states=new Map();
  for(const line of lines) {
    const [id,url,state,closedAt,updatedAt]=fields(line);
    if(!/^\d+$/.test(id)||states.has(id))throw Error('duplicated_or_invalid_snapshot_issue');
    if(url!==ID_URL+id)throw Error('snapshot_issue_url_mismatch');
    if(!['open','closed'].includes(state))throw Error('invalid_github_state');
    if(state==='closed'&&!/^\d{4}-\d{2}-\d{2}T/.test(closedAt))throw Error('closed_without_timestamp');
    if(state==='open'&&closedAt!=='')throw Error('open_with_closed_timestamp');
    if(!/^\d{4}-\d{2}-\d{2}T/.test(updatedAt))throw Error('state_without_update_timestamp');
    states.set(id,state);
  }
  const dispositions={};
  const exceptions=[];
  const counts={open:0,closed:0};
  for(const row of original) {
    const [id,url,,owner,disposition,sha,test,policy,reviewer]=row;
    if(!states.has(id))throw Error('frozen_issue_missing_state');
    if(url!==ID_URL+id)throw Error('historic_state_identity_mismatch');
    const state=states.get(id);
    counts[state]++;
    dispositions[disposition]=(dispositions[disposition]??0)+1;
    if(disposition==='VERIFIED_IMPLEMENTED' && (!/^[a-f\d]{40}$/i.test(sha)||!test.trim()||!reviewer.trim()))
      throw Error('verified_without_complete_evidence');
    if(disposition==='POLICY_BLOCKED'&&!policy.trim())throw Error('unsigned_policy_block');
    if(state==='closed'&&disposition!=='VERIFIED_IMPLEMENTED')
      exceptions.push({issue:Number(id),kind:'CLOSED_WITHOUT_SCOPED_VERIFICATION'});
    if(state==='open'&&disposition==='VERIFIED_IMPLEMENTED')
      exceptions.push({issue:Number(id),kind:'IMPLEMENTED_SCOPE_BUT_OPEN'});
  }
  return {
    schemaVersion:1,scope:'frozen_75_historic_issues_snapshot_2026_11_09',
    total:75,githubState:counts,dispositions,
    exceptions:exceptions.sort((a,b)=>a.issue-b.issue),
    unverified:75-(dispositions.VERIFIED_IMPLEMENTED??0),
    automatic_issue_closure_authorized:false,
    milestone_4_closure_authorized:false,
    clinical_policy_activation_authorized:false,
  };
}
if(process.argv[1]?.endsWith('m4-historic-state-reconcile.mjs')) {
  try {
    const summary=reconcileHistoricalState(readFileSync(resolve(FROZEN),'utf8'),readFileSync(resolve(SNAPSHOT),'utf8'));
    const check=closureEvidenceSummary(readFileSync(resolve(FROZEN),'utf8'));
    if(check.counts.VERIFIED_IMPLEMENTED!==summary.dispositions.VERIFIED_IMPLEMENTED)throw Error('summary_register_drift');
    if(summary.exceptions.some(x=>x.kind==='CLOSED_WITHOUT_SCOPED_VERIFICATION'))throw Error('closed_issue_unreconciled');
    console.log(JSON.stringify(summary));
  } catch(e) {console.error('M4-09 historical snapshot not reconciled:',e.message);process.exitCode=1;}
}
