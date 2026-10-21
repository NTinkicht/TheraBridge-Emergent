'use client';

import { useState } from 'react';
import { ChevronDown, Clock, Package, ShieldCheck } from 'lucide-react';
import { Pill } from '@/components/design/ui';
import { CHOICE_LABEL, CHOICE_TONE, dayName, type PracticeActivity, type Slot } from '@/lib/practice';

export function SlotChip({ slot, onRecord, testId }: { slot: Slot; onRecord?: () => void; testId: string }) {
  if (slot.recordable && onRecord) return <button type="button" onClick={onRecord} className="rounded-full border-2 border-dashed border-fam-accent px-3 py-1 text-[13px] font-semibold text-fam-accent hover:bg-fam-accentTint focus-visible:outline focus-visible:outline-2" aria-label={`Record ${dayName(slot.date, 'long')}`} data-testid={testId}>Record</button>;
  return <span data-testid={testId} data-status={slot.status}><Pill tone={CHOICE_TONE[slot.status]}>{CHOICE_LABEL[slot.status]}</Pill></span>;
}

export function ActivityCard({ a, slots, onRecord, testId }: { a: PracticeActivity; slots: Slot[]; onRecord?: (s: Slot) => void; testId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-card border border-fam-border bg-fam-surface p-4" data-testid={testId}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-fam-caution">Sample activity</p>
          <h3 className="text-[17px] font-semibold">{a.title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-fam-muted"><span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" />{a.minutes} min</span><span>{a.frequency}</span></p>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Planned days">
        {slots.map((s) => <li key={s.date} className="flex items-center gap-1.5 text-[13px]"><span className="text-fam-muted">{dayName(s.date)}</span><SlotChip slot={s} onRecord={onRecord ? () => onRecord(s) : undefined} testId={`${testId}-slot-${s.date}`} /></li>)}
        {!slots.length && <li className="text-[13px] text-fam-muted">Not planned for this day.</li>}
      </ul>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-fam-accent" data-testid={`${testId}-toggle`}>
        {open ? 'Hide' : 'Show'} how to do it<ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-3 space-y-3" data-testid={`${testId}-details`}>
          <div><p className="flex items-center gap-1.5 text-[13px] font-semibold"><Package size={14} aria-hidden="true" />You’ll need</p><p className="text-[14px]">{a.materials.join(', ') || 'Nothing special'}</p></div>
          <ol className="list-decimal space-y-1 pl-5 text-[14px]">{a.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          <div className="rounded-control bg-fam-warm p-3"><p className="flex items-center gap-1.5 text-[13px] font-semibold"><ShieldCheck size={14} aria-hidden="true" />Keep it safe</p><ul className="list-disc pl-5 text-[14px]">{a.safety.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
        </div>
      )}
    </article>
  );
}
