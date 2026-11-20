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


test('sparse dimensions never fabricate an empty evidence PASS', () => {
  for (const dims of [
    { roles: Array(1), journeys: ['home'] },
    { roles: ['guardian'], journeys: Array(1) },
    { roles: [, 'guardian'], journeys: ['home'] }
  ]) assert.throws(() => qualifySyntheticViewportEvidence([], dims), TypeError);
  assert.throws(() => qualifySyntheticViewportEvidence([], { roles: [], journeys: [] }), TypeError);
});

test('receipt identity fields reject coercion and cannot mutate evidence while deriving keys', () => {
  const poisoned = [
    ['role', 'guardian'], ['journey', 'home'], ['width', '320'], ['state', 'loading'],
  ];
  for (const [field, value] of poisoned) {
    const rows = make(); rows[0][field] = value;
    if (field === 'width') assert.throws(() => qualify(rows), /primitive/);
    else assert.throws(() => qualify(rows), /unexpected|primitive/);
  }
  for (const field of ['role', 'journey', 'width', 'state']) {
    const rows = make(); let calls = 0;
    rows[0][field] = {
      toString() {
        calls++;
        Object.keys(rows[0].checks).forEach(k => { rows[0].checks[k] = 'PASS'; });
        return field === 'width' ? '320' : field === 'role' ? 'guardian' : field === 'journey' ? 'home' : 'loading';
      },
      valueOf() { calls++; return 320; }
    };
    rows[0].checks.keyboard = 'NOT_RUN';
    assert.throws(() => qualify(rows), /primitive/);
    assert.equal(calls, 0);
    assert.equal(rows[0].checks.keyboard, 'NOT_RUN');
  }
  const roles = ['guardian'];
  let called = false;
  Object.defineProperty(roles, '0', { get() { called = true; return 'guardian'; } });
  assert.throws(() => qualifySyntheticViewportEvidence(make(), { roles, journeys }), /accessor-backed/);
  assert.equal(called, false);
});
