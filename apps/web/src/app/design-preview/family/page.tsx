'use client';

import { useMemo, useState } from 'react';
import { BookOpen, CalendarClock, Check, CircleHelp, Clock, Coffee, Lock, MapPin, MessageCircle, SkipForward, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/design/AppShell';
import { usePreview } from '@/components/design/PreviewContext';
import { Dialog, EmptyState, StateGate } from '@/components/design/states';
import { Avatar, Button, Card, CardHeader, LockedAction, Pill } from '@/components/design/ui';
import { activitySteps, longDate, pastOutcomes, shortDate, weekPlan, weekdayShort } from '@/lib/design/fixtures';

type Scenario = 'illustration' | 'today';
const OUTCOME = {
  done: { label: 'Done', icon: Check, cls: 'text-status-success' },
  skipped: { label: 'Skipped', icon: SkipForward, cls: 'text-fam-muted' },
  'needs-help': { label: 'Needs help', icon: CircleHelp, cls: 'text-status-caution' },
};

function useWeek() {
  return useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return weekPlan.map((activity, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const rel = date.toDateString() === now.toDateString() ? 'today' : date < now ? 'past' : 'future';
      return { i, date, activity, rel, outcome: rel === 'past' && activity ? pastOutcomes[i] : null };
    });
  }, []);
}

