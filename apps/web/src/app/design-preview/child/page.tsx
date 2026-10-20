'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Camera, CircleCheck, FileText, Lock, ShieldCheck, Target, UserX } from 'lucide-react';
import { AppShell } from '@/components/design/AppShell';
import { ScrollStrip } from '@/components/design/ScrollStrip';
import { AccessDenied, EmptyState, StateGate } from '@/components/design/states';
import { Avatar, Card, CardHeader, LockedAction, Pill, SpecialtyTag } from '@/components/design/ui';
import { childSessions, daysFromNow, goals, observations, shortDate } from '@/lib/design/fixtures';

const TABS = ['Overview', 'Providers', 'Goals', 'Sessions', 'Progress', 'Reports', 'Plans', 'Evidence', 'Guardians', 'Access'] as const;
type Tab = (typeof TABS)[number];

function GoalList() {
  return (
    <ul className="space-y-3">
      {goals.map((g) => (
        <li key={g.id} className="flex flex-col gap-2 rounded-control border border-border-light p-4 sm:flex-row sm:items-center" data-testid={`goal-${g.id}`}>
          <Target size={18} className="shrink-0 text-brand-action" aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold">{g.title}</p><p className="text-[13px] text-brand-inkMuted"><span className="tnum">{g.observations}</span> observations · last {g.last} days ago</p></div>
          <div className="flex gap-2"><SpecialtyTag s={g.specialty} /><Pill tone={g.observations >= 3 ? 'info' : 'neutral'}>{g.status}</Pill></div>
        </li>
      ))}
    </ul>
  );
}

function Progress() {
  return (
    <div data-testid="progress-panel">
      <CardHeader title="Follows two-step directions in play" subtitle="Successful trials out of 5 per session, as recorded by the therapist" />
      <div className="mt-5 flex h-40 items-end gap-6 border-b border-l border-border-light px-4" role="img" aria-label="4 recorded observations: 2, 3, 3 and 4 out of 5">
        {[...observations].reverse().map((o) => (
          <div key={o.day} className="flex flex-1 flex-col items-center gap-1">
            <span className="tnum text-[12px] font-semibold">{o.value}/5</span>
            <span className="w-full max-w-[44px] rounded-t-[8px] bg-brand-action/80" style={{ height: `${o.value * 24}px` }} />
            <span className="text-[11px] text-brand-inkMuted">{shortDate(daysFromNow(-o.day))}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-control bg-status-infoSurface px-3 py-2.5 text-[13px] text-status-info" data-testid="insufficient-data">Not enough data to show a trend: at least 6 observations are needed. No conclusion is drawn.</p>
    </div>
  );
}

function VersionPanel({ kind }: { kind: 'Reports' | 'Plans' }) {
  const rows = kind === 'Plans'
    ? [{ v: 'Home plan v2', s: 'Frozen · awaiting authorized review', tone: 'caution' as const }, { v: 'Home plan v3', s: 'Draft', tone: 'neutral' as const }]
    : [{ v: 'Progress report v1', s: 'Draft · 3 sources unreviewed', tone: 'neutral' as const }];
  return (
    <div className="space-y-4">
      <ul className="space-y-3">{rows.map((r) => (
        <li key={r.v} className="flex flex-wrap items-center gap-3 rounded-control border border-border-light p-4"><FileText size={18} className="text-brand-action" aria-hidden="true" /><span className="flex-1 text-[15px] font-semibold">{r.v}</span><Pill tone={r.tone}>{r.s}</Pill></li>
      ))}</ul>
      <div className="flex flex-wrap gap-4 rounded-control bg-surface-subtle p-4" data-testid={`${kind.toLowerCase()}-locked-actions`}>
        <LockedAction id={`${kind.toLowerCase()}-sign-locked`} label="Sign" reason="Signing is disabled until the clinical policy is approved." />
        <LockedAction id={`${kind.toLowerCase()}-release-locked`} label="Release to guardian" reason="Release is disabled until the clinical policy is approved." />
      </div>
    </div>
  );
}

function TabBody({ tab }: { tab: Tab }) {
  switch (tab) {
    case 'Overview':
      return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-control border border-border-light p-4"><p className="text-[13px] text-brand-inkMuted">Next session</p><p className="mt-1 text-[16px] font-semibold">Today, 13:00 · Sensory room</p><div className="mt-2"><SpecialtyTag s="ot" long /></div></div>
          <div className="rounded-control border border-border-light p-4"><p className="text-[13px] text-brand-inkMuted">Family activity this week</p><p className="mt-1 text-[16px] font-semibold"><span className="tnum">3 of 5</span> marked done</p><p className="text-[13px] text-brand-inkMuted">Reported by the guardian</p></div>
          <div className="lg:col-span-2"><GoalList /></div>
        </div>
      );
    case 'Providers':
      return (
        <ul className="space-y-3">
          <li className="flex flex-wrap items-center gap-3 rounded-control border border-border-light p-4"><Avatar name="Leila Hassan" /><div className="min-w-0 flex-1"><p className="font-semibold">Leila Hassan</p><p className="text-[13px] text-brand-inkMuted">Assigned therapist</p></div><SpecialtyTag s="speech" /><SpecialtyTag s="ot" /></li>
          <li className="flex flex-wrap items-center gap-3 rounded-control border border-border-light p-4"><Avatar name="Jonas Weber" /><div className="min-w-0 flex-1"><p className="font-semibold">Jonas Weber</p><p className="text-[13px] text-brand-inkMuted">Coordinator · scheduling only, no clinical access</p></div></li>
        </ul>
      );
    case 'Goals':
      return <div className="space-y-4"><GoalList /><LockedAction id="add-goal-locked" label="Add goal" reason="Goal editing arrives in Phase 3." /></div>;
    case 'Sessions':
      return (
        <ul className="divide-y divide-border-light">
          {childSessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3"><span className="tnum w-16 text-[14px] font-semibold">{shortDate(daysFromNow(-s.daysAgo))}</span><SpecialtyTag s={s.specialty} /><span className="flex-1 text-[14px] text-brand-inkMuted">{s.therapist}</span><Pill tone="success" icon={CircleCheck}>{s.status}</Pill><Pill>{s.note}</Pill></li>
          ))}
        </ul>
      );
    case 'Progress':
      return <Progress />;
    case 'Reports':
    case 'Plans':
      return <VersionPanel kind={tab} />;
    case 'Evidence':
      return <EmptyState icon={Camera} title="No evidence captured" body="Photo, audio and video capture stay disabled until a consent model is approved." testId="evidence-empty" />;
    case 'Guardians':
      return (
        <ul className="space-y-3">
          <li className="flex flex-wrap items-center gap-3 rounded-control border border-border-light p-4"><Avatar name="Sara Morgan" /><div className="min-w-0 flex-1"><p className="font-semibold">Sara Morgan</p><p className="text-[13px] text-brand-inkMuted">Guardian · appointments and released plans</p></div><Pill tone="success" icon={ShieldCheck}>Active grant</Pill></li>
          <li className="flex flex-wrap items-center gap-3 rounded-control border border-border-light p-4"><Avatar name="Jordan Morgan" /><div className="min-w-0 flex-1"><p className="font-semibold">Jordan Morgan</p><p className="text-[13px] text-brand-inkMuted">Listed guardian · not invited</p></div><Pill icon={UserX}>No access</Pill></li>
        </ul>
      );
    case 'Access':
      return (
        <div className="space-y-4">
          <p className="text-[14px] text-brand-inkMuted">Only people with an active assignment or guardian grant can open this record. This is what anyone else sees, for example a coordinator following a copied link to a note:</p>
          <AccessDenied title="You don’t have access to this note" body="It belongs to a child outside your assignments. No details are shown." backHref="/design-preview/therapist" backLabel="Back to dashboard" testId="access-denied-example" />
        </div>
      );
  }
}

