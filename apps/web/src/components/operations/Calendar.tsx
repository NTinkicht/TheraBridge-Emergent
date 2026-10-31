'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, dayKey, minutesOfDay, timeRange, type Appointment } from '@/lib/operations';
import { serviceLabel } from './BookDialog';

const HOUR_PX = 56;
const TONE: Record<Appointment['status'], string> = {
  SCHEDULED: 'border-l-brand-action bg-brand-actionTint text-brand-ink',
  COMPLETED: 'border-l-status-success bg-status-successSurface text-brand-ink',
  CANCELLED: 'border-l-border-strong bg-surface-subtle text-brand-inkMuted line-through decoration-1',
  NO_SHOW: 'border-l-status-caution bg-status-cautionSurface text-brand-ink',
};
export const dayTitle = (day: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric' }) => new Date(`${day}T12:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
const hourLabel = (h: number) => new Date(Date.UTC(2020, 0, 1, h)).toLocaleTimeString(undefined, { hour: 'numeric', timeZone: 'UTC' });

// Places overlapping visits side by side within a day column.
function lanes(items: Appointment[]) {
  const ends: number[] = [];
  const placed = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map((a) => {
    const s = Date.parse(a.startsAt);
    let lane = ends.findIndex((e) => e <= s);
    if (lane < 0) lane = ends.push(0) - 1;
    ends[lane] = Date.parse(a.endsAt);
    return { a, lane };
  });
  return { placed, count: Math.max(1, ends.length) };
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function CalendarGrid({ days, items, onOpen, onSlot }: { days: string[]; items: Appointment[]; onOpen: (a: Appointment) => void; onSlot?: (day: string, time: string) => void }) {
  const now = useNow();
  // Appointment grouping and overlap lanes depend on schedule data, not the
  // once-per-minute clock tick or unrelated parent UI re-renders.
  const layout = useMemo(() => {
    const mins = items.flatMap((a) => [minutesOfDay(a.startsAt), minutesOfDay(a.startsAt) + (Date.parse(a.endsAt) - Date.parse(a.startsAt)) / 60000]);
    const first = Math.min(7, ...mins.map((m) => Math.floor(m / 60)));
    const last = Math.min(24, Math.max(19, ...mins.map((m) => Math.ceil(m / 60))));
    const grouped = new Map<string, Appointment[]>();
    for (const item of items) {
      const key = dayKey(item.startsAt);
      const group = grouped.get(key) ?? [];
      group.push(item);
      grouped.set(key, group);
    }
    return { first, last, hours: Array.from({ length: last - first }, (_, i) => first + i),
      byDay: new Map(days.map((d) => [d, lanes(grouped.get(d) ?? [])])) };
  }, [days, items]);
  const { first, last, hours } = layout;
  const today = dayKey(new Date(now));
  const nowMin = minutesOfDay(new Date(now).toISOString());
  return (
    <div className="overflow-hidden rounded-card border border-border-light bg-surface-white" data-testid="calendar-grid">
      <div className="grid border-b border-border-light" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
        <span />
        {days.map((d) => (
          <p key={d} className={`border-l border-border-light px-2 py-2 text-center text-[13px] font-semibold ${d === today ? 'text-brand-action' : ''}`} data-testid={`calendar-head-${d}`}>
            {dayTitle(d, days.length === 1 ? { weekday: 'long', month: 'long', day: 'numeric' } : { weekday: 'short', day: 'numeric' })}
          </p>
        ))}
      </div>
      <div className="max-h-[68vh] overflow-y-auto">
        <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))`, height: hours.length * HOUR_PX }}>
          <div>{hours.map((h) => <p key={h} className="tnum h-14 pr-2 pt-0.5 text-right text-[11px] text-brand-inkMuted">{hourLabel(h)}</p>)}</div>
          {days.map((d) => {
            const { placed, count } = layout.byDay.get(d)!;
            return (
              <div key={d} className="relative border-l border-border-light" data-testid={`calendar-day-${d}`}>
                {hours.map((h) => (
                  <button key={h} type="button" tabIndex={onSlot ? 0 : -1} disabled={!onSlot} onClick={() => onSlot?.(d, `${String(h).padStart(2, '0')}:00`)}
                    aria-label={onSlot ? `Book ${dayTitle(d, { weekday: 'long', month: 'short', day: 'numeric' })} at ${hourLabel(h)}` : undefined}
                    className="block h-14 w-full border-b border-border-light/70 transition-colors enabled:hover:bg-brand-actionTint/40 disabled:cursor-default" data-testid={`calendar-slot-${d}-${h}`} />
                ))}
                {d === today && nowMin >= first * 60 && nowMin <= last * 60 && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-status-danger" style={{ top: ((nowMin - first * 60) / 60) * HOUR_PX }} data-testid="calendar-now" />}
                {placed.map(({ a, lane }) => {
                  const top = ((minutesOfDay(a.startsAt) - first * 60) / 60) * HOUR_PX;
                  const height = Math.max(24, ((Date.parse(a.endsAt) - Date.parse(a.startsAt)) / 3_600_000) * HOUR_PX - 2);
                  return (
                    <button key={a.id} type="button" onClick={() => onOpen(a)} data-testid={`calendar-appt-${a.id}`}
                      aria-label={`${a.childFull}, ${serviceLabel(a.service)} with ${a.therapist}, ${timeRange(a.startsAt, a.endsAt)}, ${a.status.toLowerCase().replace('_', '-')}`}
                      className={`absolute z-[5] overflow-hidden rounded-[8px] border-l-[3px] px-1.5 py-1 text-left text-[12px] leading-tight shadow-sm transition-transform hover:z-20 hover:-translate-y-px focus-visible:z-20 ${TONE[a.status]}`}
                      style={{ top, height, left: `calc(${(lane / count) * 100}% + 2px)`, width: `calc(${100 / count}% - 4px)` }}>
                      <span className="tnum block font-semibold">{timeRange(a.startsAt, a.endsAt)}{a.seriesId ? ' ↻' : ''}</span>
                      <span className="block truncate font-semibold">{a.child}</span>
                      {height >= 48 && <span className="block truncate opacity-80">{a.therapist}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const weekOf = (anchor: string) => {
  const [y, m, d] = anchor.split('-').map(Number);
  const monday = addDays(anchor, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};
