'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Tone } from './ui';

// Controlled by the caller: changing a child or tenant must replace the visible tab
// content from the newly authorized projection, not preserve data from an old scope.
export type WorkspaceTab = { id: string; label: string; content: ReactNode; disabled?: boolean; testId?: string };
export function WorkspaceTabs({
  tabs, selected, onSelect, label, tone = 'clinical',
}: {
  tabs: WorkspaceTab[]; selected: string; onSelect: (id: string) => void;
  label: string; tone?: Tone;
}) {
  const uid = useId();
  const available = tabs.filter((t) => !t.disabled);
  const active = available.find((t) => t.id === selected);
  const family = tone === 'family';
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const index = available.findIndex((t) => t.id === id);
    if (index < 0) return;
    const direction = typeof document !== 'undefined' && document.documentElement?.dir === 'rtl' ? -1 : 1;
    const next = event.key === 'ArrowRight' ? (index + direction + available.length) % available.length
      : event.key === 'ArrowLeft' ? (index - direction + available.length) % available.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? available.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    const target = available[next];
    onSelect(target.id);
    // The content changes synchronously after selection; move focus to the
    // selected tab using its stable, generated DOM ID.
    document.getElementById(`${uid}-tab-${target.id}`)?.focus();
  };
  return (
    <div className={family ? 'text-fam-ink' : 'text-brand-ink'}>
      <div role="tablist" aria-orientation="horizontal" aria-label={label}
        className={`flex max-w-full gap-1 overflow-x-auto border-b pb-1 [scrollbar-width:thin] ${family ? 'border-fam-border' : 'border-border-light'}`}>
        {tabs.map((tab) => (
          <button key={tab.id} id={`${uid}-tab-${tab.id}`} type="button" role="tab"
            aria-selected={active?.id === tab.id} aria-controls={active?.id === tab.id ? `${uid}-panel-${tab.id}` : undefined}
            disabled={tab.disabled} data-testid={tab.testId}
            tabIndex={active?.id === tab.id || (!active && available[0]?.id === tab.id) ? 0 : -1}
            onKeyDown={(event) => handleKey(event, tab.id)}
            onClick={() => !tab.disabled && onSelect(tab.id)}
            className={`min-h-11 shrink-0 rounded-t-control border-b-[3px] px-4 text-sm font-medium transition-colors
              ${active?.id === tab.id
                ? family ? 'border-fam-accent bg-fam-accentTint text-fam-ink' : 'border-brand-action bg-brand-actionTint text-brand-ink'
                : family ? 'border-transparent text-fam-muted hover:bg-fam-tile' : 'border-transparent text-brand-inkMuted hover:bg-surface-subtle'}
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action disabled:cursor-not-allowed disabled:opacity-50`}>
            {tab.label}
          </button>
        ))}
      </div>
      {active ? <div key={active.id} id={`${uid}-panel-${active.id}`} role="tabpanel"
        aria-labelledby={`${uid}-tab-${active.id}`} tabIndex={0} className="min-w-0 py-4">
        {active.content}
      </div> : <p role="status" className="py-4 text-sm">No accessible section is available.</p>}
    </div>
  );
}

export function DisclosureSection({
  title, children, summary, openByDefault = false, tone = 'clinical',
}: {
  title: string; children: ReactNode; summary?: ReactNode; openByDefault?: boolean; tone?: Tone;
}) {
  const family = tone === 'family';
  const [isOpen, setIsOpen] = useState(openByDefault);
  return (
    <details open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}
      className={`group rounded-card border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action ${family ? 'border-fam-border bg-fam-surface text-fam-ink' : 'border-border-light bg-surface-white text-brand-ink'}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{title}{summary && <span className={`mt-1 block text-xs font-normal ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{summary}</span>}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className={`border-t p-4 ${family ? 'border-fam-border' : 'border-border-light'}`}>{children}</div>
    </details>
  );
}

