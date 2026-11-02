'use client';

import type { ActivitySchedule } from '@/lib/clinical';
import { scheduleDescription, scheduledDays, scheduleProblem } from '@/lib/home-schedule';

const input = 'mt-1 min-h-[42px] w-full rounded-control border border-border-light bg-surface-white px-3 py-2 text-[13px] disabled:opacity-60';
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HomeScheduleFields({ schedule, disabled, index, onChange }: {
  schedule?: ActivitySchedule; disabled: boolean; index: number;
  onChange: (value?: ActivitySchedule) => void;
}) {
  const problem = scheduleProblem(schedule);
  const days = schedule && !problem ? scheduledDays(schedule, 8) : [];
  return <div className="w-full space-y-2 rounded-control bg-surface-subtle p-3" data-testid={`activity-schedule-${index}`}>
    <label className="block text-[12px] font-semibold">Internal home-activity schedule
      <select className={input} value={schedule?.cadence ?? ''} disabled={disabled}
        onChange={e => {
          const cadence = e.target.value;
          if (cadence === 'WEEKLY') onChange({ cadence, startsOn: '', endsOn: '', weekdays: [] });
          else if (cadence === 'MONTHLY') onChange({ cadence, startsOn: '', endsOn: '' });
          else onChange(undefined);
        }} data-testid={`activity-schedule-cadence-${index}`}>
        <option value="">No dated schedule (legacy free-text frequency)</option>
        <option value="WEEKLY">Weekly — choose weekdays</option>
        <option value="MONTHLY">Monthly — choose day of month</option>
      </select>
    </label>
    {schedule && <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-[12px] font-semibold">Start date
          <input type="date" className={input} value={schedule.startsOn} disabled={disabled}
            onChange={e => onChange({ ...schedule, startsOn: e.target.value })}
            data-testid={`activity-schedule-start-${index}`} />
        </label>
        <label className="text-[12px] font-semibold">End date (maximum one year)
          <input type="date" className={input} value={schedule.endsOn} disabled={disabled}
            onChange={e => onChange({ ...schedule, endsOn: e.target.value })}
            data-testid={`activity-schedule-end-${index}`} />
        </label>
      </div>
      {schedule.cadence === 'WEEKLY' ? <fieldset className="space-y-2">
        <legend className="text-[12px] font-semibold">Practice weekdays</legend>
        <div className="flex flex-wrap gap-2" data-testid={`activity-schedule-weekdays-${index}`}>
          {weekdays.map((label, day) => <label key={day} className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-control border border-border-light bg-surface-white px-3 py-2 text-[12px]">
            <input type="checkbox" checked={(schedule.weekdays ?? []).includes(day)} disabled={disabled}
              onChange={e => onChange({
                ...schedule, weekdays: e.target.checked
                  ? [...(schedule.weekdays ?? []), day].sort((a, b) => a - b)
                  : (schedule.weekdays ?? []).filter(x => x !== day),
              })} />{label}
          </label>)}
        </div>
      </fieldset> : <label className="block max-w-[210px] text-[12px] font-semibold">Day of the month
        <input type="number" min={1} max={31} className={input} value={schedule.monthDay ?? ''}
          disabled={disabled} onChange={e => onChange({
            ...schedule, monthDay: e.target.value ? Number(e.target.value) : undefined,
          })} data-testid={`activity-schedule-monthday-${index}`} />
        <span className="mt-1 block font-normal text-brand-inkMuted">Dates that do not exist in a month are skipped.</span>
      </label>}
      {problem ? <p role="status" className="text-[12px] text-status-caution" data-testid={`activity-schedule-error-${index}`}>{problem} Save is disabled until the schedule is valid.</p> :
        <div className="space-y-1 text-[12px] text-brand-inkMuted" data-testid={`activity-schedule-preview-${index}`}>
          <p className="font-medium">{scheduleDescription(schedule)}</p>
          <p>First planned dates: {days.length ? days.join(' · ') : 'None within selected range'}</p>
        </div>}
      <p className="text-[12px] text-brand-inkMuted">Draft planning only. These dates do not create bookings, notifications or family-visible tasks.</p>
    </>}
  </div>;
}
