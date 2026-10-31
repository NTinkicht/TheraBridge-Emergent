import { BadRequestException } from '@nestjs/common';

// Center-local calendar arithmetic. Dates are 'YYYY-MM-DD', times 'HH:MM', both in the IANA zone `tz`.
// Only the first occurrence of an ambiguous fall-back wall clock time is selected.
// Nonexistent spring-forward wall clock times are rejected explicitly (never silently shifted).
const fmts = new Map<string, Intl.DateTimeFormat>();
const fmt = (tz: string) => {
  let f = fmts.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmts.set(tz, f);
  }
  return f;
};

const wall = (ms: number, tz: string) => {
  const p = Object.fromEntries(fmt(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
};
const offset = (ms: number, tz: string) => wall(Math.floor(ms / 1000) * 1000, tz) - Math.floor(ms / 1000) * 1000;

export function zonedToUtc(date: string, time: string, tz: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
      Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) ||
      new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date) {
    throw new BadRequestException({ code: 'INVALID_LOCAL_TIME', message: 'Enter a valid calendar date and local time.' });
  }
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const desired = Date.UTC(y, m - 1, d, h, mi);
  // Sample both sides of the transition. One or two offsets round-trip for
  // valid wall times; a fold has two candidates; a gap has none.
  const offsets = new Set([-36, -24, -12, 0, 12, 24, 36].map(hours => offset(desired + hours * 3_600_000, tz)));
  const valid = [...offsets].map(o => desired - o).filter(t => wall(t, tz) === desired);
  if (valid.length) return new Date(Math.min(...valid));
  throw new BadRequestException({ code: 'NONEXISTENT_LOCAL_TIME', message: `Local time ${date} ${time} does not exist in ${tz} because of a daylight-saving transition.` });
}

// Format using fixed ISO field order rather than locale-dependent en-CA output.
export const localDate = (d: Date, tz: string) => new Date(wall(d.getTime(), tz)).toISOString().slice(0, 10);
export const localTime = (d: Date, tz: string) => d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
// Preserve the nominal day when crossing month-end, including February and leap years.
export const addMonthsClamped = (date: string, months: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  const targetMonth = new Date(Date.UTC(y, m - 1 + months, 1));
  const yy = targetMonth.getUTCFullYear();
  const mm = targetMonth.getUTCMonth();
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return new Date(Date.UTC(yy, mm, Math.min(d, last))).toISOString().slice(0, 10);
};
// First instant of a center-local calendar date, including zones that skip midnight.
// A binary search avoids the host OS timezone and tolerates 23/25-hour days.
export function zonedDayStart(date: string, tz: string): Date {
  const midnight = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(midnight)) throw new BadRequestException({ code: 'INVALID_CALENDAR_DATE', message: 'Enter a valid calendar date.' });
  let low = midnight - 36 * 3_600_000;
  let high = midnight + 36 * 3_600_000;
  while (high - low > 1) {
    const middle = low + Math.floor((high - low) / 2);
    if (localDate(new Date(middle), tz) < date) low = middle;
    else high = middle;
  }
  return new Date(high);
}
export const zonedDateStart = zonedDayStart;
export const zonedDateEnd = (date: string, tz: string) => new Date(zonedDayStart(addDays(date, 1), tz).getTime() - 1);
// ISO weekday: 1 = Monday … 7 = Sunday.
export const isoWeekday = (date: string) => ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export const asDate = (date: string) => new Date(`${date}T00:00:00Z`);
export const fromDate = (d: Date) => d.toISOString().slice(0, 10);
export const describeLocal = (d: Date, tz: string) =>
  `${d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })}`;
