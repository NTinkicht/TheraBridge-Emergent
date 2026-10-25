'use client';

import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Goal, HomeActivity, Template } from '@/lib/clinical';
import { centerLocalDay } from '@/lib/goal-review';
import { isCalendarDay, practiceCalendarMonth, scheduleProblem } from '@/lib/home-schedule';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shiftMonth(month: string, difference: number): string | null {
  if (!isCalendarDay(month + '-01')) return null;
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1 + difference;
  const shifted = new Date(Date.UTC(year, index, 1)).toISOString().slice(0, 7);
  return isCalendarDay(shifted + '-01') ? shifted : null;
}

export function HomePracticeCalendar({ activities, goals, templates, versionNumber, timezone, unsaved = false }: {
  activities: HomeActivity[];
  goals: Goal[];
  templates: Template[];
  versionNumber: number;
  timezone: string;
  unsaved?: boolean;
}) {
  const firstScheduledMonth = activities
    .filter(a => a.schedule && !scheduleProblem(a.schedule))
    .map(a => a.schedule!.startsOn.slice(0, 7)).sort()[0];
  const centerMonth = centerLocalDay(timezone, new Date())?.slice(0, 7) ?? '2026-10';
  const [month, setMonth] = useState(firstScheduledMonth ?? centerMonth);
  const [selectedDay, setSelectedDay] = useState('');
  const monthValid = isCalendarDay(month + '-01');
  const entries = practiceCalendarMonth(activities, month);
  const days = new Map<string, typeof entries>();
  for (const entry of entries) days.set(entry.date, [...(days.get(entry.date) ?? []), entry]);
  const chosenDay = selectedDay.startsWith(month + '-') && isCalendarDay(selectedDay) ?
    selectedDay : (entries[0]?.date ?? month + '-01');
  const chosenEntries = days.get(chosenDay) ?? [];
  const year = monthValid ? Number(month.slice(0, 4)) : 2000;
  const monthIndex = monthValid ? Number(month.slice(5, 7)) - 1 : 0;
  const offset = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const gridDays = monthValid ? Array.from({ length: Math.ceil((offset + count) / 7) * 7 },
    (_, index) => index < offset || index >= offset + count ? null : index - offset + 1) : [];
  const scheduledCount = activities.filter(a => !!a.schedule && !scheduleProblem(a.schedule)).length;
  const invalidCount = activities.filter(a => !!a.schedule && !!scheduleProblem(a.schedule)).length;
  const undatedCount = activities.filter(a => !a.schedule).length;
  const canGoBack = !!shiftMonth(month, -1);
  const canGoForward = !!shiftMonth(month, 1);
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthIndex, 1)));

  return <section className="space-y-3 rounded-card border border-border-light bg-surface-subtle p-3 sm:p-4"
    aria-label="Internal home-practice calendar" data-testid="home-practice-calendar">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <CalendarDays className="shrink-0 text-brand-action" size={18} aria-hidden="true" />
          Planned home-practice calendar
        </h3>
        <p className="text-[12px] text-brand-inkMuted">
          Plan version {versionNumber} · clinician-entered dates · internal only, not approved or shared.
          {unsaved ? ' Unsaved plan edits are shown as a local preview only.' : ' Read-only dated plan preview.'}
        </p>
      </div>
      <span className="rounded-control border border-border-light bg-surface-white px-2 py-1 text-[12px] text-brand-inkMuted"
        data-testid="home-calendar-count">{entries.length} planned item(s) · {days.size} date(s)</span>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" aria-label="Previous month" disabled={!canGoBack}
        data-testid="home-calendar-previous"
        onClick={() => setMonth(shiftMonth(month, -1) ?? month)}
        className="grid min-h-[40px] min-w-[40px] place-items-center rounded-control border border-border-light bg-surface-white focus-visible:outline-2 focus-visible:outline-brand-action disabled:opacity-40">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <label className="min-w-0 text-center text-[12px] font-semibold">
        <span className="block">{monthLabel}</span>
        <input type="month" min="2000-01" max="2100-12" value={month}
          data-testid="home-calendar-month" aria-label="Calendar month" 
          onChange={e => { if (isCalendarDay(e.target.value + '-01')) setMonth(e.target.value); }}
          className="mt-1 w-[155px] max-w-full rounded-control border border-border-light bg-surface-white px-2 py-2 text-[12px]" />
      </label>
      <button type="button" aria-label="Next month" disabled={!canGoForward}
        data-testid="home-calendar-next"
        onClick={() => setMonth(shiftMonth(month, 1) ?? month)}
        className="grid min-h-[40px] min-w-[40px] place-items-center rounded-control border border-border-light bg-surface-white focus-visible:outline-2 focus-visible:outline-brand-action disabled:opacity-40">
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
    <div className="min-w-0 overflow-hidden rounded-control border border-border-light bg-surface-white p-1 sm:p-2"
      data-testid="home-calendar-grid">
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-brand-inkMuted sm:gap-1 sm:text-[12px]">
        {dayNames.map(day => <span key={day} className="py-1">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {gridDays.map((day, index) => {
          if (day === null) return <span key={'blank-'+index} aria-hidden="true" />;
          const date = month + '-' + String(day).padStart(2, '0');
          const count = days.get(date)?.length ?? 0;
          const chosen = chosenDay === date;
          return <button type="button" key={date}
            data-testid={'home-calendar-day-'+date}
            aria-label={date + ': ' + count + ' planned home-practice item(s)'}
            aria-pressed={chosen}
            onClick={() => setSelectedDay(date)}
            className={'min-w-0 rounded-control border py-1 text-center focus-visible:outline-2 focus-visible:outline-brand-action ' +
              (chosen ? 'border-brand-action bg-brand-actionTint' : 'border-transparent hover:bg-surface-subtle')}>
            <span className="block text-[12px] font-semibold sm:text-[13px]">{day}</span>
            <span className={'mx-auto mt-0.5 block min-h-[13px] text-[10px] ' +
              (count ? 'font-semibold text-brand-action' : 'text-brand-inkMuted')} aria-hidden="true">
              {count ? count : '·'}
            </span>
          </button>;
        })}
      </div>
    </div>
    <div className="space-y-2 rounded-control border border-border-light bg-surface-white p-3"
      data-testid="home-calendar-day-details">
      <h4 className="text-[13px] font-semibold">Planned for {chosenDay}</h4>
      {chosenEntries.length ? <ul className="space-y-2">
        {chosenEntries.map(entry => {
          const activity = activities[entry.activityIndex];
          const title = activity.snapshot?.title ??
            templates.find(t => t.id === entry.templateId)?.title ?? 'Activity (library entry unavailable)';
          const goal = goals.find(g => g.key === entry.goalKey);
          return <li key={entry.activityIndex}
            className="min-w-0 rounded-control border border-border-light bg-surface-subtle p-2 text-[12px]"
            data-testid="home-calendar-item">
            <p className="break-words font-semibold">{title}</p>
            <p className="break-words text-brand-inkMuted">
              {goal ? 'Linked goal: ' + goal.title : 'No saved goal link'}
              {!activity.snapshot && ' · Current library title, not a frozen snapshot'}
            </p>
          </li>;
        })}
      </ul> : <p className="text-[12px] text-brand-inkMuted" data-testid="home-calendar-empty-day">
        No dated activity planned for this day.
      </p>}
    </div>
    {scheduledCount === 0 && <p className="text-[12px] text-brand-inkMuted" data-testid="home-calendar-no-schedules">
      No valid dated schedules in this version. Add and save a weekly or monthly draft schedule to visualize it.
    </p>}
    {(undatedCount > 0 || invalidCount > 0) && <p className="text-[12px] text-brand-inkMuted" data-testid="home-calendar-omissions">
      {undatedCount} undated or legacy activity/activities and {invalidCount} incomplete schedule(s) are not plotted.
    </p>}
    <p className="text-[12px] text-brand-inkMuted">
      Dates use the centre's local calendar ({timezone}); no timezone conversion. A planned activity is not a booking,
      completion record, observation, reminder, family task or clinical authorization.
      Recurrences are validated within the existing 366-day schedule limit.
    </p>
  </section>;
}