export default function FamilyPreview() {
  const { notify } = usePreview();
  const week = useWeek();
  const [scenario, setScenario] = useState<Scenario>('illustration');
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [open, setOpen] = useState(false);
  const today = week.find((d) => d.rel === 'today');
  const next = week.find((d) => d.rel !== 'past' && d.activity);
  const released = scenario === 'illustration';
  const chosen = week[day];
  const nextAppt = new Date();
  nextAppt.setDate(nextAppt.getDate() + (nextAppt.getDay() === 5 ? 3 : nextAppt.getDay() === 6 ? 2 : 1));

  return (
    <AppShell workspace="family" active="home" title="Home">
      <div className="tb-rise mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[14px] text-fam-muted" suppressHydrationWarning>{longDate(new Date())}</p>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight text-fam-ink md:text-[34px]" data-testid="page-title">Good morning, Sara</h1>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-fam-border bg-fam-surface py-1 pl-1 pr-3 text-[14px] font-medium" data-testid="child-context">
            <Avatar name="Alex Morgan" size={28} /> Alex · Harbor Child Development Center
          </p>
        </div>
        <label className="flex flex-col gap-1 text-[12px] font-medium text-fam-muted">
          Preview scenario
          <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)} className="min-h-[44px] rounded-control border border-fam-border bg-fam-surface px-3 text-[14px] text-fam-ink" data-testid="release-scenario">
            <option value="illustration">Illustration: a released plan (future)</option>
            <option value="today">Today’s policy: nothing released</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card tone="family" className="relative overflow-hidden p-6 md:p-7" testId="today-activity-card">
          <StateGate tone="family" testId="today-activity" empty={<EmptyState tone="family" icon={Sparkles} title="Nothing planned yet" body="When your therapist shares a home plan, today’s activity will appear here." />}>
            {released ? (
              <>
                <Pill tone="family" icon={Sparkles}>{today?.activity ? 'Today’s activity' : 'Next activity'}</Pill>
                <h2 className="mt-4 font-display text-[24px] font-semibold text-fam-ink md:text-[28px]">{(today?.activity ?? next?.activity)?.title ?? 'A restful day'}</h2>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-fam-strong">
                  <span className="inline-flex items-center gap-1.5"><Clock size={16} aria-hidden="true" /> <span className="tnum">{(today?.activity ?? next?.activity)?.minutes ?? 0}</span> minutes</span>
                  <span className="inline-flex items-center gap-1.5"><BookOpen size={16} aria-hidden="true" /> Home plan v2</span>
                </p>
                <p className="mt-4 max-w-md text-[15px] text-fam-muted">Ready to try? It’s a calm game you can play together, no special equipment needed.</p>
                <Button tone="family" size="lg" className="mt-6 w-full sm:w-auto" onClick={() => setOpen(true)} data-testid="start-activity">Start activity</Button>
                <p className="mt-4 text-[12px] text-fam-muted" data-testid="illustration-label">Illustration only: plan release is not yet approved in TheraBridge.</p>
              </>
            ) : (
              <EmptyState tone="family" icon={BookOpen} title="No home plan shared with you yet" body="Your therapist will let you know when one is ready. Nothing here is hidden from you." testId="no-release-state" />
            )}
          </StateGate>
        </Card>

        <div className="space-y-5">
          <Card tone="family" className="p-5" testId="next-appointment-card">
            <CardHeader tone="family" title="Next appointment" />
            <div className="mt-4 flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[16px] bg-fam-accentTint text-center text-fam-accent">
                <span><span className="block text-[12px] font-semibold uppercase" suppressHydrationWarning>{weekdayShort(nextAppt)}</span><span className="tnum block text-[22px] font-semibold leading-none" suppressHydrationWarning>{nextAppt.getDate()}</span></span>
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold">Speech therapy · 10:30</p>
                <p className="text-[14px] text-fam-muted">with Leila Hassan</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-fam-muted"><MapPin size={14} aria-hidden="true" /> Room 2, Harbor</p>
              </div>
            </div>
            <div className="mt-4"><LockedAction id="request-change-locked" tone="family" size="sm" label="Ask to change" reason="Appointment requests arrive in Phase 4." /></div>
          </Card>
          <Card tone="family" className="p-5" testId="message-card">
            <CardHeader tone="family" title="From Alex’s therapist" />
            <div className="mt-3 flex gap-3">
              <Avatar name="Leila Hassan" />
              <p className="rounded-[16px] rounded-tl-[6px] bg-fam-tile px-4 py-3 text-[14px] text-fam-strong">Bubble breaths before bedtime worked nicely last week. Let me know if any step feels tricky.</p>
            </div>
            <div className="mt-4"><LockedAction id="reply-locked" tone="family" size="sm" label="Reply" reason="Messaging is off until your center enables it." /></div>
          </Card>
        </div>
      </div>

      <Card tone="family" className="mt-5 p-5 md:p-6" testId="week-card">
        <CardHeader tone="family" title="Your week together" subtitle={released ? 'From the shared home plan · tap a day' : 'Activities appear once a plan is shared'} />
        {released ? (
          <>
            <div className="mt-5 hidden grid-cols-7 gap-2 md:grid" role="group" aria-label="Days this week">
              {week.map((d) => {
                const o = d.outcome ? OUTCOME[d.outcome] : null;
                return (
                  <button key={d.i} type="button" onClick={() => setDay(d.i)} aria-pressed={day === d.i} data-testid={`day-chip-${d.i}`}
                    className={`flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-[16px] border px-2 py-3 transition-[background-color,border-color] ${day === d.i ? 'border-fam-accent bg-fam-accentTint' : 'border-fam-border bg-fam-raised hover:bg-fam-tile'}`}>
                    <span className={`text-[12px] font-semibold uppercase tracking-wide ${d.rel === 'today' ? 'text-fam-accent' : 'text-fam-muted'}`} suppressHydrationWarning>{d.rel === 'today' ? 'Today' : weekdayShort(d.date)}</span>
                    <span className="tnum text-[22px] font-semibold" suppressHydrationWarning>{d.date.getDate()}</span>
                    <span className={`inline-flex items-center gap-1 text-[12px] ${o ? o.cls : 'text-fam-muted'}`}>
                      {o ? <><o.icon size={13} aria-hidden="true" />{o.label}</> : d.activity ? `${d.activity.minutes} min` : 'Rest'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 hidden rounded-[16px] bg-fam-instruction p-4 md:block" data-testid="day-detail">
              {chosen.activity ? <p className="text-[15px]"><span className="font-semibold">{chosen.activity.title}</span> · {chosen.activity.minutes} minutes{chosen.outcome ? ` · ${OUTCOME[chosen.outcome].label}` : ''}</p> : <p className="inline-flex items-center gap-2 text-[15px] text-fam-muted"><Coffee size={16} aria-hidden="true" /> Rest day, nothing planned.</p>}
            </div>
            <ul className="mt-4 space-y-3 md:hidden" data-testid="week-list-mobile">
              {week.filter((d) => d.activity).map((d) => {
                const o = d.outcome ? OUTCOME[d.outcome] : null;
                return (
                  <li key={d.i} className={`flex items-center gap-4 rounded-[16px] border p-4 ${d.rel === 'today' ? 'border-fam-accent bg-fam-accentTint' : 'border-fam-border bg-fam-raised'}`}>
                    <span className="w-12 shrink-0 text-center"><span className="block text-[11px] font-semibold uppercase text-fam-muted" suppressHydrationWarning>{d.rel === 'today' ? 'Today' : weekdayShort(d.date)}</span><span className="tnum block text-[20px] font-semibold" suppressHydrationWarning>{d.date.getDate()}</span></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{d.activity?.title}</span><span className="text-[13px] text-fam-muted">{d.activity?.minutes} minutes</span></span>
                    {o && <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${o.cls}`}><o.icon size={14} aria-hidden="true" />{o.label}</span>}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-fam-instruction p-4 text-[14px] text-fam-muted"><CalendarClock size={18} aria-hidden="true" /> You asked for a home plan on {shortDate(new Date(Date.now() - 6 * 864e5))}. <Pill tone="caution">Pending</Pill></div>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} tone="family" title={(today?.activity ?? next?.activity)?.title ?? 'Activity'} testId="activity-dialog"
        footer={<>
          {(['done', 'skipped', 'needs-help'] as const).map((k) => {
            const o = OUTCOME[k];
            return <Button key={k} tone="family" variant={k === 'done' ? 'primary' : 'secondary'} onClick={() => { setOpen(false); notify('We couldn’t save this yet: the preview isn’t connected. Nothing was recorded.'); }} data-testid={`outcome-${k}`}><o.icon size={16} aria-hidden="true" />{o.label}</Button>;
          })}
        </>}>
        <ol className="space-y-3">
          {activitySteps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-[14px] bg-fam-instruction p-3 text-[15px] text-fam-strong"><span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fam-accent text-[13px] font-semibold text-fam-onAccent">{i + 1}</span>{s}</li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-[13px] text-fam-muted"><MessageCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Stop whenever Alex wants a break. If something worries you, contact the center.</p>
        <p className="mt-2 flex items-start gap-2 text-[13px] text-fam-muted"><Lock size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> Answers are saved only once TheraBridge confirms them. This preview can’t save.</p>
      </Dialog>
    </AppShell>
  );
}
