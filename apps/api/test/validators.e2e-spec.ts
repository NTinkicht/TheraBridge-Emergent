import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { isCalendarDateValue, isIanaTimeZoneValue } from '../src/common/validators';
import { AssessmentDto, GoalDto, PlanDto } from '../src/clinical/clinical.dto';
import { ChildDto, SeriesDto } from '../src/operations/operations.dto';
import { UpdateCenterDto } from '../src/centers/centers.dto';
import { SubmitApplicationDto } from '../src/applications/applications.dto';
import { TransitionDto } from '../src/clinical/governance.dto';

const issues = (dto: object) => validateSync(dto).flatMap(e => [e.property]);
describe('M2-H05 strict calendar, IANA, numeric and string validation', () => {
  it('checks leap days and rejects impossible calendar days instead of normalizing them', () => {
    expect(isCalendarDateValue('2028-02-29')).toBe(true);
    for (const bad of ['2026-02-29', '2026-02-31', '2026-13-01', '0000-01-01', '2026-1-1', 'invalid']) {
      expect(isCalendarDateValue(bad)).toBe(false);
    }
    const child = { firstName: 'Synthetic', lastName: 'Child', services: ['speech'], dateOfBirth: '2026-02-31' };
    expect(issues(plainToInstance(ChildDto, child))).toContain('dateOfBirth');
    expect(issues(plainToInstance(ChildDto, { ...child, dateOfBirth: '2028-02-29' }))).not.toContain('dateOfBirth');
    const series = { childId: '00000000-0000-4000-8000-000000000001', membershipId: '00000000-0000-4000-8000-000000000002', service: 'speech',
      startDate: '2026-02-30', startTime: '10:00', durationMinutes: 30, weekdays: [1], intervalWeeks: 1, count: 2 };
    expect(issues(plainToInstance(SeriesDto, series))).toContain('startDate');
    expect(issues(plainToInstance(AssessmentDto, { service: 'speech', assessedOn: '2026-13-03', summary: 'Synthetic baseline', areas: [] }))).toContain('assessedOn');
  });

  it('checks IANA timezones in center creation/update and public applications', () => {
    for (const zone of ['Europe/Paris', 'Asia/Dubai', 'America/New_York', 'UTC']) expect(isIanaTimeZoneValue(zone)).toBe(true);
    for (const zone of ['Mars/Phobos', '', '  ', 'Paris/Unknown']) expect(isIanaTimeZoneValue(zone)).toBe(false);
    expect(issues(plainToInstance(UpdateCenterDto, { version: 1, timezone: 'Mars/Phobos' }))).toContain('timezone');
    expect(issues(plainToInstance(UpdateCenterDto, { version: 1, timezone: 'Asia/Dubai' }))).not.toContain('timezone');
    expect(issues(plainToInstance(SubmitApplicationDto, { timezone: 'Mars/Phobos' }))).toContain('timezone');
  });

  it('bounds percentages but preserves valid count/level measurements', () => {
    const goal = { key: 'a1', title: 'Synthetic measurable goal', measure: 'percent', baseline: 20, target: 80 };
    expect(issues(plainToInstance(GoalDto, goal))).toHaveLength(0);
    for (const [baseline, target] of [[-1, 80], [20, 101], [Number.POSITIVE_INFINITY, 90]]) {
      expect(issues(plainToInstance(GoalDto, { ...goal, baseline, target })).length).toBeGreaterThan(0);
    }
    expect(issues(plainToInstance(GoalDto, { ...goal, measure: 'count', baseline: 101, target: 200 }))).toHaveLength(0);
  });

  it('trims non-password text fields and rejects whitespace-only required values', () => {
    const plan = plainToInstance(PlanDto, { service: 'speech', title: '   ' });
    expect(plan.title).toBe('');
    expect(issues(plan)).toContain('title');
    const valid = plainToInstance(PlanDto, { service: 'speech', title: '  Synthetic Plan  ' });
    expect(valid.title).toBe('Synthetic Plan');
    expect(issues(valid)).toHaveLength(0);
    const transition = plainToInstance(TransitionDto, { action: 'RETURN', reason: '      ', version: 1 });
    expect(issues(transition)).toContain('reason');
  });
});
