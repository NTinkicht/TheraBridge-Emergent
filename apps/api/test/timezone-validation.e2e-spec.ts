import { BadRequestException } from '@nestjs/common';
import { addMonthsClamped, localDate, zonedDateEnd, zonedDateStart, zonedDayStart, zonedToUtc } from '../src/common/zoned';
import { dayStart } from '../src/operations/schedule.service';

describe('M2-H05 center-local scheduling and timezone invariants', () => {
  it('chooses the EARLIER UTC instant in the Europe/Paris and New York fall-back folds', () => {
    expect(zonedToUtc('2026-10-25', '02:30', 'Europe/Paris').toISOString()).toBe('2026-10-25T00:30:00.000Z');
    expect(zonedToUtc('2026-11-01', '01:30', 'America/New_York').toISOString()).toBe('2026-11-01T05:30:00.000Z');
  });

  it('rejects nonexistent clock times in spring-forward gaps with a structured client error', () => {
    for (const [date, time, tz] of [
      ['2026-03-29', '02:30', 'Europe/Paris'],
      ['2026-03-08', '02:30', 'America/New_York'],
    ]) {
      try {
        zonedToUtc(date, time, tz);
        throw new Error('Expected a daylight-saving gap to be rejected.');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).getResponse()).toEqual(expect.objectContaining({ code: 'NONEXISTENT_LOCAL_TIME' }));
      }
    }
  });

  it('preserves ordinary zone conversions across hemispheres and standard offsets', () => {
    expect(zonedToUtc('2026-02-10', '09:45', 'Asia/Dubai').toISOString()).toBe('2026-02-10T05:45:00.000Z');
    expect(zonedToUtc('2026-07-10', '09:45', 'America/New_York').toISOString()).toBe('2026-07-10T13:45:00.000Z');
    expect(zonedToUtc('2026-07-10', '09:45', 'Pacific/Auckland').toISOString()).toBe('2026-07-09T21:45:00.000Z');
    expect(() => zonedToUtc('2026-02-31', '09:45', 'Europe/Paris')).toThrow(BadRequestException);
  });

  it('returns actual center-local day boundaries, including 23-hour and 25-hour days', () => {
    const parisSpring = zonedDateStart('2026-03-29', 'Europe/Paris');
    const parisSpringEnd = zonedDayStart('2026-03-30', 'Europe/Paris');
    expect(parisSpring.toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(parisSpringEnd.getTime() - parisSpring.getTime()).toBe(23 * 3_600_000);
    expect(zonedDateEnd('2026-03-29', 'Europe/Paris').getTime()).toBe(parisSpringEnd.getTime() - 1);
    const parisFall = zonedDayStart('2026-10-25', 'Europe/Paris');
    expect(zonedDayStart('2026-10-26', 'Europe/Paris').getTime() - parisFall.getTime()).toBe(25 * 3_600_000);
    expect(localDate(parisFall, 'Europe/Paris')).toBe('2026-10-25');
  });

  it('is independent of the executor host timezone', () => {
    const baseline = process.env.TZ;
    const values: string[] = [];
    try {
      for (const tz of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
        process.env.TZ = tz;
        values.push(dayStart(new Date('2026-10-25T13:30:00.000Z'), 'Europe/Paris').toISOString());
        values.push(zonedToUtc('2026-11-03', '11:00', 'Asia/Dubai').toISOString());
      }
    } finally {
      if (baseline === undefined) delete process.env.TZ;
      else process.env.TZ = baseline;
    }
    expect(new Set(values.filter((_, i) => i % 2 === 0)).size).toBe(1);
    expect(new Set(values.filter((_, i) => i % 2 === 1)).size).toBe(1);
  });

  it('clamps calendar month rollovers instead of overflowing February', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsClamped('2026-03-31', -1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-11-30', 2)).toBe('2027-01-30');
  });
});
