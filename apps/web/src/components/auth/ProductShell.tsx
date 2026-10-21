'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Baby, Building2, CalendarDays, ClipboardCheck, Home, Inbox, KeyRound, LineChart, Lock, LogOut, MessagesSquare, NotebookPen, Settings2, Sparkles, Sprout, UserRound, Users, type LucideIcon } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { SignatureBand } from '@/components/brand/SignatureBand';
import { Avatar } from '@/components/design/ui';
import { ROLE_LABELS, authApi, contextLabel, type SessionInfo } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export interface PlannedModule {
  label: string;
  unit: string;
  icon: LucideIcon;
}

function NavLink({ href, icon: Icon, label, active, testId }: { href: string; icon: LucideIcon; label: string; active: boolean; testId: string }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} data-testid={testId}
      className={`relative flex min-h-[44px] shrink-0 items-center gap-2 rounded-control px-2.5 text-[14px] font-medium transition-colors md:gap-3 md:px-3 ${active ? 'bg-brand-actionTint text-brand-action' : 'text-brand-inkMuted hover:bg-surface-subtle hover:text-brand-ink'}`}>
      {active && <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-brand-action" />}
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      {label}
    </Link>
  );
}

const NAV: { key: string; href: string; icon: LucideIcon; label: string; short: string; permission?: string }[] = [
  { key: 'home', href: '/app', icon: Home, label: 'Home', short: 'Home' },
  { key: 'applications', href: '/app/applications', icon: Inbox, label: 'Center applications', short: 'Applications', permission: 'platform.applications.read' },
  { key: 'centers', href: '/app/centers', icon: Building2, label: 'Centers', short: 'Centers', permission: 'platform.centers.read' },
  { key: 'setup', href: '/app/setup', icon: ClipboardCheck, label: 'Center setup', short: 'Setup', permission: 'center.setup.manage' },
  { key: 'children', href: '/app/children', icon: Baby, label: 'Children', short: 'Children', permission: 'center.children.read' },
  { key: 'schedule', href: '/app/schedule', icon: CalendarDays, label: 'Schedule', short: 'Schedule', permission: 'center.schedule.read' },
  { key: 'messages', href: '/app/messages', icon: MessagesSquare, label: 'Messages', short: 'Messages', permission: 'center.messages.use' },
  { key: 'clinical', href: '/app/clinical', icon: NotebookPen, label: 'Clinical workspace', short: 'Clinical', permission: 'center.clinical.read' },
  { key: 'progress', href: '/app/progress', icon: LineChart, label: 'Progress', short: 'Progress', permission: 'center.clinical.read' },
  { key: 'activities', href: '/app/activities', icon: Sparkles, label: 'Activities', short: 'Activities', permission: 'center.activities.read' },
  { key: 'activities', href: '/app/activities', icon: Sparkles, label: 'Activities at home', short: 'Activities', permission: 'family.activities.read' },
  { key: 'family-progress', href: '/app/family-progress', icon: Sprout, label: 'Progress updates', short: 'Progress', permission: 'family.progress.demo' },
  { key: 'team', href: '/app/team', icon: Users, label: 'Team', short: 'Team', permission: 'center.staff.read' },
  { key: 'center', href: '/app/center', icon: Settings2, label: 'Center details', short: 'Center', permission: 'center.settings.read' },
  { key: 'profile', href: '/app/profile', icon: UserRound, label: 'My profile', short: 'Profile', permission: 'center.profile.self' },
  { key: 'security', href: '/account/security', icon: KeyRound, label: 'Account security', short: 'Security' },
];

export function ProductShell({ session, active, planned, children }: { session: SessionInfo; active: string; planned: PlannedModule[]; children: ReactNode }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const ctx = session.activeContext;
  const where = ctx ? `${contextLabel(ctx)} · ${ROLE_LABELS[ctx.role]}` : 'No workspace selected';
  const nav = NAV.filter((n) => !n.permission || session.permissions.includes(n.permission));

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await authApi.logout();
      router.replace('/login?signedout=1');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return router.replace('/login?signedout=1');
      setSignOutError('Sign-out did not complete. Check your connection and try again.');
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-canvas-clinical text-brand-ink" data-testid="product-shell">
      <aside className="sticky top-0 hidden h-screen w-sidebar shrink-0 flex-col border-r border-border-light bg-surface-white md:flex" data-testid="product-sidebar">
        <SignatureBand />
        <div className="flex h-16 items-center gap-2 px-5"><BrandMark variant="symbol" height={26} /><BrandMark variant="wordmark" height={17} /></div>
        {session.contexts.length > 1 && (
          <Link href="/select-context" className="mx-3 mb-3 flex items-center gap-2 rounded-control border border-border-light px-3 py-2 transition-colors hover:bg-surface-subtle" data-testid="workspace-switcher">
            <span className="min-w-0 flex-1">
              <span className="block break-words text-[13px] font-semibold">{ctx ? contextLabel(ctx) : 'Choose workspace'}</span>
              <span className="block text-[12px] text-brand-inkMuted">{ctx ? ROLE_LABELS[ctx.role] : `${session.contexts.length} available`}</span>
            </span>
            <ArrowLeftRight size={15} className="text-brand-inkMuted" aria-hidden="true" />
          </Link>
        )}
        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((n) => <NavLink key={n.key} href={n.href} icon={n.icon} label={n.label} active={active === n.key} testId={`nav-${n.key}`} />)}
          {planned.length > 0 && <p className="px-3 pb-1 pt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-inkMuted">Coming next</p>}
          {planned.map((m) => (
            <span key={m.label} aria-disabled="true" title={`Arrives in ${m.unit}`} data-testid={`nav-planned-${m.label.toLowerCase().replace(/\W+/g, '-')}`}
              className="flex min-h-[44px] cursor-not-allowed items-center gap-3 rounded-control px-3 text-[14px] text-brand-inkMuted/70">
              <m.icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span className="min-w-0 flex-1 break-words">{m.label}</span>
              <Lock size={13} aria-hidden="true" />
            </span>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="md:hidden"><SignatureBand /></div>
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-3 border-b border-border-light bg-surface-white px-4 py-2 md:px-8" data-testid="product-top-bar">
          <span className="md:hidden"><BrandMark variant="symbol" height={24} /></span>
          <p className="min-w-0 flex-1 break-words text-[14px] text-brand-inkMuted" data-testid="active-context-label">{where}</p>
          <span className="hidden items-center gap-2 lg:flex"><Avatar name={session.user.displayName} size={32} /><span className="text-[14px] font-medium">{session.user.displayName}</span></span>
          <button type="button" onClick={() => void signOut()} disabled={signingOut} data-testid="sign-out-button"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border-light px-3 text-[14px] font-medium transition-colors hover:bg-surface-subtle">
            <LogOut size={16} aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </header>
        {signOutError && <p role="alert" className="bg-status-dangerSurface px-4 py-2 text-[14px] font-medium text-status-danger md:px-8" data-testid="sign-out-error">{signOutError}</p>}
        <nav aria-label="Primary" className="flex gap-1 overflow-x-auto border-b border-border-light bg-surface-white px-2 py-2 md:hidden" data-testid="mobile-nav">
          {nav.map((n) => <NavLink key={n.key} href={n.href} icon={n.icon} label={n.short} active={active === n.key} testId={`mobile-nav-${n.key}`} />)}
          {session.contexts.length > 1 && <NavLink href="/select-context" icon={ArrowLeftRight} label="Switch" active={false} testId="mobile-nav-switch" />}
        </nav>
        <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pb-14 pt-6 md:px-8 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
