import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateRegister} from './check-historic-issues.mjs';
const filename='docs/roadmap/M4-09-HISTORICAL-ISSUE-DISPOSITIONS.csv';
const sample=fs.readFileSync(filename,'utf8');
test('historical original issue snapshot has exactly 75 uniquely linked issues',()=>assert.equal(validateRegister(sample),75));
test('reject fabricated verification without SHA/test/reviewer evidence',()=>{
 assert.throws(()=>validateRegister(sample.replace('"PENDING_EVIDENCE"','"VERIFIED_IMPLEMENTED"')),/Verified issue without/);
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
