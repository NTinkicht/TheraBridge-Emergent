'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CalendarX2, ClipboardCheck, Clock, FileClock, Inbox, LayoutList, Lock, MapPin, Rows3 } from 'lucide-react';
import { AppShell } from '@/components/design/AppShell';
import { ScrollStrip } from '@/components/design/ScrollStrip';
import { PageHeader } from '@/components/design/PageHeader';
import { EmptyState, StateGate } from '@/components/design/states';
import { Avatar, Card, CardHeader, LockedAction, Pill, SpecialtyTag, btn } from '@/components/design/ui';
import { appointments, longDate, type AppointmentFx } from '@/lib/design/fixtures';

type Filter = 'speech' | 'ot' | 'all';
const FILTER_LABEL: Record<Filter, string> = { speech: 'Speech therapy', ot: 'Occupational therapy', all: 'All specialties' };
const STATUS: Record<AppointmentFx['status'], { tone: 'success' | 'info' | 'neutral' | 'danger'; label: string }> = {
  completed: { tone: 'success', label: 'Completed' }, next: { tone: 'info', label: 'Up next' }, scheduled: { tone: 'neutral', label: 'Scheduled' }, cancelled: { tone: 'danger', label: 'Cancelled' },
};
const HOUR = 72;
const START = 8;
const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function ApptCard({ a, selected, onSelect, compact = false }: { a: AppointmentFx; selected: boolean; onSelect: () => void; compact?: boolean }) {
  const st = STATUS[a.status];
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} data-testid={`appointment-${a.id}`}
      className={`group flex h-full w-full min-w-0 gap-3 rounded-control border text-left transition-[border-color,box-shadow,background-color] duration-150 ${compact ? 'items-center px-3 py-1.5' : 'items-start p-4'} ${selected ? 'border-brand-action bg-brand-actionTint/60 shadow-[0_0_0_1px_#0F5692]' : 'border-border-light bg-surface-white hover:border-border-strong'} ${a.status === 'cancelled' ? 'opacity-70' : ''}`}>
      <span className={`self-stretch rounded-full ${compact ? 'w-1' : 'w-1'} ${a.specialty === 'speech' ? 'bg-specialty-speech' : 'bg-specialty-ot'}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="tnum text-[13px] font-semibold text-brand-inkMuted">{a.start}–{a.end}</span>
          <span className={`truncate text-[14px] font-semibold ${a.status === 'cancelled' ? 'line-through' : ''}`}>{a.child}</span>
          <SpecialtyTag s={a.specialty} />
          {!compact && <Pill tone={st.tone}>{st.label}</Pill>}
        </span>
        {!compact && <span className="mt-1 block text-[13px] text-brand-inkMuted">{a.note ?? `${a.focus} · ${a.room}`}</span>}
      </span>
    </button>
  );
}

export default function TherapistPreview() {
  const [filter, setFilter] = useState<Filter>('speech');
  const [view, setView] = useState<'timeline' | 'list'>('timeline');
  const [selectedId, setSelectedId] = useState('a3');
  const visible = appointments.filter((a) => filter === 'all' || a.specialty === filter);
  const selected = visible.find((a) => a.id === selectedId) ?? visible[0];
  const count = (f: Filter) => appointments.filter((a) => (f === 'all' || a.specialty === f) && a.status !== 'cancelled').length;

  return (
    <AppShell workspace="therapist" active="dashboard" title="Dashboard">
      <PageHeader crumbs={[{ label: 'Harbor Child Development Center' }, { label: 'Dashboard' }]} title="Good morning, Leila"
        context={`${longDate(new Date())} · ${FILTER_LABEL[filter]} workspace`}
        actions={<div className="flex flex-wrap gap-2"><Pill tone="info" icon={Clock} testId="badge-today">{count(filter)} appointments today</Pill><Pill tone="caution" icon={FileClock} testId="badge-reviews">2 pending reviews</Pill></div>} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ScrollStrip role="radiogroup" ariaLabel="Active specialty" className="w-full rounded-control border border-border-light bg-surface-white sm:w-auto" innerClassName="gap-1 p-1" testId="specialty-switcher">
          {(['speech', 'ot', 'all'] as Filter[]).map((f) => (
            <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)} data-testid={`specialty-${f}`}
              className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[9px] px-3 text-[13px] font-medium transition-colors sm:flex-none ${filter === f ? 'bg-brand-action text-white' : 'text-brand-inkMuted hover:bg-surface-subtle'}`}>
              {FILTER_LABEL[f]} <span className={`tnum rounded-full px-1.5 text-[11px] ${filter === f ? 'bg-white/20' : 'bg-surface-subtle'}`}>{count(f)}</span>
            </button>
          ))}
        </ScrollStrip>
        <div className="hidden gap-1 md:flex" role="group" aria-label="Agenda layout">
          <button onClick={() => setView('timeline')} aria-pressed={view === 'timeline'} className={`${btn('ghost', 'clinical', 'sm')} ${view === 'timeline' ? 'bg-brand-actionTint ring-1 ring-brand-action/30' : '!text-brand-inkMuted'}`} data-testid="view-timeline"><Rows3 size={15} aria-hidden="true" /> Timeline</button>
          <button onClick={() => setView('list')} aria-pressed={view === 'list'} className={`${btn('ghost', 'clinical', 'sm')} ${view === 'list' ? 'bg-brand-actionTint ring-1 ring-brand-action/30' : '!text-brand-inkMuted'}`} data-testid="view-list"><LayoutList size={15} aria-hidden="true" /> List</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-4 md:p-6" testId="agenda-card">
          <CardHeader title="Today’s agenda" subtitle={filter === 'all' ? 'Showing every specialty. Each card is tagged.' : `Only ${FILTER_LABEL[filter]} appointments. Switch to see others.`} />
          <div className="mt-4">
            <StateGate testId="agenda" rows={4} empty={<EmptyState icon={CalendarX2} title={`No ${FILTER_LABEL[filter]} appointments today`} body="Your day is clear in this specialty. Other specialties are not mixed in unless you pick All specialties." testId="agenda-empty" />}>
              <ul className={`space-y-3 ${view === 'timeline' ? 'md:hidden' : ''}`}>
                {visible.map((a) => <li key={a.id}><ApptCard a={a} selected={a.id === selected?.id} onSelect={() => setSelectedId(a.id)} /></li>)}
              </ul>
              {view === 'timeline' && (
                <div className="relative hidden md:block" style={{ height: (17 - START) * HOUR }} data-testid="agenda-timeline">
                  {Array.from({ length: 17 - START + 1 }, (_, i) => (
                    <div key={i} className="absolute inset-x-0 flex items-start gap-3" style={{ top: i * HOUR }}>
                      <span className="tnum -mt-2 w-12 shrink-0 text-right text-[12px] text-brand-inkMuted">{String(START + i).padStart(2, '0')}:00</span>
                      <span className="mt-0 h-px flex-1 bg-border-light" />
                    </div>
                  ))}
                  {visible.map((a) => (
                    <div key={a.id} className="absolute left-[64px] right-0 px-1" style={{ top: ((mins(a.start) - START * 60) / 60) * HOUR + 2, height: ((mins(a.end) - mins(a.start)) / 60) * HOUR - 4 }}>
                      <ApptCard a={a} compact selected={a.id === selected?.id} onSelect={() => setSelectedId(a.id)} />
                    </div>
                  ))}
                </div>
              )}
            </StateGate>
          </div>
        </Card>

        <div className="space-y-6">
          {selected && (
            <Card className="p-5" testId="appointment-detail">
              <p className="text-[12px] font-medium uppercase tracking-wide text-brand-inkMuted">Selected appointment</p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={selected.child} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold">{selected.child}</p>
                  <p className="tnum text-[13px] text-brand-inkMuted">{selected.start}–{selected.end}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2"><SpecialtyTag s={selected.specialty} long /><Pill tone={STATUS[selected.status].tone}>{STATUS[selected.status].label}</Pill></div>
              <dl className="mt-4 space-y-2 text-[14px]">
                <div className="flex gap-2"><ClipboardCheck size={16} className="mt-0.5 text-brand-inkMuted" aria-hidden="true" /><dd>{selected.focus}</dd></div>
                <div className="flex gap-2"><MapPin size={16} className="mt-0.5 text-brand-inkMuted" aria-hidden="true" /><dd>{selected.room}</dd></div>
              </dl>
              <div className="mt-5 flex flex-col gap-3">
                <Link href={`/design-preview/child?specialty=${selected.specialty}`} className={btn('primary')} data-testid="open-child-workspace">Open child workspace</Link>
                <LockedAction id="start-session-locked" label={selected.status === 'completed' ? 'Write session note' : 'Start session'} reason="Session workflow and note editor arrive in Phase 2." />
              </div>
            </Card>
          )}
          <Card className="p-5" testId="tasks-card">
            <CardHeader title="Plan & report tasks" />
            <ul className="mt-3 space-y-3 text-[14px]">
              <li className="rounded-control bg-surface-subtle p-3"><p className="font-semibold">Session note · Noah Patel</p><p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-brand-inkMuted"><SpecialtyTag s="ot" /> Draft not started</p></li>
              <li className="rounded-control bg-surface-subtle p-3"><p className="font-semibold">Home plan v2 · Alex Morgan</p><p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-brand-inkMuted"><SpecialtyTag s="speech" /><Pill tone="caution" icon={Lock}>Awaiting authorized review</Pill></p></li>
              <li className="rounded-control bg-surface-subtle p-3"><p className="font-semibold">Family request · Mila Santos</p><p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-brand-inkMuted"><Inbox size={14} aria-hidden="true" /> Home plan requested 2 days ago</p></li>
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
