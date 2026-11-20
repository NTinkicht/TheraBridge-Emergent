import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifySyntheticViewportEvidence, REQUIRED_WIDTHS, REQUIRED_STATES } from './synthetic-viewport-evidence.mjs';
const roles = ['guardian'], journeys = ['home'];
const make = () => REQUIRED_WIDTHS.flatMap(width => REQUIRED_STATES.map(state => ({
  role: 'guardian', journey: 'home', width, state,
  checks: { keyboard: 'PASS', screenReaderManual: 'PASS', contrastManual: 'PASS', focus: 'PASS', overflow: 'PASS' }
})));
const qualify = rows => qualifySyntheticViewportEvidence(rows, { roles, journeys });
test('full five-width five-state manual evidence qualifies only when complete', () => {
  const result = qualify(make());
  assert.equal(result.status, 'PASS');
  assert.equal(result.expectedCount, 25);
});
test('missing, failed and not-run manual receipts fail closed', () => {
  assert.equal(qualify(make().slice(1)).status, 'NOT_QUALIFIED');
  const failed = make(); failed[0].checks.keyboard = 'FAIL';
  assert.equal(qualify(failed).status, 'NOT_QUALIFIED');
  const pending = make(); pending[0].checks.screenReaderManual = 'NOT_RUN';
  assert.equal(qualify(pending).status, 'NOT_QUALIFIED');
});
test('duplicate, unexpected and sensitive fields are rejected', () => {
  assert.throws(() => qualify([...make(), make()[0]]), /duplicate/);
  const sensitive = make(); sensitive[0].childId = 'synthetic';
  assert.throws(() => qualify(sensitive), /sensitive/);
  const extra = make(); extra[0].width = 375;
  assert.throws(() => qualify(extra), /unexpected/);
});
test('accessor-backed checks cannot execute', () => {
  const rows = make(); let invoked = false;
  Object.defineProperty(rows[0].checks, 'keyboard', { enumerable: true, get() { invoked = true; throw Error('getter'); } });
  assert.throws(() => qualify(rows), /accessor-backed/);
  assert.equal(invoked, false);
});
