import test from 'node:test';
import assert from 'node:assert/strict';
import { SHARED_UX_WIDTHS, contrastRatio, validateSharedGuardianReceipt } from './m5-shared-guardian-browser.mjs';

const fixture=()=>({
  schemaVersion:1,environment:'ISOLATED_SYNTHETIC_CI',
  evidenceType:'AUTOMATED_BROWSER_NOT_HUMAN_ACCESSIBILITY',
  governance:{clinicalGate:'NO_GO_G2_G2b',screenReaderAcceptance:'NOT_RUN',
    humanUsability:'NOT_RUN',ownerSignoff:'NOT_OBTAINED',
    realTaskTiming:'NOT_RUN',visualApproval:'NOT_OBTAINED'},
  summary:{observations:5,failed:0,screenshotsArchived:0},
  observations:SHARED_UX_WIDTHS.map(width=>({
    persona:'guardian',width,route:'/app',status:'ROUTE_RENDERED',
    overflow:'NONE',keyboardSkip:'PASS',siblingLiveRegion:'PRESENT',
    siblingControls:'NOT_APPLICABLE_IN_SEED',
    contrastLight:14.5,contrastDark:12.1,
    lightSha256:'a'.repeat(64),darkSha256:'b'.repeat(64)
  })),
});
test('M5 five-width synthetic guardian receipt never claims a manual screen reader or usability pass',()=>{
  assert.equal(validateSharedGuardianReceipt(fixture()),true);
  for(const [field,value] of [
    ['screenReaderAcceptance','PASS'],['humanUsability','PASS'],
    ['ownerSignoff','APPROVED'],['visualApproval','PASS'],
    ['clinicalGate','GO_G2'],['realTaskTiming','MEASURED']
  ]){const x=fixture();x.governance[field]=value;assert.throws(()=>validateSharedGuardianReceipt(x));}
});
test('M5 guardian receipts fail for missing/duplicate/unknown widths or stale/errored page',()=>{
  for(const change of [
    x=>x.observations.pop(),x=>{x.observations[1].width=320;},
    x=>{x.observations[0].width=375;},x=>{x.observations[0].status='ROUTE_DENIED';},
    x=>{x.observations[0].overflow='OBSERVED';},
    x=>{x.observations[0].keyboardSkip='FAIL';},
    x=>{x.observations[0].siblingLiveRegion='ABSENT';},
    x=>{x.observations[0].siblingControls='SIMULATED';}
  ]){const x=fixture();change(x);assert.throws(()=>validateSharedGuardianReceipt(x));}
});
test('M5 guardian receipts reject false contrast, screenshot bytes, user identities and invented artifacts',()=>{
  for(const change of [
    x=>{x.observations[0].contrastDark=4.49;},
    x=>{x.observations[0].contrastLight=Infinity;},
    x=>{x.observations[0].lightSha256='Z'.repeat(64);},
    x=>{x.observations[0].rawScreenshot=[137,80,78,71];},
    x=>{x.observations[0].childName='Not allowed';},
    x=>{x.summary.screenshotsArchived=1;},
    x=>{x.governance.screenReaderTool='NVDA_PASS';},
    x=>{x.ownerEmail='private@example.test';},
    x=>{x.observations[0][Symbol('private')]='value';},
  ]){const x=fixture();change(x);assert.throws(()=>validateSharedGuardianReceipt(x));}
});
test('M5 browser computed foreground/background contrast has strict WCAG AA threshold',()=>{
  assert(contrastRatio('rgb(20, 33, 61)','rgb(250, 248, 245)')>10);
  assert(contrastRatio('rgb(233, 236, 245)','rgb(13, 18, 38)')>10);
  assert(contrastRatio('rgb(255, 255, 255)','rgb(125, 179, 232)')<4.5);
  assert(contrastRatio('rgb(13, 18, 38)','rgb(125, 179, 232)')>=4.5);
  for(const invalid of ['rgba(0,0,0,0.1)','transparent','red','rgb(999, 0, 0)'])
    assert.throws(()=>contrastRatio(invalid,'rgb(255, 255, 255)'));
});
