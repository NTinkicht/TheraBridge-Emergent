import test from 'node:test';
import assert from 'node:assert/strict';
import { WU2_WIDTHS, validateWU2Receipt } from './m5-wu2-browser-qualification.mjs';

const roles=[
  ['speech-therapist','/app/clinical'],
  ['coordinator','/app/schedule'],
  ['supervisor','/app/governance'],
];
const fixture=()=>({
  schemaVersion:1,environment:'ISOLATED_SYNTHETIC_CI',
  evidenceType:'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY',
  governance:{clinicalGate:'NO_GO_G2_G2b',humanApproval:'NOT_OBTAINED',
    accessibilityApproval:'NOT_OBTAINED',realTaskTiming:'NOT_RUN'},
  summary:{observations:15,failed:0,screenshotsArchived:0},
  observations:roles.flatMap(([persona,route])=>WU2_WIDTHS.map(width=>({
    persona,route,width,outcome:'ROUTE_RENDERED',overflow:'NONE',
    keyboardSkip:'PASS',roleVerified:'PASS',screenshotSha256:'a'.repeat(64)
  }))),
});
test('WU2 receipt validates exactly three roles × five widths with numeric-only hashes',()=>{
  assert.equal(validateWU2Receipt(fixture()),true);
});
test('WU2 evidence fails closed for missing, duplicated or wrong role/viewport',()=>{
  for(const mutation of [
    r=>r.observations.pop(),
    r=>r.observations[1]=r.observations[0],
    r=>r.observations[0].width=375,
    r=>r.observations[0].persona='guardian'
  ]){const r=fixture();mutation(r);assert.throws(()=>validateWU2Receipt(r));}
});
test('WU2 rejects route errors, horizontal overflow and keyboard/role denial',()=>{
  for(const [key,value] of [
    ['outcome','ERROR_STATE'],['overflow','OBSERVED'],
    ['keyboardSkip','FAIL'],['roleVerified','FAIL']
  ]){const r=fixture();r.observations[4][key]=value;
    assert.throws(()=>validateWU2Receipt(r));}
});
test('WU2 evidence never approves clinical release, accessibility or human usability',()=>{
  for(const [key,value] of [
    ['clinicalGate','GO'],['humanApproval','APPROVED'],
    ['accessibilityApproval','APPROVED'],['realTaskTiming','MEASURED']
  ]){const r=fixture();r.governance[key]=value;assert.throws(()=>validateWU2Receipt(r));}
});
test('WU2 rejects sensitive evidence fields and screenshot-archive claims',()=>{
  const r=fixture();r.observations[0].childName='Not permitted';
  assert.throws(()=>validateWU2Receipt(r));
  const c=fixture();c.summary.screenshotsArchived=1;
  assert.throws(()=>validateWU2Receipt(c));
});

test('WU2 rejects every extra root, governance, summary or observation field', () => {
  for (const change of [
    r => { r.patientName = 'must never be exported'; },
    r => { r.screenshot = { type: 'Buffer', data: [137, 80, 78, 71] }; },
    r => { r.governance.licenseApproval = 'approved'; },
    r => { r.summary.metadata = { childName: 'secret' }; },
    r => { r.observations[0].metadata = { childName: 'secret' }; },
    r => { r.observations[0].screenshot = { type: 'Buffer', data: [137, 80, 78, 71] }; },
    r => { r.observations[0].sourceImageBytes = [137, 80, 78, 71]; },
    r => { r.observations[0].extra = null; },
  ]) {
    const r = fixture(); change(r);
    assert.throws(() => validateWU2Receipt(r), /sensitive|incomplete|unknown/i);
  }
});

test('WU2 enforces actual JSON primitives and numeric viewport types', () => {
  for (const change of [
    r => { r.observations[0].width = '320'; },
    r => { r.observations[0].width = new Number(320); },
    r => { r.observations[0].persona = { value: 'speech-therapist' }; },
    r => { r.observations[0].route = new String('/app/clinical'); },
    r => { r.observations[0].screenshotSha256 = { value: 'a'.repeat(64) }; },
    r => { r.summary.failed = '0'; },
    r => { r.governance = ['NO_GO_G2_G2b']; },
    r => { r.observations[0] = ['speech-therapist', 320]; },
    r => { r.observations[0].screenshotSha256 = 'Z'.repeat(64); },
  ]) {
    const r = fixture(); change(r);
    assert.throws(() => validateWU2Receipt(r));
  }
});

test('WU2 disallows symbol-keyed data and inherited schema objects', () => {
  const withSymbol = fixture();
  withSymbol.observations[0][Symbol('private')] = 'secret';
  assert.throws(() => validateWU2Receipt(withSymbol));
  const inherited = fixture();
  inherited.summary = Object.create({ observations: 15, failed: 0, screenshotsArchived: 0 });
  assert.throws(() => validateWU2Receipt(inherited));
});
