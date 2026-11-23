'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Baby, Building2, CalendarDays, ChevronDown, ChevronRight, ClipboardCheck, Home, Inbox, KeyRound, LineChart, ListChecks, Lock, LogOut, Menu, MessagesSquare, Moon, NotebookPen, PanelLeftClose, PanelLeftOpen, Settings2, Sparkles, Sprout, Sun, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { SignatureBand } from '@/components/brand/SignatureBand';
import { Avatar } from '@/components/design/ui';
import { useAppTheme } from '@/components/theme/useAppTheme';
import { ROLE_LABELS, authApi, contextLabel, type SessionInfo } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { groupAuthorizedNav, quickMobileNav } from './nav-areas';

export interface PlannedModule {
  label: string;
  unit: string;
  icon: LucideIcon;
}

function NavLink({ href, icon: Icon, label, active, testId, family = false, compact = false }: { href: string; icon: LucideIcon; label: string; active: boolean; testId: string; family?: boolean; compact?: boolean }) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} data-testid={testId} title={compact ? label : undefined}
      className={`relative flex min-h-[44px] shrink-0 items-center gap-2 rounded-control px-2.5 text-[14px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action md:gap-3 md:px-3 ${compact ? 'justify-center' : ''} ${active ? (family ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action') : (family ? 'text-fam-muted hover:bg-fam-tile hover:text-fam-ink' : 'text-brand-inkMuted hover:bg-surface-subtle hover:text-brand-ink')}`}>
      {active && <span aria-hidden="true" className={`absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full ${family ? 'bg-fam-accent' : 'bg-brand-action'}`} />}
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <span className={compact ? 'sr-only' : undefined}>{label}</span>
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
  { key: 'governance', href: '/app/governance', icon: ClipboardCheck, label: 'Documents & review', short: 'Review', permission: 'center.clinical.read' },
  { key: 'access-review', href: '/app/access-review', icon: Users, label: 'Access & consent', short: 'Access', permission: 'center.governance.read' },
  { key: 'progress', href: '/app/progress', icon: LineChart, label: 'Progress', short: 'Progress', permission: 'center.clinical.read' },
  { key: 'practice-feedback', href: '/app/practice-feedback', icon: Inbox, label: 'Practice feedback', short: 'Feedback', permission: 'center.practice.read' },
  { key: 'activities', href: '/app/activities', icon: Sparkles, label: 'Activities', short: 'Activities', permission: 'center.activities.read' },
  { key: 'activities', href: '/app/activities', icon: Sparkles, label: 'Sample activity library', short: 'Library', permission: 'family.activities.read' },
  { key: 'practice', href: '/app/practice', icon: ListChecks, label: 'Home practice', short: 'Practice', permission: 'family.practice.read' },
  { key: 'family-progress', href: '/app/family-progress', icon: Sprout, label: 'Progress updates', short: 'Progress', permission: 'family.progress.demo' },
  { key: 'family-documents', href: '/app/family-documents', icon: NotebookPen, label: 'Family documents', short: 'Documents', permission: 'family.progress.demo' },
  { key: 'team', href: '/app/team', icon: Users, label: 'Team', short: 'Team', permission: 'center.staff.read' },
  { key: 'center', href: '/app/center', icon: Settings2, label: 'Center details', short: 'Center', permission: 'center.settings.read' },
  { key: 'profile', href: '/app/profile', icon: UserRound, label: 'My profile', short: 'Profile', permission: 'center.profile.self' },
  { key: 'security', href: '/account/security', icon: KeyRound, label: 'Account security', short: 'Security' },
];

