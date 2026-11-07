import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultDirectory, validateDirectory } from './check-roadmap-registers.mjs';

const filenames = [
  'M4-01-66-FEATURE-CROSSWALK.csv',
  'M4-01-91-WORKFLOW-REGISTER.csv',
  'M4-01-55-OWNER-REQUIREMENTS.csv'
];
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-roadmap-'));
  for (const name of filenames) fs.copyFileSync(path.join(defaultDirectory, name), path.join(dir, name));
  return dir;
}
function withFixture(fn) {
  const dir = fixture();
  try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function mutate(dir, file, replacer) {
  const p=path.join(dir, file);
  const before=fs.readFileSync(p,'utf8');
  const after=replacer(before);
  assert.notEqual(after, before, 'fixture mutation must change input');
  fs.writeFileSync(p,after);
}
test('all 66/91/55 records are accepted with V2 exclusion', () => {
  assert.equal(validateDirectory().length, 3);
});
test('reject V1 reactivation of WF-X6', () => withFixture(dir => {
  mutate(dir,filenames[1],s=>s.replace('"WF-X6","Child app and school integration","V2","V2 EXCLUDED"',
    '"WF-X6","Child app and school integration","V2","V1 controlled draft"'));
  assert.throws(()=>validateDirectory(dir),/WF-X6 must remain V2 excluded/);
}));
test('reject school feature routed to V1 despite WF-X6 exclusion', () => withFixture(dir => {
  mutate(dir,filenames[0],s=>s.replace(
    /("39","Guardian\/family","Permissioned school integration",)"V2-DEFERRED"/,
    '$1"M7-06"'));
  assert.throws(()=>validateDirectory(dir),/V2 deferral\/state mismatch|school integration must remain V2-DEFERRED/);
}));
test('reject false verified status without acceptance evidence', () => withFixture(dir => {
  mutate(dir,filenames[2],s=>s.replace(
    /("OB-48","Guardian custody and individualized access\/consent","08","M9-02",)"PENDING_VERIFICATION"/,
    '$1"VERIFIED_IMPLEMENTED"'));
  assert.throws(()=>validateDirectory(dir),/marked verified without acceptance evidence/);
}));
test('reject documentation work unit as implementation owner', () => withFixture(dir => {
  mutate(dir,filenames[2],s=>s.replace(
    /("OB-47","Group therapy with individual child privacy","06",)"M6-09"/,
    '$1"M4-01"'));
  assert.throws(()=>validateDirectory(dir),/invalid work unit|no implementation owner/);
}));
test('support UTF-8 BOM from spreadsheet export', () => withFixture(dir => {
  const p=path.join(dir,filenames[0]);
  fs.writeFileSync(p,'\uFEFF'+fs.readFileSync(p,'utf8'));
  assert.equal(validateDirectory(dir).length,3);
}));
test('support escaped double quotes and embedded CRLF in a quoted field', () => withFixture(dir => {
  mutate(dir,filenames[0],s=>s.replace(
    '"Unified Child 360 clinical timeline and review states"',
    '"Unified Child 360 clinical ""timeline""\r\nand review states"'));
  assert.equal(validateDirectory(dir).length,3);
}));
