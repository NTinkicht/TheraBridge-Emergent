import test from 'node:test';
import assert from 'node:assert/strict';
import {SHARED_ROLES,SHARED_TASKS,buildPendingSharedUxManualAcceptance}
  from './m5-shared-ux-manual-acceptance.mjs';
import {qualifySyntheticViewportEvidence} from '../qa/synthetic-viewport-evidence.mjs';

test('M5-04/06/07/08/09 manual matrix has four actual roles, five widths and five states, all pending',()=>{
  const receipt=buildPendingSharedUxManualAcceptance();
  assert.equal(receipt.schemaVersion,1);
  assert.equal(receipt.evidenceType,'PENDING_HUMAN_ACCEPTANCE_NOT_CI_APPROVAL');
  assert.equal(SHARED_ROLES.length,4);
  assert.equal(Object.keys(SHARED_TASKS).length,4);
  assert.equal(receipt.summary.requiredRows,100);
  assert.equal(receipt.summary.observedRows,0);
  assert.equal(receipt.summary.awaitingHumanChecks,500);
  assert.equal(receipt.summary.status,'NOT_QUALIFIED');
  assert.equal(receipt.governance.manualScreenReader,'NOT_RUN');
  assert.equal(receipt.governance.ownerSignoff,'NOT_OBTAINED');
  assert.equal(receipt.governance.clinicalGate,'NO_GO_G2_G2b');
  assert.equal(qualifySyntheticViewportEvidence(receipt.rows,{
    roles:SHARED_ROLES,journeys:['workspace']
  }).status,'NOT_QUALIFIED');
  assert(receipt.rows.every(row=>Object.values(row.checks).every(value=>value==='NOT_RUN')));
});
test('M5 manual matrix cannot turn a missing row or a single fabricated pass into qualification',()=>{
  const receipt=buildPendingSharedUxManualAcceptance();
  receipt.rows.pop();
  assert.equal(qualifySyntheticViewportEvidence(receipt.rows,{
    roles:SHARED_ROLES,journeys:['workspace']
  }).status,'NOT_QUALIFIED');
  const forged=buildPendingSharedUxManualAcceptance();
  forged.rows[0].checks.screenReaderManual='PASS';
  const result=qualifySyntheticViewportEvidence(forged.rows,{
    roles:SHARED_ROLES,journeys:['workspace']
  });
  assert.equal(result.status,'NOT_QUALIFIED');
  const changed=forged.rows[0];
  const changedKey=[changed.role,changed.journey,changed.width,changed.state].join(':');
  assert.equal(result.failures.some(x=>x.key===changedKey && x.check==='screenReaderManual'),false,
    'Only the explicitly changed screen-reader check is no longer pending');
  assert.equal(result.failures.filter(x=>x.check==='screenReaderManual').length,99,
    'All other screen-reader checks remain unperformed');
  assert.equal(result.failures.length,499);
});