export function ProductShell({ session, active, planned, children }: { session: SessionInfo; active: string; planned: PlannedModule[]; children: ReactNode }) {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const ctx = session.activeContext;
  const where = ctx ? `${contextLabel(ctx)} · ${ROLE_LABELS[ctx.role]}` : 'No workspace selected';
  // Client-side grouping is display-only; server session permissions still control every route.
  const groups = groupAuthorizedNav(NAV, session.permissions);
  const nav = groups.flatMap((group) => group.items);
  // Search only authorized, session-scoped destinations; no route/grant inference.
  const searchTerm = navQuery.trim().toLocaleLowerCase();
  const visibleGroups = searchTerm ? groups.map(group => ({
    ...group, items: group.items.filter(item => `${item.label} ${group.label}`.toLocaleLowerCase().includes(searchTerm)),
  })).filter(group => group.items.length > 0) : groups;
  const mobileQuick = quickMobileNav(groups);
  const activeNav = nav.find((n) => n.key === active);
  const activeGroup = groups.find((group) => group.items.some((n) => n.key === active));
  const activeGroupKey = activeGroup?.key;
  const family = ctx?.role === 'GUARDIAN';
  // All role shells use one shared theme: family keeps its own approved accent
  // palette, while staff semantic surfaces follow the same light/dark preference.
  // Role, permission, route and tenant membership are unchanged.
  const navSurface = family ? 'border-fam-border bg-fam-surface text-fam-ink' : 'border-border-light bg-surface-white text-brand-ink';
  const navMuted = family ? 'text-fam-muted' : 'text-brand-inkMuted';
  const contextId = ctx?.type === 'center' ? ctx.centerId : 'platform';

  // Never persist a menu or drawer state across a role/tenant context switch.
  useEffect(() => { setMoreOpen(false); setNavQuery(''); setExpandedGroups({}); }, [ctx?.role, contextId]);
  useEffect(() => {
    if (activeGroupKey) setExpandedGroups(previous => previous[activeGroupKey] ? previous : { ...previous, [activeGroupKey]: true });
  }, [activeGroupKey]);
  useEffect(() => {
    if (moreOpen) moreCloseRef.current?.focus();
  }, [moreOpen]);

  // A mobile More dialog must not remain logically open after it is hidden at
  // the desktop breakpoint. Lock background scrolling only for its lifetime;
  // restore preexisting styles even after navigation/unmount.
  useEffect(() => {
    if (!moreOpen) return;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (!desktop.matches) return;
      setMoreOpen(false);
      document.querySelector<HTMLElement>('[data-testid="sidebar-collapse-toggle"]')?.focus();
    };
    desktop.addEventListener('change', closeOnDesktop);
    closeOnDesktop();
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  }, [moreOpen]);

  function closeMore() {
    setNavQuery('');
    setMoreOpen(false);
    moreButtonRef.current?.focus();
  }

  function handleMoreKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMore();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = [...(morePanelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])') ?? [])]
      .filter((el) => el.getClientRects().length > 0);
    if (!focusables.length) { event.preventDefault(); return; }
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

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
    <div className={`flex min-h-screen ${family ? 'theme-family-auto bg-fam-canvas text-fam-ink' : 'theme-clinical-auto bg-canvas-clinical text-brand-ink'}`} data-testid="product-shell" data-theme={theme}>
      <a href="#main" data-testid="skip-to-main"
        className="sr-only focus:not-sr-only fixed focus:fixed left-3 top-3 z-[100] rounded-control bg-brand-action px-4 py-3 text-sm font-semibold text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
        Skip to main content
      </a>
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] md:flex ${navSurface} ${railCollapsed ? 'w-[76px]' : 'w-sidebar'}`} data-testid="product-sidebar" data-collapsed={railCollapsed}>
        <SignatureBand />
        <div className={`flex h-16 items-center ${railCollapsed ? 'justify-center px-2' : 'gap-2 px-5'}`}>
          <span data-testid="shell-logo-chip" className="inline-flex items-center gap-2">
            <BrandMark variant="symbol" height={26} />
            {!railCollapsed && <BrandMark variant="wordmark" height={17} />}
          </span>
        </div>
        <button type="button" onClick={() => setRailCollapsed(value => !value)} data-testid="sidebar-collapse-toggle"
          aria-label={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!railCollapsed}
          className={`mx-2 mb-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control border px-2 text-[12px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action ${family ? 'border-fam-border text-fam-muted hover:bg-fam-tile' : 'border-border-light text-brand-inkMuted'}`}>
          {railCollapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          {!railCollapsed && 'Collapse menu'}
        </button>
        {session.contexts.length > 1 && railCollapsed && (
          <Link href="/select-context" data-testid="collapsed-workspace-switcher" aria-label="Switch workspace"
            title="Switch workspace" className="mx-2 mb-3 flex min-h-[44px] items-center justify-center rounded-control border border-border-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action">
            <ArrowLeftRight size={18} aria-hidden="true" />
          </Link>
        )}
        {session.contexts.length > 1 && !railCollapsed && (
          <Link href="/select-context" className="mx-3 mb-3 flex items-center gap-2 rounded-control border border-border-light px-3 py-2 transition-colors hover:bg-surface-subtle" data-testid="workspace-switcher">
            <span className="min-w-0 flex-1">
              <span className="block break-words text-[13px] font-semibold">{ctx ? contextLabel(ctx) : 'Choose workspace'}</span>
              <span className="block text-[12px] text-brand-inkMuted">{ctx ? ROLE_LABELS[ctx.role] : `${session.contexts.length} available`}</span>
            </span>
            <ArrowLeftRight size={15} className="text-brand-inkMuted" aria-hidden="true" />
          </Link>
        )}
        {!railCollapsed && <div className="px-3 pb-2">
          <label htmlFor="desktop-destination-search" className="sr-only">Find a destination</label>
          <input id="desktop-destination-search" type="search" autoComplete="off" value={navQuery}
            onChange={event => setNavQuery(event.target.value)} data-testid="desktop-destination-search" placeholder="Find a destination"
            className={`min-h-[44px] w-full rounded-control border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action ${family ? 'border-fam-border bg-fam-surface text-fam-ink placeholder:text-fam-muted' : 'border-border-strong bg-surface-white text-brand-ink'}`} />
        </div>}
        <nav aria-label="Primary" className={`flex-1 space-y-1 overflow-y-auto ${railCollapsed ? 'px-2' : 'px-3'}`} data-testid="desktop-grouped-navigation">
          {railCollapsed ? nav.map((n) => (
            <NavLink key={n.key + ':' + (n.permission ?? '')} href={n.href} icon={n.icon} label={n.label}
              active={active === n.key} family={family} compact testId={`nav-${n.key}`} />
          )) : visibleGroups.map((group) => (
            <details key={contextId + ':' + (ctx?.role ?? '') + ':' + group.key}
              open={searchTerm ? true : (expandedGroups[group.key] ?? (group.key === 'workspace' || group.items.some(n => n.key === active)))}
              onToggle={(event) => {
                const expanded = event.currentTarget.open;
                setExpandedGroups(previous => previous[group.key] === expanded ? previous : { ...previous, [group.key]: expanded });
              }}
              data-testid={`nav-group-${group.key}`} className="group rounded-control">
              <summary className={`flex min-h-[44px] cursor-pointer list-none items-center justify-between rounded-control px-3 text-[12px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action ${family ? 'text-fam-muted hover:bg-fam-tile' : 'text-brand-inkMuted hover:bg-surface-subtle'}`}>
                <span>{group.label}</span>
                <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="space-y-1 pb-2">
                {group.items.map((n) => <NavLink key={n.key + ':' + (n.permission ?? '')}
                  href={n.href} icon={n.icon} label={n.label} active={active === n.key}
                  family={family} testId={`nav-${n.key}`} />)}
              </div>
            </details>
          ))}
          {visibleGroups.length === 0 && !railCollapsed && <p role="status" className={`px-3 py-3 text-sm ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>No authorized destinations match your search.</p>}
          {planned.length > 0 && !railCollapsed && <p className={`px-3 pb-1 pt-5 text-[12px] font-semibold uppercase tracking-[0.06em] ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>Coming next</p>}
          {!railCollapsed && planned.map((m) => (
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
        <header className={`sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-3 border-b px-4 py-2 md:px-8 ${navSurface}`} data-testid="product-top-bar">
          <span data-testid="shell-logo-chip" className="md:hidden"><BrandMark variant="symbol" height={24} /></span>
          <p className={`min-w-0 flex-1 break-words text-[14px] ${navMuted}`} data-testid="active-context-label">{where}</p>
          <span className="hidden items-center gap-2 lg:flex"><Avatar name={session.user.displayName} size={32} /><span className="text-[14px] font-medium">{session.user.displayName}</span></span>
          <button type="button" onClick={toggleTheme} data-testid="app-theme-toggle"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={theme === 'dark'} title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${family ? 'border-fam-border text-fam-ink hover:bg-fam-tile' : 'border-border-light text-brand-ink hover:bg-surface-subtle'}`}>
            {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => void signOut()} disabled={signingOut} data-testid="sign-out-button"
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-control border px-3 text-[14px] font-medium transition-colors ${family ? 'border-fam-border hover:bg-fam-tile' : 'border-border-light hover:bg-surface-subtle'}`}>
            <LogOut size={16} aria-hidden="true" /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </header>
        {signOutError && <p role="alert" className="bg-status-dangerSurface px-4 py-2 text-[14px] font-medium text-status-danger md:px-8" data-testid="sign-out-error">{signOutError}</p>}
        <nav aria-label="Breadcrumb" data-testid="shell-breadcrumb" className={`flex min-h-[36px] items-center gap-2 px-4 pt-2 text-[12px] md:px-8 ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>
          {activeNav?.key !== 'home' && <><Link href="/app" className="underline-offset-2 hover:underline">Home</Link><ChevronRight size={13} aria-hidden="true" /></>}
          {activeNav?.key !== 'home' && activeGroup && <><span>{activeGroup.label}</span><ChevronRight size={13} aria-hidden="true" /></>}
          <span aria-current="page" className={`font-semibold ${family ? 'text-fam-ink' : 'text-brand-ink'}`}>{activeNav?.label ?? 'Workspace'}</span>
        </nav>
        <nav aria-label="Primary" className={`border-b px-4 py-3 md:hidden ${navSurface}`} data-testid="mobile-nav">
          <label htmlFor="mobile-workspace-navigation" className={`mb-1 block text-[12px] font-semibold ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>Navigate to</label>
          <select id="mobile-workspace-navigation" data-testid="mobile-nav-select"
            value={nav.find(n => n.key === active)?.href ?? '/app'}
            onChange={e => router.push(e.target.value)}
            className={`min-h-[44px] w-full rounded-control border border-border-strong px-3 text-[14px] font-semibold focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus:ring-[3px] ${family ? 'bg-fam-accentTint text-fam-accent focus:border-fam-accent focus:ring-fam-accent/20' : 'bg-brand-actionTint text-brand-action focus:border-brand-action focus:ring-brand-action/20'}`}>
            {nav.map(n => <option key={n.href + ':' + (n.permission ?? '')} value={n.href}>{n.label}</option>)}
            {session.contexts.length > 1 && <option value="/select-context">Switch workspace</option>}
          </select>
        </nav>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1160px] flex-1 px-4 pb-32 pt-6 md:px-8 md:pb-14 md:pt-8">{children}</main>
        <nav aria-label="Quick navigation" data-testid="mobile-bottom-nav"
          className={`fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-4px_18px_rgba(20,33,61,0.08)] md:hidden ${navSurface}`}>
          {mobileQuick.map(n => <Link key={n.key + ':' + (n.permission ?? '')} href={n.href}
            data-testid={`mobile-quick-${n.key}`} aria-current={active === n.key ? 'page' : undefined}
            className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-control px-1 text-center text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action ${active === n.key ? (family ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action') : (family ? 'text-fam-muted' : 'text-brand-inkMuted')}`}>
            <n.icon size={20} aria-hidden="true" /><span className="max-w-full truncate">{n.short}</span>
          </Link>)}
          <button type="button" ref={moreButtonRef} data-testid="mobile-more-button"
            aria-haspopup="dialog" aria-expanded={moreOpen} aria-controls="mobile-more-panel"
            onClick={() => setMoreOpen(true)} className={`flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-control px-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>
            <Menu size={20} aria-hidden="true" /><span>More</span>
          </button>
        </nav>
        {moreOpen && <div className="fixed inset-0 z-50 md:hidden" data-testid="mobile-more-sheet">
          <button type="button" aria-label="Dismiss navigation" onClick={closeMore} className="absolute inset-0 bg-black/50 touch-none" />
          <div role="dialog" aria-modal="true" aria-label="All navigation" id="mobile-more-panel"
            ref={morePanelRef} onKeyDown={handleMoreKeyDown}
            className={`absolute inset-x-0 bottom-0 max-h-[84dvh] overflow-y-auto overscroll-y-contain rounded-t-2xl px-4 pb-[max(env(safe-area-inset-bottom),24px)] pt-4 shadow-xl ${navSurface}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className={`text-[17px] font-semibold ${family ? 'text-fam-ink' : 'text-brand-ink'}`}>All destinations</h2>
              <button type="button" ref={moreCloseRef} onClick={closeMore} aria-label="Close navigation"
                data-testid="mobile-more-close" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control border border-border-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <label htmlFor="mobile-destination-search" className="sr-only">Find a destination</label>
            <input id="mobile-destination-search" type="search" autoComplete="off" value={navQuery}
              onChange={event => setNavQuery(event.target.value)} data-testid="mobile-destination-search"
              placeholder="Find a destination" className={`mb-3 min-h-[44px] w-full rounded-control border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action ${family ? 'border-fam-border bg-fam-surface text-fam-ink placeholder:text-fam-muted' : 'border-border-strong bg-surface-white text-brand-ink'}`} />
            {visibleGroups.length === 0 && <p role="status" className={`mb-3 text-sm ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>No authorized destinations match your search.</p>}
            {visibleGroups.map(group => <section key={group.key} className="mb-4" data-testid={`mobile-group-${group.key}`}>
              <h3 className={`mb-1 px-2 text-[12px] font-semibold uppercase tracking-wide ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{group.label}</h3>
              <div className="space-y-1">{group.items.map(n => <Link
                key={n.key + ':' + (n.permission ?? '')} href={n.href}
                onClick={() => { setNavQuery(''); setMoreOpen(false); }} data-testid={`mobile-more-${n.key}`}
                aria-current={active === n.key ? 'page' : undefined}
                className={`flex min-h-[44px] items-center gap-3 rounded-control px-3 text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-action ${active === n.key ? (family ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action') : (family ? 'text-fam-ink' : 'text-brand-ink')}`}>
                <n.icon size={18} aria-hidden="true" />{n.label}
              </Link>)}</div>
            </section>)}
            {session.contexts.length > 1 && <Link href="/select-context" onClick={() => setMoreOpen(false)}
              className="mt-2 flex min-h-[44px] items-center gap-2 rounded-control border border-border-light px-3 text-[14px] font-medium">
              <ArrowLeftRight size={18} aria-hidden="true" />Switch workspace
            </Link>}
          </div>
        </div>}
      </div>
    </div>
  );
}
