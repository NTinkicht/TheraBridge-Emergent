'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, ClipboardList, FileCheck2, Inbox, Lock, Users, type LucideIcon } from 'lucide-react';
import { CenterDashboard } from '@/components/operations/Dashboards';
import { FamilyHome } from '@/components/operations/FamilyHome';
import { ProductShell, type PlannedModule } from '@/components/auth/ProductShell';
import { useSession } from '@/components/auth/useSession';
import { FormAlert } from '@/components/auth/Field';
import { Card, Meter, Metric } from '@/components/design/ui';
import { centersApi } from '@/lib/centers';
import { SkeletonRows } from '@/components/design/states';
import { ROLE_LABELS, authApi, contextLabel, type SessionInfo } from '@/lib/auth';

const PLATFORM_PLANNED: PlannedModule[] = [];
const CENTER_PLANNED: PlannedModule[] = [
  { label: 'Therapy plans and session notes', unit: 'the clinical milestone', icon: ClipboardList },
];

function SetupBanner({ centerId }: { centerId: string }) {
  const [s, setS] = useState<{ done: number; total: number } | null>(null);
  useEffect(() => { centersApi.setup(centerId).then(setS).catch(() => setS(null)); }, [centerId]);
  if (!s || s.done === s.total) return null;
  return (
    <Card className="flex flex-col gap-4 border-brand-action/40 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6" testId="home-setup-banner">
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold">Finish setting up your center</p>
        <div className="mt-2 max-w-md"><Meter label="Setup progress" value={s.done} max={s.total} state="warn" testId="home-setup-meter" /></div>
      </div>
      <Link href="/app/setup" className="inline-flex min-h-[44px] items-center justify-center rounded-control bg-brand-action px-4 text-[14px] font-semibold text-white hover:bg-brand-actionHover" data-testid="home-setup-link">Continue setup</Link>
    </Card>
  );
}

type Summary = { kind: 'platform'; centers: number; activeCenters: number; pendingApplications: number } | { kind: 'center'; name: string; timezone: string; activeMembers: number };

function Planned({ modules }: { modules: PlannedModule[] }) {
  return (
    <Card className="p-5 md:p-6" testId="planned-modules-card">
      <h2 className="text-[18px] font-semibold">Coming next</h2>
      <p className="mt-1 text-[14px] text-brand-inkMuted">These areas are visible so you know what to expect. They are not built yet.</p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modules.map((m: { label: string; unit: string; icon: LucideIcon }) => (
          <li key={m.label} className="flex items-start gap-3 rounded-control border border-dashed border-border-strong bg-surface-subtle p-3" data-testid={`planned-${m.label.toLowerCase().replace(/\W+/g, '-')}`}>
            <m.icon size={18} className="mt-0.5 shrink-0 text-brand-inkMuted" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block break-words text-[14px] font-semibold">{m.label}</span>
              <span className="flex items-center gap-1 text-[12px] text-brand-inkMuted"><Lock size={11} aria-hidden="true" /> Arrives in {m.unit}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Home({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const ctx = session.activeContext;
  const [summary, setSummary] = useState<Summary | null>(null);
  const can = (p: string) => session.permissions.includes(p);

  useEffect(() => {
    if (!ctx) return;
    if (ctx.type === 'platform' && can('platform.summary.read')) {
      authApi.platformSummary().then((s) => setSummary({ kind: 'platform', ...s })).catch(onError);
    } else if (ctx.type === 'center' && can('center.summary.read')) {
      authApi.centerSummary(ctx.centerId).then((s) => setSummary({ kind: 'center', name: s.center.name, timezone: s.center.timezone, activeMembers: s.activeMembers })).catch(onError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.type, ctx && ctx.type === 'center' ? ctx.centerId : '']);

  if (!ctx) {
    return (
      <FormAlert tone="info" testId="home-no-context">
        {session.contexts.length > 1 ? <>Choose a workspace to continue. <Link className="font-semibold underline" href="/select-context">Choose workspace</Link></> : 'You don’t have an active center role right now. If you expected access, ask your center administrator.'}
      </FormAlert>
    );
  }
  const hasSummary = can('platform.summary.read') || can('center.summary.read');
  return (
    <div className="space-y-6">
      <div className="tb-rise">
        <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-brand-inkMuted">{ROLE_LABELS[ctx.role]}</p>
        <h1 className="mt-1 break-words font-display text-[28px] font-bold leading-tight md:text-[32px]" data-testid="home-title">Welcome, {session.user.displayName.split(' ')[0]}</h1>
        <p className="mt-1 text-[15px] text-brand-inkMuted">{contextLabel(ctx)}</p>
      </div>
      {ctx.type === 'center' && can('center.setup.manage') && <SetupBanner centerId={ctx.centerId} />}
      {ctx.type === 'center' && can('center.summary.read') ? <CenterDashboard centerId={ctx.centerId} isTherapist={ctx.role === 'THERAPIST'} onError={onError} />
        : ctx.type === 'center' && can('family.portal.read') ? <FamilyHome centerId={ctx.centerId} onError={onError} />
        : hasSummary ? (
        summary ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="home-summary">
            {summary.kind === 'platform' ? (
              <>
                <Link href="/app/applications?status=OPEN" className="rounded-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-action/40" data-testid="metric-pending-link">
                  <Metric label="Pending applications" value={summary.pendingApplications} sub="Submitted or under review" icon={Inbox} accent={summary.pendingApplications ? 'caution' : undefined} testId="metric-pending-applications" />
                </Link>
                <Link href="/app/centers" className="rounded-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-action/40" data-testid="metric-centers-link">
                  <Metric label="Centers" value={summary.centers} sub="All tenants on the platform" icon={Building2} testId="metric-centers" />
                </Link>
                <Metric label="Active centers" value={summary.activeCenters} sub="Not suspended" icon={FileCheck2} accent="success" testId="metric-active-centers" />
              </>
            ) : (
              <>
                <Metric label="Active members" value={summary.activeMembers} sub={`Staff and families at ${summary.name}`} icon={Users} testId="metric-active-members" />
                <Metric label="Center time zone" value={summary.timezone.split('/').pop()!.replace('_', ' ')} sub={summary.timezone} icon={ClipboardList} testId="metric-timezone" />
              </>
            )}
          </div>
        ) : (
          <Card className="p-5"><SkeletonRows rows={2} testId="home-summary-loading" /></Card>
        )
      ) : (
        <FormAlert tone="info" testId="home-role-pending">Your {ROLE_LABELS[ctx.role].toLowerCase()} workspace arrives in a later work unit. You are signed in securely in the meantime.</FormAlert>
      )}
      <Planned modules={ctx.type === 'platform' ? PLATFORM_PLANNED : CENTER_PLANNED} />
    </div>
  );
}

export default function AppHomePage() {
  const { state, handle } = useSession();
  if (state.status === 'loading') return <div className="p-8"><SkeletonRows rows={4} testId="session-loading" /></div>;
  if (state.status === 'error') return <div className="p-8"><FormAlert tone="danger" testId="session-error">{state.message}</FormAlert></div>;
  const ctx = state.data.activeContext;
  return (
    <ProductShell session={state.data} active="home" planned={ctx?.type === 'platform' ? PLATFORM_PLANNED : ctx ? CENTER_PLANNED : []}>
      <Home session={state.data} onError={handle} />
    </ProductShell>
  );
}
