import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reconcileHistoricalState } from './m4-historic-state-reconcile.mjs';
const register=readFileSync('docs/roadmap/M4-09-HISTORICAL-ISSUE-DISPOSITIONS.csv','utf8');
const snapshot=readFileSync('docs/roadmap/M4-09-LIVE-ISSUE-STATE-SNAPSHOT.csv','utf8');
const evaluate=(a=register,b=snapshot)=>reconcileHistoricalState(a,b);

test('reconciles all 75 real GitHub issues without asserting automatic closure',()=>{
 const x=evaluate();
 assert.equal(x.total,75);
 assert.deepEqual(x.githubState,{open:55,closed:20});
 assert.equal(x.dispositions.VERIFIED_IMPLEMENTED,20);
 assert.equal(x.dispositions.PENDING_EVIDENCE,49);
 assert.equal(x.dispositions.PARTIAL,5);
 assert.equal(x.dispositions.POLICY_BLOCKED,1);
 assert.equal(x.unverified,55);
 assert.deepEqual(x.exceptions,[]);
 assert.equal(x.automatic_issue_closure_authorized,false);
 assert.equal(x.milestone_4_closure_authorized,false);
 assert.equal(x.clinical_policy_activation_authorized,false);
});
test('rejects missing or duplicate frozen state rows',()=>{
 const lines=snapshot.trim().split(/\r?\n/);
 assert.throws(()=>evaluate(register,lines.slice(0,-1).join('\n')),/count_mismatch/);
 lines[2]=lines[1];
 assert.throws(()=>evaluate(register,lines.join('\n')),/duplicated_or_invalid/);
});
test('rejects fabricated issue states, URLs and timestamps',()=>{
 assert.throws(()=>evaluate(register,snapshot.replace('"open"','"unknown"')),/invalid_github_state/);
 assert.throws(()=>evaluate(register,snapshot.replace('https://github.com/NTinkicht/TheraBridge-Emergent/issues/3','https://github.com/NTinkicht/TheraBridge-Emergent/issues/999')),/snapshot_issue_url_mismatch/);
 const lines=snapshot.trim().split(/\r?\n/);
 const idx=lines.findIndex(x=>x.startsWith('"114",'));
 assert.ok(idx>0);
 lines[idx]=lines[idx].replace(/,"closed","[^"]+",/,',"closed","",');
 assert.throws(()=>evaluate(register,lines.join('\n')),/closed_without_timestamp/);
});
test('rejects incomplete verification credentials and unsanctioned policy promotion',()=>{
 const updated=register.replace(/("114"[^\n]*),"447d31ec7265fe0b86fcfc282f558be2823a2552",/, '$1,"",');
 assert.notEqual(updated,register);
 assert.throws(()=>evaluate(updated),/verified_without_complete_evidence/);
 const blocked=register.replace(/("35"[^\n]*),"POLICY_BLOCKED",/, '$1,"VERIFIED_IMPLEMENTED",');
 assert.notEqual(blocked,register);
 assert.throws(()=>evaluate(blocked),/verified_without_complete_evidence/);
});
test('flags closed issues still marked pending instead of silently calling them implemented',()=>{
 const stale=register.replace(/("114"[^\n]*),"VERIFIED_IMPLEMENTED",/, '$1,"PENDING_EVIDENCE",');
 assert.notEqual(stale,register);
 const result=evaluate(stale);
 assert.deepEqual(result.exceptions,[{issue:114,kind:'CLOSED_WITHOUT_SCOPED_VERIFICATION'}]);
});
test('flags open verified issues rather than automatically closing them',()=>{
 const modified=snapshot.replace(/("114"[^\n]*),"closed","[^"]+",/, '$1,"open","",');
 assert.notEqual(modified,snapshot);
 const result=evaluate(register,modified);
 assert.deepEqual(result.exceptions,[{issue:114,kind:'IMPLEMENTED_SCOPE_BUT_OPEN'}]);
});
