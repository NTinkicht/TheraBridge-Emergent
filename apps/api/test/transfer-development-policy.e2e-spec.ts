import {
  TRANSFER_DEVELOPMENT_POLICY, proposalExpiresAt, handoverPreviewExpiresAt,
  earliestPlannedGuardianNotice, coverageExpiryAlertTimes, emergencyReviewUntil,
  assertTransferClinicalActivationDisabled,
} from '../src/clinical/transfer-development-policy';

describe('TB-EM-052 provisional synthetic development policy', () => {
  const baseline = new Date('2026-11-01T12:00:00.000Z');

  it('records all five explicitly approved development defaults without activating clinical transfer', () => {
    expect(TRANSFER_DEVELOPMENT_POLICY).toMatchObject({
      clinicalActivationEnabled: false,
      p1GuardianAdvanceNoticeDays: 7,
      p2CoverageExpiryAlertHours: [168, 24, 1],
      p3PendingProposalExpiryDays: 7,
      p4EmergencySessionHorizonDays: 7,
      p5HandoverPreviewHours: 48,
    });
    expect(assertTransferClinicalActivationDisabled()).toBeUndefined();
  });

  it('calculates notice, proposal expiry and emergency session horizon in UTC', () => {
    expect(earliestPlannedGuardianNotice(baseline).toISOString()).toBe('2026-10-25T12:00:00.000Z');
    expect(proposalExpiresAt(baseline).toISOString()).toBe('2026-11-08T12:00:00.000Z');
    expect(emergencyReviewUntil(baseline).toISOString()).toBe('2026-11-08T12:00:00.000Z');
  });

  it('schedules coverage expiry alerts at 7 days, 24 hours and 1 hour', () => {
    expect(coverageExpiryAlertTimes(new Date('2026-11-10T12:00:00.000Z'))
      .map(d => d.toISOString())).toEqual([
      '2026-11-03T12:00:00.000Z', '2026-11-09T12:00:00.000Z', '2026-11-10T11:00:00.000Z',
    ]);
  });

  it('bounds preview to the earlier of 48 hours and proposal expiry', () => {
    expect(handoverPreviewExpiresAt(baseline, new Date('2026-11-08T12:00:00.000Z'))
      .toISOString()).toBe('2026-11-03T12:00:00.000Z');
    expect(handoverPreviewExpiresAt(baseline, new Date('2026-11-02T12:00:00.000Z'))
      .toISOString()).toBe('2026-11-02T12:00:00.000Z');
  });

  it('fails closed for invalid dates', () => {
    expect(() => proposalExpiresAt(new Date(NaN))).toThrow(RangeError);
    expect(() => handoverPreviewExpiresAt(baseline, new Date(NaN))).toThrow(RangeError);
  });
});
