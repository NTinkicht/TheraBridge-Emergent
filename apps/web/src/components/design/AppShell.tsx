'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, ChevronsUpDown, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, X } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { SignatureBand } from '@/components/brand/SignatureBand';
import { WORKSPACES, type NavItem, type WorkspaceKey } from '@/lib/design/nav';
import { usePreview } from './PreviewContext';
import { Avatar, LockedAction } from './ui';

type Theme = 'light' | 'dark';

function Logo({ collapsed, family }: { collapsed: boolean; family: boolean }) {
  // Raster logo is only valid on light surfaces; the family theme puts it on a chip that turns white in dark mode.
  return (
    <span className={`inline-flex items-center gap-2 ${family ? 'rounded-[10px] bg-fam-logoChip px-1.5 py-1' : ''}`}>
      <BrandMark variant="symbol" height={collapsed ? 24 : 26} />
      {!collapsed && <BrandMark variant="wordmark" height={17} />}
    </span>
  );
}

function NavEntry({ item, active, collapsed, family, onUnavailable }: { item: NavItem; active: boolean; collapsed: boolean; family: boolean; onUnavailable: (l: string) => void }) {
  const on = family ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action';
  const off = family ? 'text-fam-muted hover:bg-fam-tile hover:text-fam-ink' : 'text-brand-inkMuted hover:bg-surface-subtle hover:text-brand-ink';
  const cls = `relative flex min-h-[44px] w-full items-center gap-3 rounded-control px-3 text-[14px] font-medium transition-colors ${active ? on : off} ${collapsed ? 'justify-center px-0' : ''}`;
  const Icon = item.icon;
  const inner = (
    <>
      {active && <span aria-hidden="true" className={`absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full ${family ? 'bg-fam-accent' : 'bg-brand-action'}`} />}
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
    </>
  );
  if (item.href) return <Link href={item.href} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined} className={cls} data-testid={`nav-${item.key}`}>{inner}</Link>;
  return <button type="button" onClick={() => onUnavailable(item.label)} title={collapsed ? item.label : undefined} className={cls} data-testid={`nav-${item.key}`}>{inner}</button>;
}

