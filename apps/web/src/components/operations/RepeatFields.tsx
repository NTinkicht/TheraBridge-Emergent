'use client';

import { Field } from '@/components/auth/Field';
import { SelectField } from '@/components/centers/kit';

export interface Repeat { mode: 'none' | 'weekly' | 'biweekly'; weekdays: number[]; end: 'count' | 'until'; count: string; until: string }
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function RepeatFields({ value, onChange }: { value: Repeat; onChange: (r: Repeat) => void }) {
  const toggle = (d: number) => onChange({ ...value, weekdays: value.weekdays.includes(d) ? value.weekdays.filter((x) => x !== d) : [...value.weekdays, d].sort() });
  return (
    <div className="space-y-3 rounded-control border border-border-light p-3" data-testid="book-repeat">
      <SelectField label="Repeat" value={value.mode} onChange={(v) => onChange({ ...value, mode: v as Repeat['mode'] })} testId="book-repeat-select"
        options={[{ value: 'none', label: 'Does not repeat' }, { value: 'weekly', label: 'Every week' }, { value: 'biweekly', label: 'Every 2 weeks' }]} />
      {value.mode !== 'none' && (
        <>
          <fieldset>
            <legend className="mb-1 text-[14px] font-medium">On these days</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((w, i) => {
                const on = value.weekdays.includes(i + 1);
                return (
                  <button key={w} type="button" aria-pressed={on} onClick={() => toggle(i + 1)} data-testid={`book-weekday-${i + 1}`}
                    className={`min-h-[40px] min-w-[48px] rounded-full border px-3 text-[13px] font-semibold transition-colors ${on ? 'border-brand-action bg-brand-action text-white' : 'border-border-light hover:bg-surface-subtle'}`}>{w}</button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SelectField label="Ends" value={value.end} onChange={(v) => onChange({ ...value, end: v as Repeat['end'] })} testId="book-repeat-end"
              options={[{ value: 'count', label: 'After a number of visits' }, { value: 'until', label: 'On a date' }]} />
            {value.end === 'count'
              ? <Field label="Visits (up to 60)" type="number" min={1} max={60} value={value.count} onChange={(e) => onChange({ ...value, count: e.target.value })} testId="book-repeat-count" />
              : <Field label="Last date (up to 26 weeks)" type="date" value={value.until} onChange={(e) => onChange({ ...value, until: e.target.value })} testId="book-repeat-until" />}
          </div>
        </>
      )}
    </div>
  );
}