export type TaskStep = { id: string; label: string; status: 'complete' | 'current' | 'pending' | 'blocked'; description?: string };
export function TaskStepper({ steps, label = 'Task progress', tone = 'clinical' }: {
  steps: TaskStep[]; label?: string; tone?: Tone;
}) {
  const family = tone === 'family';
  return <ol aria-label={label} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    {steps.map((step, i) => (
      <li key={step.id} aria-current={step.status === 'current' ? 'step' : undefined}
        className={`min-w-0 rounded-control border p-3 ${family ? 'border-fam-border bg-fam-surface text-fam-ink' : 'border-border-light bg-surface-white text-brand-ink'}`}>
        <div className="flex items-start gap-2">
          <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold
            ${step.status === 'complete' ? 'bg-status-successSurface text-status-success'
              : step.status === 'blocked' ? 'bg-status-dangerSurface text-status-danger'
              : step.status === 'current' ? family ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action'
              : family ? 'bg-fam-tile text-fam-muted' : 'bg-surface-subtle text-brand-inkMuted'}`}>{i + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{step.label}</p>
            <p className={`text-xs ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{step.status === 'blocked' ? 'Blocked' : step.status === 'complete' ? 'Complete' : step.status === 'current' ? 'Current step' : 'Pending'}{step.description ? ` · ${step.description}` : ''}</p>
          </div>
        </div>
      </li>
    ))}
  </ol>;
}

// A dense, horizontally scrollable data region; callers supply authorized,
// escaped React content rather than raw markup or potentially stale cached rows.
export function CompactTable({ columns, rows, caption, tone = 'clinical', emptyMessage = 'No records available.', mobileCards = false }: {
  columns: { id: string; label: string }[]; rows: { id: string; cells: Record<string, ReactNode> }[];
  caption: string; tone?: Tone; emptyMessage?: string; mobileCards?: boolean;
}) {
  const family = tone === 'family';
  return <div role="region" aria-label={mobileCards ? caption : `${caption} (scroll horizontally for all columns)`} tabIndex={0} className={`max-w-full rounded-card border ${mobileCards ? '' : 'overflow-x-auto'} ${family ? 'border-fam-border bg-fam-surface text-fam-ink' : 'border-border-light bg-surface-white text-brand-ink'}`}>
    {mobileCards && <ul aria-label={`${caption}: compact view`} className="divide-y divide-border-light sm:hidden"
      data-testid="compact-mobile-cards">
      {rows.length ? rows.map(row => <li key={row.id} className="space-y-2 p-3">
        <dl className="space-y-2">{columns.map(col => <div key={col.id} className="min-w-0">
          <dt className={`text-xs font-semibold ${family ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{col.label}</dt>
          <dd className="break-words text-sm">{row.cells[col.id] ?? '—'}</dd>
        </div>)}</dl>
      </li>) : <li className="p-4 text-center text-sm">{emptyMessage}</li>}
    </ul>}
    <div tabIndex={mobileCards ? 0 : undefined} aria-label={mobileCards ? `${caption} (scroll horizontally)` : undefined} className={mobileCards ? 'hidden max-w-full overflow-x-auto sm:block' : ''}>
    <table className="w-full min-w-[480px] border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className={family ? 'bg-fam-tile' : 'bg-surface-subtle'}>
        <tr>{columns.map((col) => <th key={col.id} scope="col" className="px-3 py-2.5 font-semibold">{col.label}</th>)}</tr>
      </thead>
      <tbody>{rows.length ? rows.map((row) => <tr key={row.id} className={`border-t ${family ? 'border-fam-border' : 'border-border-light'}`}>
        {columns.map((col) => <td key={col.id} className="px-3 py-2.5 align-top">{row.cells[col.id] ?? '—'}</td>)}
      </tr>) : <tr><td colSpan={Math.max(1, columns.length)} className="px-3 py-6 text-center">{emptyMessage}</td></tr>}</tbody>
    </table>
    </div>
  </div>;
}