export function AppShell({ workspace, active, title, children }: { workspace: WorkspaceKey; active: string; title: string; children: ReactNode }) {
  const ws = WORKSPACES[workspace];
  const family = ws.tone === 'family';
  const { notify } = usePreview();
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState<'bell' | 'account' | 'more' | null>(null);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (menu !== 'more') return;
    const el = sheet.current;
    if (!el) return;
    const focusables = () => [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
    focusables()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1]?.focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0]?.focus(); }
    };
    el.addEventListener('keydown', trap);
    const opener = moreBtn.current;
    return () => { el.removeEventListener('keydown', trap); opener?.focus(); };
  }, [menu]);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setCollapsed(window.innerWidth < 1280);
    if (!family) return;
    setTheme(document.documentElement.dataset.familyTheme === 'dark' ? 'dark' : 'light');
  }, [family]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.familyTheme = next;
    localStorage.setItem('tb-family-theme', next);
  };
  const unavailable = (label: string) => { setMenu(null); notify(`“${label}” is outside this design preview.`); };
  const dark = family && theme === 'dark';
  const surface = family ? 'bg-fam-surface border-fam-border' : 'bg-surface-white border-border-light';
  const muted = family ? 'text-fam-muted' : 'text-brand-inkMuted';
  const iconBtn = `grid h-11 w-11 place-items-center rounded-control transition-colors ${family ? 'hover:bg-fam-tile' : 'hover:bg-surface-subtle'}`;
  const mobileItems = ws.items.filter((i) => ws.mobile.includes(i.key));
  const moreItems = ws.items.filter((i) => !ws.mobile.includes(i.key));

  return (
    <div className={`flex min-h-screen ${family ? 'theme-family-auto bg-fam-canvas text-fam-ink' : 'bg-canvas-clinical text-brand-ink'}`} data-testid={`shell-${workspace}`} data-theme={family ? theme : undefined}>
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 md:flex ${surface} ${collapsed ? 'w-[76px]' : 'w-sidebar'}`} data-testid="sidebar">
        <SignatureBand />
        <div className={`flex h-16 items-center ${collapsed ? 'justify-center' : 'px-5'}`}><Logo collapsed={collapsed} family={family} /></div>
        {!collapsed && (
          <button type="button" onClick={() => notify('Switching center or role arrives with sign-in (TB-EM-001).')} data-testid="workspace-switcher"
            className={`mx-3 mb-3 flex items-center gap-2 rounded-control border px-3 py-2 text-left transition-colors ${family ? 'border-fam-border hover:bg-fam-tile' : 'border-border-light hover:bg-surface-subtle'}`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{ws.context}</span>
              <span className={`block truncate text-[12px] ${muted}`}>{ws.role}</span>
            </span>
            <ChevronsUpDown size={15} className={muted} aria-hidden="true" />
          </button>
        )}
        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3">
          {ws.items.map((i) => <NavEntry key={i.key} item={i} active={i.key === active} collapsed={collapsed} family={family} onUnavailable={unavailable} />)}
        </nav>
        <div className={`border-t p-3 ${family ? 'border-fam-border' : 'border-border-light'}`}>
          <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} data-testid="sidebar-toggle"
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-control px-3 text-[13px] ${muted} ${family ? 'hover:bg-fam-tile' : 'hover:bg-surface-subtle'} ${collapsed ? 'justify-center px-0' : ''}`}>
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <><PanelLeftClose size={18} aria-hidden="true" /> Collapse</>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 md:px-8 ${surface}`} data-testid="top-bar">
          <span className="md:hidden"><Logo collapsed family={family} /></span>
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold md:hidden">{title}</p>
          <p className={`hidden min-w-0 flex-1 truncate text-[14px] md:block ${muted}`}>{ws.context} · {ws.role}</p>
          {family && (
            <button type="button" onClick={toggleTheme} className={iconBtn} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark} data-testid="theme-toggle">
              <Sun size={19} aria-hidden="true" className="hidden [html[data-family-theme=dark]_&]:block" />
              <Moon size={19} aria-hidden="true" className="[html[data-family-theme=dark]_&]:hidden" />
            </button>
          )}
          <div className="relative">
            <button type="button" onClick={() => setMenu(menu === 'bell' ? null : 'bell')} className={iconBtn} aria-label="Notifications" aria-expanded={menu === 'bell'} data-testid="notifications-button">
              <Bell size={19} aria-hidden="true" />
            </button>
            {menu === 'bell' && (
              <div className={`tb-rise fixed inset-x-4 top-[72px] z-30 rounded-card border p-4 shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-12 md:w-72 ${surface}`} data-testid="notifications-panel">
                <p className="text-[14px] font-semibold">Notifications</p>
                <p className={`mt-2 text-[13px] ${muted}`}>You’re all caught up. The notification center arrives in Phase 3.</p>
              </div>
            )}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setMenu(menu === 'account' ? null : 'account')} className="flex items-center gap-2 rounded-full p-1 pr-1 md:pr-3" aria-label="Account menu" aria-expanded={menu === 'account'} data-testid="account-button">
              <Avatar name={ws.user} size={34} />
              <span className="hidden text-[14px] font-medium lg:inline">{ws.user}</span>
            </button>
            {menu === 'account' && (
              <div className={`tb-rise fixed inset-x-4 top-[72px] z-30 rounded-card border p-4 shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-12 md:w-72 ${surface}`} data-testid="account-panel">
                <p className="text-[14px] font-semibold">{ws.user}</p>
                <p className={`text-[13px] ${muted}`}>{ws.role} · fictional account</p>
                <div className="mt-3"><LockedAction id="sign-out-locked" label="Sign out" reason="Sessions and sign-in arrive in TB-EM-001." tone={ws.tone} size="sm" /></div>
              </div>
            )}
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-14 md:pt-8">{children}</main>
      </div>

      <nav aria-label="Primary" className={`fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t px-1 pb-[env(safe-area-inset-bottom)] md:hidden ${surface}`} data-testid="bottom-nav">
        {[...mobileItems, { key: 'more', label: 'More', icon: Menu } as NavItem].map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;
          const content = (
            <>
              <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${isActive ? (family ? 'bg-fam-accentTint' : 'bg-brand-actionTint') : ''}`}><Icon size={19} aria-hidden="true" /></span>
              <span className="max-w-full truncate">{item.label === 'Center applications' ? 'Applications' : item.label === 'Operational events' ? 'Events' : item.label}</span>
            </>
          );
          const cls = `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? (family ? 'text-fam-accent' : 'text-brand-action') : muted}`;
          if (item.key === 'more') return <button key="more" ref={moreBtn} type="button" onClick={() => setMenu('more')} className={cls} aria-expanded={menu === 'more'} data-testid="bottom-nav-more">{content}</button>;
          if (item.href) return <Link key={item.key} href={item.href} aria-current={isActive ? 'page' : undefined} className={cls} data-testid={`bottom-nav-${item.key}`}>{content}</Link>;
          return <button key={item.key} type="button" onClick={() => unavailable(item.label)} className={cls} data-testid={`bottom-nav-${item.key}`}>{content}</button>;
        })}
      </nav>

      {menu === 'more' && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="More navigation" data-testid="more-sheet">
          <button type="button" className="absolute inset-0 bg-[#0D1226]/50" aria-label="Close menu" onClick={() => setMenu(null)} />
          <div ref={sheet} className={`tb-rise absolute inset-x-0 bottom-0 rounded-t-[22px] border-t p-4 pb-8 ${surface}`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[15px] font-semibold">More</p>
              <button type="button" onClick={() => setMenu(null)} className={iconBtn} aria-label="Close" data-testid="more-sheet-close"><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="space-y-1">{moreItems.map((i) => <NavEntry key={i.key} item={i} active={i.key === active} collapsed={false} family={family} onUnavailable={unavailable} />)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
