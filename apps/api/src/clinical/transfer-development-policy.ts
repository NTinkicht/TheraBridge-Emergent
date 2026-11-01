/**
 * TB-EM-052 owner-approved policy v1.1 (private PR #47, merged 2026-11-01).
 * Provisional development defaults approved by the project owner on 2026-11-01.
 * NOT PD-06 professional signoff. Synthetic-only; never use to authorize transfers.
 */
export const TRANSFER_DEVELOPMENT_POLICY = Object.freeze({
  clinicalActivationEnabled: false,
  p1GuardianAdvanceNoticeDays: 7,
  p2CoverageExpiryAlertHours: [168, 24, 1] as readonly number[],
  p3PendingProposalExpiryDays: 7,
  p4EmergencySessionHorizonDays: 7,
  p5HandoverPreviewHours: 48,
  provenance: 'NTinkicht/TheraBridge#47 (owner baseline; PD-06 attestations pending)',
} as const);

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function validDate(value: Date): number {
  const time = value.getTime();
  if (!Number.isFinite(time)) throw new RangeError('Invalid policy date.');
  return time;
}

export function proposalExpiresAt(createdAt: Date): Date {
  return new Date(validDate(createdAt) +
    TRANSFER_DEVELOPMENT_POLICY.p3PendingProposalExpiryDays * DAY_MS);
}

export function handoverPreviewExpiresAt(grantedAt: Date, proposalExpiresAtValue: Date): Date {
  return new Date(Math.min(
    validDate(grantedAt) + TRANSFER_DEVELOPMENT_POLICY.p5HandoverPreviewHours * HOUR_MS,
    validDate(proposalExpiresAtValue),
  ));
}

export function earliestPlannedGuardianNotice(effectiveAt: Date): Date {
  return new Date(validDate(effectiveAt) -
    TRANSFER_DEVELOPMENT_POLICY.p1GuardianAdvanceNoticeDays * DAY_MS);
}

export function coverageExpiryAlertTimes(expiresAt: Date): Date[] {
  return TRANSFER_DEVELOPMENT_POLICY.p2CoverageExpiryAlertHours.map(hours =>
    new Date(validDate(expiresAt) - hours * HOUR_MS));
}

export function emergencyReviewUntil(startedAt: Date): Date {
  return new Date(validDate(startedAt) +
    TRANSFER_DEVELOPMENT_POLICY.p4EmergencySessionHorizonDays * DAY_MS);
}

/** Deliberately fail closed until every separate clinical governance gate is signed. */
export function assertTransferClinicalActivationDisabled(): void {
  if (TRANSFER_DEVELOPMENT_POLICY.clinicalActivationEnabled !== false) {
    throw new Error('Clinical transfer activation requires separately signed authorization.');
  }
}
