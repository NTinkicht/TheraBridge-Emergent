'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Baby, Building2, CalendarDays, Gauge, Home, LayoutDashboard, Moon, Smile } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { SignatureBand } from '@/components/brand/SignatureBand';
import { AccessDenied, Dialog, EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { Button, Card, CardHeader, LockedAction, Meter, Metric, Pill, SpecialtyTag } from '@/components/design/ui';
import { colors, familyThemes } from '@/styles/tokens';

const SCREENS = [
  { href: '/design-preview/platform', title: 'Platform dashboard', body: 'Applications queue, trial health, audit-style event timeline.', icon: Building2 },
  { href: '/design-preview/center', title: 'Center dashboard', body: 'Trial banner, server-enforced limits, onboarding and staff.', icon: Gauge },
  { href: '/design-preview/therapist', title: 'Therapist daily view', body: 'Specialty-scoped agenda timeline with tagged appointments.', icon: CalendarDays },
  { href: '/design-preview/child', title: 'Child profile', body: 'Context header, ten workspace tabs, honest locked actions.', icon: Baby },
  { href: '/design-preview/family', title: 'Parent home (light)', body: 'Warm, mobile-first home with this week’s day chips.', icon: Home },
  { href: '/design-preview/family?theme=dark', title: 'Parent home (dark)', body: 'Official family dark palette, same layout and routes.', icon: Moon },
];
const PRINCIPLES = [
  ['Calm precision for clinicians', 'Dense information, quiet chrome. Borders over shadows, tabular figures, one blue for every action and selection.'],
  ['Warmth for families', 'A warmer canvas, larger type, softer 16px radii, teal accents and fewer, clearer choices per screen.'],
  ['One honest system', 'Shared tokens and components across all six roles. Locked actions always explain why. Nothing pretends to be saved.'],
];
const SCALE: [string, string, string][] = [
  ['Page title', 'text-[25px] md:text-[31px] font-semibold', '31 / 25 px · 600'],
  ['Section title', 'text-[20px] font-semibold', '20 px · 600'],
  ['Card title', 'text-[18px] font-semibold', '17–18 px · 600'],
  ['Body', 'text-[16px]', '15–16 px · 400'],
  ['Label', 'text-[14px] font-medium', '13–14 px · 500'],
  ['Metadata', 'text-[12px] text-brand-inkMuted', '12–13 px · 400'],
];
const RESPONSIVE: [string, string][] = [
  ['1440', '254px sidebar, content capped at 1160px, 2-column dashboards.'],
  ['1024', 'Sidebar starts as a 76px icon rail and expands on demand. Grids drop from 4 to 2 columns.'],
  ['768', 'Icon rail stays. Cards stack in 1–2 columns, and agenda timeline/list are both available.'],
  ['390 / 320', 'Top bar plus bottom navigation (4 items + More sheet). 16px padding, list rows become cards, 44px targets.'],
];

function Swatches({ title, entries }: { title: string; entries: [string, string][] }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-brand-inkMuted">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {entries.map(([name, hex]) => (
          <div key={name + hex} className="overflow-hidden rounded-control border border-border-light bg-surface-white">
            <div className="h-12" style={{ backgroundColor: hex }} />
            <p className="truncate px-2 pt-1.5 text-[12px] font-medium">{name}</p>
            <p className="tnum px-2 pb-1.5 text-[11px] uppercase text-brand-inkMuted">{hex}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DirectionPage() {
  const [dialog, setDialog] = useState(false);
  return (
    <div className="min-h-screen bg-canvas-clinical">
      <SignatureBand />
      <main className="mx-auto max-w-[1160px] space-y-10 px-4 py-8 md:px-8 md:py-12">
        <section className="tb-rise">
          <BrandMark variant="lockup" height={96} />
          <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.1em] text-brand-action">Visual direction proposal · v1</p>
          <h1 className="mt-2 max-w-3xl font-display text-[30px] font-semibold leading-tight tracking-[-0.015em] md:text-[44px]" data-testid="page-title">Calm Precision, with warmth at home.</h1>
          <p className="mt-3 max-w-2xl text-[16px] text-brand-inkMuted">One TheraBridge system that feels exact for clinical and administrative work and welcoming for families. Review the five representative screens below at any width. The Data and Type controls in the dark bar switch states and typefaces live.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map(([t, b]) => <Card key={t} className="p-5"><p className="font-display text-[17px] font-semibold">{t}</p><p className="mt-2 text-[14px] text-brand-inkMuted">{b}</p></Card>)}
          </div>
        </section>

        <section aria-labelledby="screens-h">
          <h2 id="screens-h" className="font-display text-[20px] font-semibold">Representative screens</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SCREENS.map((s) => (
              <Link key={s.href} href={s.href} data-testid={`screen-card-${s.title.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                className="group rounded-card border border-border-light bg-surface-white p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_10px_30px_-18px_rgba(20,33,61,0.35)]">
                <span className="grid h-10 w-10 place-items-center rounded-[11px] bg-brand-actionTint text-brand-action"><s.icon size={19} aria-hidden="true" /></span>
                <p className="mt-4 flex items-center justify-between text-[16px] font-semibold">{s.title}<ArrowRight size={16} className="text-brand-action transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></p>
                <p className="mt-1 text-[14px] text-brand-inkMuted">{s.body}</p>
              </Link>
            ))}
          </div>
        </section>

        <Card className="space-y-6 p-5 md:p-6" testId="tokens-card">
          <CardHeader title="Color tokens" subtitle="Official values are unchanged. Additions are marked as complementary in tokens.ts." />
          <Swatches title="Brand" entries={Object.entries(colors.brand)} />
          <Swatches title="Surfaces & semantic" entries={[...Object.entries(colors.canvas), ...Object.entries(colors.border), ...Object.entries(colors.status)]} />
          <Swatches title="Specialty tags (always with a text label)" entries={Object.entries(colors.specialty)} />
          <Swatches title="Family light" entries={Object.entries(familyThemes.light).slice(0, 12)} />
          <Swatches title="Family dark (official)" entries={Object.entries(familyThemes.dark).slice(0, 12)} />
        </Card>

        <Card className="p-5 md:p-6" testId="type-card">
          <CardHeader title="Typography" subtitle="IBM Plex Sans throughout, with tabular figures for data. Alternative: Plus Jakarta Sans for display headings only." />
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <ul className="space-y-3">{SCALE.map(([n, cls, spec]) => <li key={n} className="flex items-baseline justify-between gap-4 border-b border-border-light pb-2"><span className={cls}>{n}</span><span className="tnum shrink-0 text-[12px] text-brand-inkMuted">{spec}</span></li>)}</ul>
            <div className="space-y-4">
              <div className="rounded-control bg-surface-subtle p-4"><p className="text-[12px] text-brand-inkMuted">IBM Plex Sans 600 (approved)</p><p className="mt-1 text-[26px] font-semibold" style={{ fontFamily: 'IBM Plex Sans' }}>Good morning, Sara</p></div>
              <div className="rounded-control bg-surface-subtle p-4"><p className="text-[12px] text-brand-inkMuted">Plus Jakarta Sans 600 (proposed alternative for headings)</p><p className="mt-1 text-[26px] font-semibold" style={{ fontFamily: 'Plus Jakarta Sans' }}>Good morning, Sara</p></div>
              <p className="text-[13px] text-brand-inkMuted">Why consider it: rounder, friendlier forms soften the family experience while Plex keeps data and body text precise. Cost: a second font file (~25 KB per weight). Recommendation: keep Plex unless the family screens feel too technical in review.</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6" testId="components-card">
          <CardHeader title="Shared components & states" />
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="flex flex-wrap items-start gap-3"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button></div>
              <div className="theme-family-light flex flex-wrap gap-3 rounded-control bg-fam-canvas p-3"><Button tone="family">Family primary</Button><Button tone="family" variant="secondary">Family secondary</Button></div>
              <LockedAction id="demo-locked" label="Release to guardian" reason="Disabled until the clinical policy is approved." />
              <div className="flex flex-wrap gap-2"><Pill tone="success">Active</Pill><Pill tone="caution">Pending</Pill><Pill tone="danger">Restricted</Pill><Pill tone="info">Up next</Pill><Pill tone="brand">Fictional record</Pill>{(['speech', 'ot', 'physio', 'aba', 'group'] as const).map((s) => <SpecialtyTag key={s} s={s} />)}</div>
              <div className="space-y-4"><Meter label="Therapist seats" value={2} max={3} /><Meter label="Trial days used" value={27} max={30} state="warn" /><Meter label="Children" value={1} max={1} state="planned" hint="Planned enforcement" /></div>
              <div className="grid grid-cols-2 gap-3"><Metric label="Active centers" value={3} sub="2 on trial" icon={LayoutDashboard} /><Metric label="Restricted" value={1} sub="Data kept" icon={Smile} accent="danger" /></div>
              <Button variant="secondary" onClick={() => setDialog(true)} data-testid="demo-dialog-open">Open confirmation dialog</Button>
            </div>
            <div className="space-y-5">
              <SkeletonRows rows={2} />
              <EmptyState icon={CalendarDays} title="No sessions today" body="Empty states explain what will appear and why." />
              <ErrorState onRetry={() => setDialog(false)} />
              <AccessDenied title="You don’t have access" body="Denied screens never reveal the resource’s content." backHref="/design-preview" backLabel="Back" />
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6" testId="responsive-card">
          <CardHeader title="Responsive behavior" />
          <dl className="mt-4 divide-y divide-border-light">{RESPONSIVE.map(([w, d]) => <div key={w} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr]"><dt className="tnum font-semibold">{w} px</dt><dd className="text-[14px] text-brand-inkMuted">{d}</dd></div>)}</dl>
        </Card>
      </main>
      <Dialog open={dialog} onClose={() => setDialog(false)} title="Revoke this invitation?" testId="demo-dialog"
        footer={<><Button variant="secondary" onClick={() => setDialog(false)}>Cancel</Button><Button variant="danger" onClick={() => setDialog(false)}>Revoke</Button></>}>
        <p className="text-[14px] text-brand-inkMuted">Confirmation dialogs name the consequence and offer a safe default.</p>
      </Dialog>
    </div>
  );
}
