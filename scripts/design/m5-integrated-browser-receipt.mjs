/**
 * M5 major PR4 — integrate REAL isolated-CI browser receipts, not manual approval.
 * Captured screenshots are NEVER copied to this output; only 64-hex digests survive.
 * Clinical, human accessibility, visual, task-timing and asset-rights signoffs
 * remain explicitly NOT_OBTAINED / NOT_RUN.
 */
import { validateBrowserReceipt } from './m5-browser-observe.mjs';
import { validateWU2Receipt, WU2_WIDTHS } from './m5-wu2-browser-qualification.mjs';
import { createPendingSyntheticEvidence } from '../qa/synthetic-evidence-matrix.mjs';
import { qualifySyntheticViewportEvidence } from '../qa/synthetic-viewport-evidence.mjs';

const TARGETS = Object.freeze([
  Object.freeze({ persona: 'speech-therapist', route: '/app/clinical' }),
  Object.freeze({ persona: 'coordinator', route: '/app/schedule' }),
  Object.freeze({ persona: 'supervisor', route: '/app/governance' }),
]);
const ownValue = (record, key) => {
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
      Object.getPrototypeOf(record) !== Object.prototype) throw new TypeError('unsafe browser evidence record');
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('missing or accessor-backed browser evidence');
  return descriptor.value;
};
export function buildM5IntegratedBrowserReceipt(browserAudit, workspaceReceipt) {
  // Do not invoke the original browser validators' string-key construction until
  // own-data primitive identities have been verified (no hostile toString).
  const auditRows = ownValue(browserAudit, 'observations');
  const workspaceRows = ownValue(workspaceReceipt, 'observations');
  if (!Array.isArray(auditRows) || auditRows.length !== 175 ||
      !Array.isArray(workspaceRows) || workspaceRows.length !== 15) {
    throw new TypeError('incomplete real-browser source observations');
  }
  for (const observation of auditRows) {
    if (typeof ownValue(observation, 'persona') !== 'string' ||
        typeof ownValue(observation, 'route') !== 'string' ||
        typeof ownValue(observation, 'viewportWidth') !== 'number') {
      throw new TypeError('invalid route-observation primitive identity');
    }
  }
  for (const observation of workspaceRows) {
    if (typeof ownValue(observation, 'persona') !== 'string' ||
        typeof ownValue(observation, 'route') !== 'string' ||
        typeof ownValue(observation, 'width') !== 'number') {
      throw new TypeError('invalid workspace-observation primitive identity');
    }
  }
  validateBrowserReceipt(browserAudit);
  validateWU2Receipt(workspaceReceipt);
  const observed = new Map();
  for (const observation of workspaceRows) {
    const key = observation.persona + ':' + observation.width;
    if (observed.has(key)) throw new TypeError('duplicate technical role/viewport');
    observed.set(key, observation);
  }
  const verified = [];
  for (const target of TARGETS) {
    for (const width of WU2_WIDTHS) {
      const item = observed.get(target.persona + ':' + width);
      if (!item || item.route !== target.route || item.outcome !== 'ROUTE_RENDERED' ||
          item.overflow !== 'NONE' || item.keyboardSkip !== 'PASS' ||
          item.roleVerified !== 'PASS' || !/^[0-9a-f]{64}$/.test(item.screenshotSha256)) {
        throw new TypeError('missing or failed observed synthetic role/viewport');
      }
      verified.push(Object.freeze({
        persona: target.persona, width, route: target.route,
        outcome: 'ROUTE_RENDERED', keyboardSkip: 'PASS', overflow: 'NONE',
        roleVerified: 'PASS', screenshotSha256: item.screenshotSha256,
        screenshotHumanReviewed: false,
      }));
    }
  }
  const manualRows = createPendingSyntheticEvidence({
    roles: TARGETS.map(target => target.persona), journeys: ['workspace'],
  });
  const manualState = qualifySyntheticViewportEvidence(manualRows, {
    roles: TARGETS.map(target => target.persona), journeys: ['workspace'],
  });
  if (manualState.status !== 'NOT_QUALIFIED' || manualState.expectedCount !== 75 ||
      manualState.observedCount !== 75) throw new Error('manual evidence unexpectedly qualified');
  const errors = auditRows.filter(row => row.outcome !== 'ROUTE_RENDERED').length;
  const overflow = auditRows.filter(row => row.horizontalOverflow !== 'NONE').length;
  return {
    schemaVersion: 1,
    environment: 'ISOLATED_SYNTHETIC_CI',
    evidenceType: 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY',
    scope: 'M5_PR4_ROLE_VIEWPORT_INTEGRATION',
    governance: {
      clinicalGate: 'NO_GO_G2_G2b', visualApproval: 'NOT_OBTAINED',
      accessibilityApproval: 'NOT_OBTAINED', ownerMilestoneSignoff: 'NOT_OBTAINED',
      assetRightsApproval: 'NOT_OBTAINED', taskTiming: 'NOT_RUN',
    },
    automated: {
      baselineRouteObservations: auditRows.length, baselineRoutesNeedingReview: errors,
      baselineOverflowsNeedingReview: overflow,
      verifiedWorkspaceObservations: verified.length,
      requiredWorkspaceObservations: TARGETS.length * WU2_WIDTHS.length,
      status: errors === 0 && overflow === 0 ? 'TECHNICAL_OBSERVATIONS_COMPLETE' : 'ROUTE_OBSERVATIONS_NEED_REVIEW',
      workspaceReceipts: verified,
    },
    manual: {
      status: manualState.status,
      expectedRoleWidthStateObservations: manualState.expectedCount,
      observedPendingObservations: manualState.observedCount,
      approvalsRecorded: 0,
      rows: manualRows,
    },
    milestoneCloseout: 'BLOCKED_PENDING_HUMAN_AND_OWNER_APPROVAL',
  };
}
