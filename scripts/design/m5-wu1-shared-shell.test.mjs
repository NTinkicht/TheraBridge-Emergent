import test from 'node:test';
import assert from 'node:assert/strict';
import {PERSONAS,VIEWPORTS} from '../qa/m5-route-audit.mjs';
import {buildSharedShellReceipt,validateSharedShellReceipt}
  from './m5-wu1-shared-shell.mjs';

const data=()=>PERSONAS.flatMap(({id})=>VIEWPORTS.map(width=>({
  persona:id,width,route:'/app',theme:'LIGHT_AND_DARK_VERIFIED',
  surfaces:'PASS',contrast:'PASS',overflow:'NONE',keyboard:'PASS',
  mobileDrawer:width<768?'PASS':'NOT_APPLICABLE',
  desktopRail:width>=768?'PASS':'NOT_APPLICABLE',
  persisted:width===390?'PASS':'NOT_APPLICABLE',
})));
test('WU1 role shell enforces 7 authorized personas at 5 widths, two themes and pending human status',()=>{
  const evidence=buildSharedShellReceipt(data());
  assert.equal(evidence.summary.observations,35);
  assert.equal(evidence.summary.screenshotsArchived,0);
  assert.equal(evidence.governance.screenReaderManual,'NOT_RUN');
  assert.equal(evidence.governance.ownerSignoff,'NOT_OBTAINED');
  assert.equal(evidence.governance.clinicalGate,'NO_GO_G2_G2b');
  assert.equal(validateSharedShellReceipt(evidence),true);
});
test('WU1 rejects missing, duplicated, incorrect mobile/desktop and falsified theme observations',()=>{
  for(const mutation of [
    r=>r.observations.pop(),
    r=>{r.observations[2]=r.observations[0];},
    r=>{r.observations[0].persona='invented-guardian';},
    r=>{r.observations[0].width=375;},
    r=>{r.observations[0].theme='ONLY_GUARDIAN_DARK';},
    r=>{r.observations[0].contrast='FAIL';},
    r=>{r.observations[0].overflow='OBSERVED';},
    r=>{r.observations[0].mobileDrawer='NOT_APPLICABLE';},
    r=>{r.observations[4].desktopRail='NOT_APPLICABLE';},
    r=>{r.observations[1].persisted='NOT_APPLICABLE';},
    r=>{r.observations[0].keyboard='FAIL';},
  ]){const r=buildSharedShellReceipt(data());mutation(r);assert.throws(()=>validateSharedShellReceipt(r));}
});
test('WU1 rejects unauthorized private data and invented screen-reader, owner, task or clinical approval',()=>{
  for(const mutation of [
    r=>{r.observations[0].screenshot={data:[137,80,78,71]};},
    r=>{r.observations[0].childName='not permitted';},
    r=>{r.observations[0][Symbol('sensitive')]='cookie';},
    r=>{r.governance.ownerSignoff='APPROVED';},
    r=>{r.governance.screenReaderManual='PASS';},
    r=>{r.governance.realUsability='PASS';},
    r=>{r.governance.clinicalGate='GO';},
    r=>{r.summary.screenshotsArchived=35;},
    r=>{r.summary.failed=1;},
    r=>{r.evidenceType='MANUAL_ACCEPTANCE';},
  ]){const r=buildSharedShellReceipt(data());mutation(r);assert.throws(()=>validateSharedShellReceipt(r));}
});
