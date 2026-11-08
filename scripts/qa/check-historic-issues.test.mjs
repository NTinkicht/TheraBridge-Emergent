import './m4-acceptance-evidence.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateRegister,closureEvidenceSummary} from './check-historic-issues.mjs';
const filename='docs/roadmap/M4-09-HISTORICAL-ISSUE-DISPOSITIONS.csv';
const sample=fs.readFileSync(filename,'utf8');
test('historical original issue snapshot has exactly 75 uniquely linked issues',()=>assert.equal(validateRegister(sample),75));
test('reject fabricated verification without SHA/test/reviewer evidence',()=>{
 assert.throws(()=>validateRegister(sample.replace('"PENDING_EVIDENCE"','"VERIFIED_IMPLEMENTED"')),/Verified issue without/);
});
test('reject verified disposition when its test evidence is missing',()=>{
 const changed=sample.replace('"PENDING_EVIDENCE","","","",""',
   '"VERIFIED_IMPLEMENTED","0123456789abcdef0123456789abcdef01234567","","","independent reviewer"');
 assert.notEqual(changed,sample);
 assert.throws(()=>validateRegister(changed),/Verified issue without valid source SHA, test and reviewer/);
});
test('reject duplicate historical issue',()=>{
 const lines=sample.trim().split('\n');
 lines[2]=lines[1];
 assert.throws(()=>validateRegister(lines.join('\n')+'\n'),/Duplicate/);
});
test('reject policy-blocked disposition without named policy',()=>{
 assert.throws(()=>validateRegister(sample.replace('"PENDING_EVIDENCE"','"POLICY_BLOCKED"')),/Policy blocked without/);
});

test('reject replacing one frozen issue ID with another pre-roadmap issue',()=>{
 const changed=sample.replace('"3","https://github.com/NTinkicht/TheraBridge-Emergent/issues/3"',
   '"1","https://github.com/NTinkicht/TheraBridge-Emergent/issues/1"');
 assert.notEqual(changed,sample);
 assert.throws(()=>validateRegister(changed),/frozen snapshot/);
});
test('rejects whitespace-only source, test and reviewer evidence',()=>{
 const changed=sample.replace('"PENDING_EVIDENCE","","","",""',
   '"VERIFIED_IMPLEMENTED"," "," ",""," "');
 assert.notEqual(changed,sample);
 assert.throws(()=>validateRegister(changed),/Verified issue without valid source SHA/);
});
test('rejects policy block justified only by whitespace',()=>{
 const changed=sample.replace('"PENDING_EVIDENCE","","","",""',
   '"POLICY_BLOCKED","","","   ",""');
 assert.notEqual(changed,sample);
 assert.throws(()=>validateRegister(changed),/Policy blocked without explicit evidence/);
});

test('conservative 75-issue summary never authorizes automatic close or clinical milestone acceptance',()=>{
 const summary=closureEvidenceSummary(sample);
 assert.equal(summary.total,75);
 assert.equal(Object.values(summary.counts).reduce((x,y)=>x+y,0),75);
 assert.equal(summary.outstanding,75-summary.counts.VERIFIED_IMPLEMENTED);
 assert.equal(summary.automatic_issue_closure_authorized,false);
 assert.equal(summary.milestone_4_closure_authorized,false);
 assert(summary.verified_candidates.every(x=>Number.isInteger(x)&&x>0&&x<167));
});
test('verified candidates require real SHA, tested evidence and independent review',()=>{
 const fake=sample.replace('"PENDING_EVIDENCE"','"VERIFIED_IMPLEMENTED"');
 assert.throws(()=>closureEvidenceSummary(fake),/Verified issue without valid source SHA/);
 const blocked=sample.replace('"PENDING_EVIDENCE"','"POLICY_BLOCKED"');
 assert.throws(()=>closureEvidenceSummary(blocked),/Policy blocked without explicit evidence/);
});

test('summary reads actual disposition column even when evidence mentions VERIFIED_IMPLEMENTED',()=>{
 const rows=sample.trim().split(/\r?\n/);
 const prior=rows[1];
 assert.match(prior,/^"3",/);
 let modified=prior.replace(',"PENDING_EVIDENCE",',',"PARTIAL",');
 assert.notEqual(modified,prior);
 modified=modified.replace(',"PARTIAL","","","","",',',"PARTIAL","","","VERIFIED_IMPLEMENTED","",');
 assert.notEqual(modified,prior);
 rows[1]=modified;
 const summary=closureEvidenceSummary(rows.join('\n')+'\n');
 assert.equal(summary.counts.PARTIAL,closureEvidenceSummary(sample).counts.PARTIAL+1);
 assert.equal(summary.verified_candidates.includes(3),false);
});
test('summary preserves valid unquoted numeric CSV issue IDs',()=>{
 const altered=sample.replace(/^"3",/m,'3,');
 assert.notEqual(altered,sample);
 assert.deepEqual(closureEvidenceSummary(altered),closureEvidenceSummary(sample));
});
