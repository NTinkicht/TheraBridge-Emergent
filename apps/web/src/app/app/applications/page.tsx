'use client';
import { navigateTabs } from '@/lib/a11y-tabs';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Inbox, Search } from 'lucide-react';
import { ProductShell } from '@/components/auth/ProductShell';
import { FormAlert } from '@/components/auth/Field';
import { useSession } from '@/components/auth/useSession';
import { StatusPill, formatDate } from '@/components/applications/StatusPill';
import { Card } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { authApi, type ApplicationList } from '@/lib/auth';

const TABS = [
  { key: 'OPEN', label: 'Needs decision' },
  { key: 'SUBMITTED', label: 'Pending' },
  { key: 'UNDER_REVIEW', label: 'Under review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: '', label: 'All' },
] as const;

function countFor(key: string, c: ApplicationList['counts']) {
  const n = (k: keyof ApplicationList['counts']) => c[k] ?? 0;
  if (key === 'OPEN') return n('SUBMITTED') + n('UNDER_REVIEW');
  if (key === '') return n('SUBMITTED') + n('UNDER_REVIEW') + n('APPROVED') + n('REJECTED');
  return n(key as keyof ApplicationList['counts']);
}

function ApplicationsList({ onError }: { onError: (e: unknown) => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApplicationList | null>(null);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    setStatus(s !== null && TABS.some((t) => t.key === s) ? s : 'OPEN');
  }, []);

  // Only the most recent request may update the list, so fast tab or search changes never show stale rows.
  const load = useCallback(async () => {
    if (status === null) return;
    const id = ++latest.current;
    setData(null);
    setFailed(false);
    try {
      const result = await authApi.listApplications({ status: status || undefined, q: q || undefined, page });
      if (id === latest.current) setData(result);
    } catch (e) {
      if (id !== latest.current) return;
      try {
        onError(e);
      } catch {
        setFailed(true);
      }
    }
  }, [status, q, page, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const search = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(query.trim());
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-5">
      <div className="tb-rise">
        <h1 className="font-display text-[28px] font-bold leading-tight md:text-[32px]" data-testid="applications-title">Center applications</h1>
        <p className="mt-1 text-[15px] text-brand-inkMuted">Review each application and record a decision. Approval does not create the center yet.</p>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" onKeyDown={navigateTabs} aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-control bg-surface-white p-1 shadow-sm" data-testid="applications-tabs">
          {TABS.map((t) => (
            <button key={t.key || 'all'} role="tab" aria-selected={status === t.key} tabIndex={status === t.key ? 0 : -1} id={`applications-tab-${t.key || "all"}`} onClick={() => { setStatus(t.key); setPage(1); }} data-testid={`applications-tab-${t.key || 'all'}`}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-[8px] px-3 text-[14px] font-medium transition-colors ${status === t.key ? 'bg-brand-action text-white' : 'text-brand-inkMuted hover:bg-surface-subtle'}`}>
              {t.label}
              {data && <span className={`tnum rounded-full px-1.5 text-[12px] ${status === t.key ? 'bg-white/20' : 'bg-surface-subtle'}`}>{countFor(t.key, data.counts)}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={search} role="search" className="flex min-w-0 gap-2 lg:w-[340px]">
          <label htmlFor="app-search" className="sr-only">Search applications</label>
          <input id="app-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Center, email or reference" maxLength={100} data-testid="applications-search-input"
            className="min-h-[44px] min-w-0 flex-1 rounded-control border border-border-strong bg-surface-white px-3 text-[14px] focus:border-brand-action focus:outline-none focus:ring-[3px] focus:ring-brand-action/20" />
          <button type="submit" aria-label="Search" data-testid="applications-search-button" className="grid min-h-[44px] w-11 place-items-center rounded-control bg-brand-action text-white hover:bg-brand-actionHover"><Search size={18} aria-hidden="true" /></button>
        </form>
      </div>

      {failed && <ErrorState onRetry={() => void load()} testId="applications-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={4} testId="applications-loading" /></Card>}
      {data && data.items.length === 0 && (
        <EmptyState icon={Inbox} title={q ? 'No applications match your search' : 'No applications here'} body={q ? 'Try another name, email or reference.' : 'New applications will appear here as soon as centers apply.'} testId="applications-empty" />
      )}
      {data && data.items.length > 0 && (
        <Card className="overflow-hidden" testId="applications-list">
          <ul className="divide-y divide-border-light">
            {data.items.map((a) => (
              <li key={a.id}>
                <Link href={`/app/applications/${a.id}`} data-testid={`application-row-${a.reference}`}
                  className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-surface-subtle md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto] md:items-center md:gap-6">
                  <span className="min-w-0">
                    <span className="block break-words text-[15px] font-semibold">{a.organizationName}</span>
                    <span className="block text-[13px] text-brand-inkMuted"><span className="tnum font-mono">{a.reference}</span> · {a.city}, {a.country}</span>
                  </span>
                  <span className="min-w-0 text-[13px] text-brand-inkMuted">
                    <span className="block break-words">{a.contactName}</span>
                    <span className="tnum block">Submitted {formatDate(a.submittedAt)}</span>
                  </span>
                  <span className="justify-self-start md:justify-self-end"><StatusPill status={a.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-border-light px-5 py-3 text-[14px]">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex min-h-[40px] items-center gap-1 rounded-control px-2 disabled:opacity-40" data-testid="applications-prev"><ChevronLeft size={16} aria-hidden="true" /> Previous</button>
              <span className="tnum text-brand-inkMuted">Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="inline-flex min-h-[40px] items-center gap-1 rounded-control px-2 disabled:opacity-40" data-testid="applications-next">Next <ChevronRight size={16} aria-hidden="true" /></button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  const { state, handle } = useSession();
  if (state.status === 'loading') return <div className="p-8"><SkeletonRows rows={4} testId="session-loading" /></div>;
  if (state.status === 'error') return <div className="p-8"><FormAlert tone="danger" testId="session-error">{state.message}</FormAlert></div>;
  if (!state.data.permissions.includes('platform.applications.read')) {
    return <ProductShell session={state.data} active="applications" planned={[]}><FormAlert tone="danger" testId="applications-forbidden">Center applications are available to platform administrators only.</FormAlert></ProductShell>;
  }
  return (
    <ProductShell session={state.data} active="applications" planned={[]}>
      <ApplicationsList onError={handle} />
    </ProductShell>
  );
}
