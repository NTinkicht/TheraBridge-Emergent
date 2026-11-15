import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONAS, VIEWPORTS } from '../qa/m5-route-audit.mjs';
import { validateBrowserReceipt, classifyBrowserOutcome, observeSettledPage } from './m5-browser-observe.mjs';

const make = () => ({
  schemaVersion: 1, environment: 'ISOLATED_SYNTHETIC_CI',
  evidenceType: 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY',
  governance: { visualApproval: 'NOT_OBTAINED', accessibilityApproval: 'NOT_OBTAINED',
    realTaskTiming: 'NOT_RUN', clinicalGate: 'NO_GO_G2_G2b' },
  observations: PERSONAS.flatMap(p => VIEWPORTS.flatMap(width => p.routes.map(route => ({
    persona: p.id, viewportWidth: width, route, screenshotStatus: 'CAPTURED_NOT_REVIEWED',
    screenshotSha256: 'a'.repeat(64), documentWidth: width, routeSettleMs: 250,
    navigationStatus: 'PRESENT', mainLandmarkStatus: 'PRESENT',
    horizontalOverflow: 'NONE', outcome: 'ROUTE_RENDERED',
  })))),
  keyboardJourneys: PERSONAS.map(p => ({ persona: p.id, desktopHomeViaEnter: 'OBSERVED',
    mobileSelectFocus: 'OBSERVED', mobileShiftTabToSignOut: 'NOT_OBSERVED',
    desktopRailToggle: 'OBSERVED', mobileMoreKeyboard: 'OBSERVED',
    mobilePermissionLinks: 'OBSERVED', mobileQuickLinkCount: 3,
  mobileBreakpointClosure: 'OBSERVED', mobileScrollLockRestored: 'OBSERVED',
    signOutViaEnter: 'OBSERVED', desktopNavigationMs: 123 }))
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

test('client-side error and policy denial outrank document HTTP 200', () => {
  const base = { route: '/app/children', pathname: '/app/children', httpStatus: 200,
    state: { error: false, denied: false, timedOut: false } };
  assert.equal(classifyBrowserOutcome(base), 'ROUTE_RENDERED');
  assert.equal(classifyBrowserOutcome({ ...base, state: { ...base.state, error: true } }), 'ERROR_STATE');
  assert.equal(classifyBrowserOutcome({ ...base, state: { ...base.state, denied: true } }), 'ROUTE_DENIED');
  assert.equal(classifyBrowserOutcome({ ...base, state: { ...base.state, timedOut: true } }), 'LOAD_TIMEOUT');
  assert.equal(classifyBrowserOutcome({ ...base, httpStatus: 500 }), 'ERROR_STATE');
  assert.equal(classifyBrowserOutcome({ ...base, pathname: '/login' }), 'LOGIN_REQUIRED');
  assert.equal(classifyBrowserOutcome({ ...base, pathname: '/app' }), 'ROUTE_REDIRECTED');
});

test('browser waiter does not silently accept client loading timeouts', async () => {
  const page = {
    waitForTimeout: async () => {},
    waitForFunction: async () => { throw Object.assign(new Error('loader did not settle'), { name: 'TimeoutError' }); },
    evaluate: async () => ({ error: false, denied: false, busy: true }),
  };
  const result = await observeSettledPage(page);
  assert.equal(result.timedOut, true);
  assert.equal(classifyBrowserOutcome({ route: '/app', pathname: '/app', httpStatus: 200, state: result }), 'LOAD_TIMEOUT');
});

test('browser waiter preserves client error after skeleton disappears', async () => {
  let waited = 0;
  const page = {
    waitForTimeout: async () => {},
    waitForFunction: async () => { waited++; },
    evaluate: async () => ({ error: true, denied: false, busy: false }),
  };
  const result = await observeSettledPage(page);
  assert.equal(waited, 2);
  assert.equal(result.timedOut, false);
  assert.equal(result.error, true);
});

test('receipt supports explicitly timed-out and client-denied observations but never approval', () => {
  const r = make();
  r.observations[0].outcome = 'LOAD_TIMEOUT';
  r.observations[1].outcome = 'ROUTE_DENIED';
  assert.equal(validateBrowserReceipt(r), true);
});

test('numeric route measurements cannot be forged, negative or unbounded', () => {
  for (const bad of [undefined, -1, NaN, '123', 30001]) {
    const r = make();
    r.observations[0].routeSettleMs = bad;
    assert.throws(() => validateBrowserReceipt(r), /incomplete|unsafe|certified/);
  }
});
test('all 7 keyboard personas are mandatory and cannot be copied from a different role', () => {
  const r = make();
  r.keyboardJourneys[2].persona = 'guardian';
  assert.throws(() => validateBrowserReceipt(r), /Duplicate|unknown/);
});
