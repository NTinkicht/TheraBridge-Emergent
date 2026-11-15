import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONAS, VIEWPORTS } from '../qa/m5-route-audit.mjs';
import { validateBrowserReceipt } from './m5-browser-observe.mjs';

const make = () => ({
  schemaVersion: 1, environment: 'ISOLATED_SYNTHETIC_CI',
  evidenceType: 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY',
  governance: { visualApproval: 'NOT_OBTAINED', accessibilityApproval: 'NOT_OBTAINED',
    realTaskTiming: 'NOT_RUN', clinicalGate: 'NO_GO_G2_G2b' },
  observations: PERSONAS.flatMap(p => VIEWPORTS.flatMap(width => p.routes.map(route => ({
    persona: p.id, viewportWidth: width, route, screenshotStatus: 'CAPTURED_NOT_REVIEWED',
    screenshotSha256: 'a'.repeat(64), documentWidth: width,
    navigationStatus: 'PRESENT', mainLandmarkStatus: 'PRESENT',
    horizontalOverflow: 'NONE', outcome: 'ROUTE_RENDERED',
  }))))
});

test('exact seven persona × five viewport × five route receipt is accepted without approval', () => {
  const r = make();
  assert.equal(r.observations.length, 175);
  assert.equal(validateBrowserReceipt(r), true);
});
test('rejects fabricated accessibility or clinical GO', () => {
  for (const [field, value] of [['visualApproval', 'PASS'], ['accessibilityApproval', 'PASS'],
    ['realTaskTiming', 'PASS'], ['clinicalGate', 'GO']]) {
    const r = make(); r.governance[field] = value;
    assert.throws(() => validateBrowserReceipt(r), /falsely approved/);
  }
});
test('rejects missing, duplicate or extra route observation', () => {
  for (const mutate of [r => r.observations.pop(), r => r.observations[1] = r.observations[0],
    r => r.observations[0].route = '/api/secret']) {
    const r = make(); mutate(r);
    assert.throws(() => validateBrowserReceipt(r), /missing|duplicate|Unknown|incomplete/i);
  }
});
test('rejects sensitive browser values and false screenshot review', () => {
  for (const fields of [{ password: 'do-not-log' }, { email: 'private@example.com' },
    { screenshotStatus: 'APPROVED' }, { screenshotSha256: 'raw-png' }]) {
    const r = make(); Object.assign(r.observations[0], fields);
    assert.throws(() => validateBrowserReceipt(r), /Sensitive|incomplete|acceptance/);
  }
});