export default function ChildPreview() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [specialty, setSpecialty] = useState<'speech' | 'ot'>('speech');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('specialty') === 'ot') setSpecialty('ot');
  }, []);
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next]);
    refs.current[next]?.focus();
    refs.current[next]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  };

  return (
    <AppShell workspace="therapist" active="children" title="Alex Morgan">
      <Link href="/design-preview/therapist" className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-brand-action hover:underline" data-testid="back-to-dashboard"><ArrowLeft size={16} aria-hidden="true" /> Dashboard</Link>
      <Card className="tb-rise overflow-hidden" testId="child-context-header">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-6">
          <Avatar name="Alex Morgan" size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-[25px] font-semibold md:text-[31px]" data-testid="page-title">Alex Morgan</h1><Pill tone="brand" testId="fictional-record">Fictional record</Pill></div>
            <p className="mt-1 text-[14px] text-brand-inkMuted">6 years · Harbor Child Development Center · Guardian: Sara Morgan</p>
            <div className="mt-3 flex flex-wrap gap-2"><SpecialtyTag s="speech" long /><SpecialtyTag s="ot" long /></div>
          </div>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-brand-inkMuted">
            Working as
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value as 'speech' | 'ot')} className="min-h-[44px] rounded-control border border-border-strong bg-surface-white px-3 text-[14px] text-brand-ink" data-testid="child-specialty-context">
              <option value="speech">Speech therapy</option>
              <option value="ot">Occupational therapy</option>
            </select>
          </label>
        </div>
        <ScrollStrip role="tablist" ariaLabel="Child workspace" className="border-t border-border-light" innerClassName="gap-1 px-3 md:px-5" testId="child-tabs">
          {TABS.map((t, i) => (
            <button key={t} ref={(el) => { refs.current[i] = el; }} role="tab" aria-selected={tab === t} tabIndex={tab === t ? 0 : -1} onKeyDown={(e) => onKey(e, i)} onClick={() => setTab(t)} data-testid={`child-tab-${t.toLowerCase()}`}
              className={`relative min-h-[48px] whitespace-nowrap px-3 text-[14px] font-medium transition-colors ${tab === t ? 'text-brand-action' : 'text-brand-inkMuted hover:text-brand-ink'}`}>
              {t}
              {tab === t && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-brand-action" aria-hidden="true" />}
            </button>
          ))}
        </ScrollStrip>
      </Card>
      <Card className="mt-6 p-5 md:p-6" testId={`child-panel-${tab.toLowerCase()}`}>
        <div role="tabpanel" aria-label={tab}>
          <StateGate testId="child-panel" empty={<EmptyState icon={Lock} title={`Nothing in ${tab} yet`} body="Records appear here once they exist and you’re allowed to see them." />}>
            <TabBody tab={tab} />
          </StateGate>
        </div>
      </Card>
    </AppShell>
  );
}
