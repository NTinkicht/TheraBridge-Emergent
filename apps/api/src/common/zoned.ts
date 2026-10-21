// Center-local calendar arithmetic. Dates are 'YYYY-MM-DD', times 'HH:MM', both in the IANA zone `tz`.
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

// Ambiguous times (clocks going back) resolve to the later instant; times skipped by clocks going forward move forward by the gap.
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const o1 = offset(guess, tz);
  const t1 = guess - o1;
  const o2 = offset(t1, tz);
  if (o1 === o2) return new Date(t1);
  const t2 = guess - o2;
  return new Date(offset(t2, tz) === o2 ? t2 : Math.max(t1, t2));
}

export const localDate = (d: Date, tz: string) => d.toLocaleDateString('en-CA', { timeZone: tz });
export const localTime = (d: Date, tz: string) => d.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
// ISO weekday: 1 = Monday … 7 = Sunday.
export const isoWeekday = (date: string) => ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export const asDate = (date: string) => new Date(`${date}T00:00:00Z`);
export const fromDate = (d: Date) => d.toISOString().slice(0, 10);
export const describeLocal = (d: Date, tz: string) =>
  `${d.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' })} at ${d.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })}`;
