'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Building2, Plus, Search } from 'lucide-react';
import { ErrorState, EmptyState, SkeletonRows } from '@/components/design/states';
import { Card, Pill, btn } from '@/components/design/ui';
import { formatDate } from '@/components/applications/StatusPill';
import { PageTitle, Workspace, useLoad } from '@/components/centers/kit';
import { centersApi, type CenterListItem } from '@/lib/centers';

const ADMIN_LOOK: Record<CenterListItem['adminStatus'], { tone: 'success' | 'info' | 'caution' | 'danger'; label: string }> = {
  ACTIVE: { tone: 'success', label: 'Administrator active' },
  INVITED: { tone: 'info', label: 'Administrator invited' },
  EXPIRED: { tone: 'caution', label: 'Invitation expired' },
  NONE: { tone: 'danger', label: 'No administrator' },
};

function CentersList({ onError }: { onError: (e: unknown) => void }) {
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const fetcher = useCallback(() => centersApi.list({ q: q || undefined }), [q]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const search = (e: FormEvent) => { e.preventDefault(); setQ(query.trim()); };
  return (
    <div className="space-y-5">
      <PageTitle title="Centers" body="Every tenant on TheraBridge. Create a center directly or from an approved application." testId="centers-title"
        action={<Link href="/app/centers/new" className={btn('primary')} data-testid="new-center-button"><Plus size={17} aria-hidden="true" /> New center</Link>} />
      <form onSubmit={search} role="search" className="flex max-w-md gap-2">
        <label htmlFor="center-search" className="sr-only">Search centers</label>
        <input id="center-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, address or city" maxLength={100} data-testid="centers-search-input"
          className="min-h-[44px] min-w-0 flex-1 rounded-control border border-border-strong bg-surface-white px-3 text-[14px] focus:border-brand-action focus:outline-none focus:ring-[3px] focus:ring-brand-action/20" />
        <button type="submit" aria-label="Search" data-testid="centers-search-button" className="grid min-h-[44px] w-11 place-items-center rounded-control bg-brand-action text-white hover:bg-brand-actionHover"><Search size={18} aria-hidden="true" /></button>
      </form>
      {failed && <ErrorState onRetry={() => void reload()} testId="centers-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={4} testId="centers-loading" /></Card>}
      {data && data.items.length === 0 && <EmptyState icon={Building2} title={q ? 'No centers match your search' : 'No centers yet'} body={q ? 'Try another name or city.' : 'Create the first center, or provision one from an approved application.'} testId="centers-empty" />}
      {data && data.items.length > 0 && (
        <Card className="overflow-hidden" testId="centers-list">
          <ul className="divide-y divide-border-light">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link href={`/app/centers/${c.id}`} data-testid={`center-row-${c.slug}`}
                  className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-surface-subtle md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-6">
                  <span className="min-w-0">
                    <span className="block break-words text-[15px] font-semibold">{c.name}</span>
                    <span className="block break-words text-[13px] text-brand-inkMuted"><span className="font-mono">{c.slug}</span>{c.city ? ` · ${c.city}, ${c.country}` : ''}</span>
                  </span>
                  <span className="text-[13px] text-brand-inkMuted">
                    <span className="tnum block">{c.activeMembers} active members · setup {c.setup.done}/{c.setup.total}</span>
                    <span className="tnum block">Created {formatDate(c.createdAt)}{c.source === 'APPLICATION' ? ' · from application' : ''}</span>
                  </span>
                  <span className="justify-self-start md:justify-self-end"><Pill tone={ADMIN_LOOK[c.adminStatus].tone}>{ADMIN_LOOK[c.adminStatus].label}</Pill></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function CentersPage() {
  return <Workspace active="centers" permission="platform.centers.read" deniedText="Centers are managed by TheraBridge platform administrators only.">{(_, onError) => <CentersList onError={onError} />}</Workspace>;
}
