import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONAS, VIEWPORTS } from '../qa/m5-route-audit.mjs';
import { buildM5IntegratedBrowserReceipt } from './m5-integrated-browser-receipt.mjs';

const roles = [
  ['speech-therapist', '/app/clinical'],
  ['coordinator', '/app/schedule'],
  ['supervisor', '/app/governance'],
];
const widths = [320, 390, 768, 1024, 1440];
const sha = 'a'.repeat(64);
const audit = () => ({
  schemaVersion: 1, environment: 'ISOLATED_SYNTHETIC_CI',
  evidenceType: 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY',
  governance: {
    visualApproval: 'NOT_OBTAINED', accessibilityApproval: 'NOT_OBTAINED',
    realTaskTiming: 'NOT_RUN', clinicalGate: 'NO_GO_G2_G2b',
  },
  observations: PERSONAS.flatMap(p => VIEWPORTS.flatMap(width => p.routes.map(route => ({
    persona: p.id, viewportWidth: width, route, screenshotStatus: 'CAPTURED_NOT_REVIEWED',
    screenshotSha256: sha, documentWidth: width, routeSettleMs: 150,
    navigationStatus: 'PRESENT', mainLandmarkStatus: 'PRESENT',
    horizontalOverflow: 'NONE', outcome: 'ROUTE_RENDERED',
  })))),
  keyboardJourneys: PERSONAS.map(p => ({
    persona: p.id, desktopHomeViaEnter: 'OBSERVED', mobileSelectFocus: 'OBSERVED',
    mobileShiftTabToSignOut: 'NOT_OBSERVED', desktopRailToggle: 'OBSERVED',
    mobileMoreKeyboard: 'OBSERVED', mobilePermissionLinks: 'OBSERVED',
    mobileQuickLinkCount: 3, mobileBreakpointClosure: 'OBSERVED',
    mobileScrollLockRestored: 'OBSERVED', signOutViaEnter: 'OBSERVED',
    desktopNavigationMs: 123,
  })),
});
const workspace = () => ({
  schemaVersion: 1, environment: 'ISOLATED_SYNTHETIC_CI',
  evidenceType: 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY',
  governance: {
    clinicalGate: 'NO_GO_G2_G2b', humanApproval: 'NOT_OBTAINED',
    accessibilityApproval: 'NOT_OBTAINED', realTaskTiming: 'NOT_RUN',
  },
  summary: { observations: 15, failed: 0, screenshotsArchived: 0 },
  observations: roles.flatMap(([persona, route]) => widths.map(width => ({
    persona, width, route, outcome: 'ROUTE_RENDERED', overflow: 'NONE',
    keyboardSkip: 'PASS', roleVerified: 'PASS', screenshotSha256: sha,
  }))),
});
test('combines 175 real-route-format and 15 role/viewport-format receipts without claiming manual approval', () => {
  const receipt = buildM5IntegratedBrowserReceipt(audit(), workspace());
  assert.equal(receipt.automated.baselineRouteObservations, 175);
  assert.equal(receipt.automated.verifiedWorkspaceObservations, 15);
  assert.equal(receipt.manual.expectedRoleWidthStateObservations, 75);
  assert.equal(receipt.manual.status, 'NOT_QUALIFIED');
  assert.equal(receipt.manual.rows.length, 75);
  assert(receipt.manual.rows.every(r => Object.values(r.checks).every(v => v === 'NOT_RUN')));
  assert.equal(receipt.governance.clinicalGate, 'NO_GO_G2_G2b');
  assert.equal(receipt.milestoneCloseout, 'BLOCKED_PENDING_HUMAN_AND_OWNER_APPROVAL');
  assert.equal(JSON.stringify(receipt).includes('@'), false);
});
test('rejects fabricated or missing route and workspace source observations', () => {
  const mutations = [
    (a,w) => { a.observations.pop(); },
    (a,w) => { a.observations[0] = a.observations[1]; },
    (a,w) => { w.observations.pop(); },
    (a,w) => { w.observations[0] = w.observations[1]; },
    (a,w) => { w.observations[0].outcome = 'ROUTE_DENIED'; },
    (a,w) => { w.observations[0].width = '320'; },
    (a,w) => { w.observations[0].screenshotSha256 = 'raw image bytes'; },
    (a,w) => { w.governance.humanApproval = 'PASS'; },
    (a,w) => { a.governance.visualApproval = 'PASS'; },
  ];
  for (const mutate of mutations) {
    const a = audit(), w = workspace(); mutate(a,w);
    assert.throws(() => buildM5IntegratedBrowserReceipt(a,w));
  }
});
test('unexpected routes and denial remain visible, never turn into acceptance', () => {
  const a = audit();
  a.observations[0].outcome = 'ROUTE_DENIED';
  const receipt = buildM5IntegratedBrowserReceipt(a, workspace());
  assert.equal(receipt.automated.baselineRoutesNeedingReview, 1);
  assert.equal(receipt.automated.status, 'ROUTE_OBSERVATIONS_NEED_REVIEW');
  assert.equal(receipt.manual.status, 'NOT_QUALIFIED');
});
test('malicious object-valued receipt identity is rejected before toString side effects', () => {
  for (const isWorkspace of [true,false]) {
    const a = audit(), w = workspace(); let calls=0;
    const row = isWorkspace ? w.observations[0] : a.observations[0];
    row.persona = { toString() { calls++; row.outcome='ROUTE_RENDERED'; return 'speech-therapist'; } };
    assert.throws(() => buildM5IntegratedBrowserReceipt(a,w), /primitive identity/);
    assert.equal(calls,0);
  }
});
