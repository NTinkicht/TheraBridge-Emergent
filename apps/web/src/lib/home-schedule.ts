import type { ActivitySchedule } from './clinical';

// Local-calendar-only, internal draft recurrence. No patient notifications,
// appointment booking, approved home-plan delivery, or date-time conversion.
const dateUTC = (value: string): number => Date.parse(value + 'T00:00:00Z');
export function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const millis = dateUTC(value);
  return Number.isFinite(millis) && new Date(millis).toISOString().slice(0, 10) === value
    && Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100;
}
export function scheduleProblem(schedule?: ActivitySchedule): string | null {
  if (!schedule) return null;
  if (!isCalendarDay(schedule.startsOn) || !isCalendarDay(schedule.endsOn))
    return 'Choose valid start and end dates.';
  const span = (dateUTC(schedule.endsOn) - dateUTC(schedule.startsOn)) / 86_400_000;
  if (span < 0 || span > 366) return 'The end must follow the start, within one year.';
  if (schedule.cadence === 'WEEKLY') {
    const days = schedule.weekdays ?? [];
    if (!days.length || days.some(x => !Number.isInteger(x) || x < 0 || x > 6) || new Set(days).size !== days.length || schedule.monthDay !== undefined)
      return 'Choose at least one unique weekday.';
  } else if (schedule.cadence === 'MONTHLY') {
    if (!Number.isInteger(schedule.monthDay) || schedule.monthDay! < 1 || schedule.monthDay! > 31 || schedule.weekdays !== undefined)
      return 'Choose a day of the month from 1 to 31.';
  } else return 'Choose a valid schedule pattern.';
  let hasOccurrence = false;
  for (let t = dateUTC(schedule.startsOn); t <= dateUTC(schedule.endsOn); t += 86_400_000) {
    const d = new Date(t);
    if (schedule.cadence === 'WEEKLY' ? schedule.weekdays!.includes(d.getUTCDay()) : d.getUTCDate() === schedule.monthDay) {
      hasOccurrence = true;
      break;
    }
  }
  if (!hasOccurrence) return 'No practice dates occur within that range.';
  return null;
}
export function scheduledDays(schedule: ActivitySchedule, limit = 8): string[] {
  if (scheduleProblem(schedule) || limit < 1) return [];
  const days: string[] = [];
  const from = dateUTC(schedule.startsOn);
  const to = dateUTC(schedule.endsOn);
  for (let time = from; time <= to && days.length < Math.min(limit, 40); time += 86_400_000) {
    const d = new Date(time);
    if (schedule.cadence === 'WEEKLY' ? schedule.weekdays!.includes(d.getUTCDay()) : d.getUTCDate() === schedule.monthDay)
      days.push(d.toISOString().slice(0, 10));
  }
  // A 29th/30th/31st that does not exist in a month is skipped; never moved.
  return days;
}
export function scheduleDescription(schedule: ActivitySchedule): string {
  const label = schedule.cadence === 'WEEKLY' ?
    'Weekly on ' + (schedule.weekdays ?? []).map(i => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]).join(', ') :
    'Monthly on day ' + (schedule.monthDay ?? '—');
  return label + ' · ' + schedule.startsOn + ' to ' + schedule.endsOn;
}
