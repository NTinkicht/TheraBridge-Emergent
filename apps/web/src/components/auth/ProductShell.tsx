'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Home, KeyRound, Lock, LogOut, type LucideIcon } from 'lucide-react';
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

export function ProductShell({ session, active, planned, children }: { session: SessionInfo; active: 'home' | 'security'; planned: PlannedModule[]; children: ReactNode }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const ctx = session.activeContext;
  const where = ctx ? `${contextLabel(ctx)} · ${ROLE_LABELS[ctx.role]}` : 'No workspace selected';

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
          <NavLink href="/app" icon={Home} label="Home" active={active === 'home'} testId="nav-home" />
          <NavLink href="/account/security" icon={KeyRound} label="Account security" active={active === 'security'} testId="nav-security" />
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
          <NavLink href="/app" icon={Home} label="Home" active={active === 'home'} testId="mobile-nav-home" />
          <NavLink href="/account/security" icon={KeyRound} label="Security" active={active === 'security'} testId="mobile-nav-security" />
          {session.contexts.length > 1 && <NavLink href="/select-context" icon={ArrowLeftRight} label="Switch" active={false} testId="mobile-nav-switch" />}
        </nav>
        <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pb-14 pt-6 md:px-8 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
