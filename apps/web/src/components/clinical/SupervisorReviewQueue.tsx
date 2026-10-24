'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { Field } from '@/components/auth/Field';
import { useLoad } from '@/components/centers/kit';
import { serviceLabel } from '@/components/operations/BookDialog';
import { Card, Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { reportsApi } from '@/lib/reports';

// Match the activity library's diacritic- and locale-independent search.
const fold = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Displayed only to a clinical supervisor. API independently requires
// center.clinical.review AND validates role and center; no write controls.
export function SupervisorReviewQueue({ centerId, childId, service, onError }: {
  centerId: string; childId: string; service: string; onError: (e: unknown) => void;
}) {
  const fetcher = useCallback(() => reportsApi.reviewQueue(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [search, setSearch] = useState('');
  const matches = useMemo(() => (data?.items ?? []).filter((item) => {
    if (childId && item.childId !== childId) return false;
    if (service && item.service !== service) return false;
    const q = fold(search.trim());
    return !q || [item.title, item.childName, item.author, serviceLabel(item.service)]
      .some((part) => fold(part).includes(q));
  }), [data, childId, service, search]);
  return (
    <Card className="space-y-4 p-5" testId="supervisor-review-queue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold">Reports awaiting review</h2>
          <p className="mt-1 text-[13px] text-brand-inkMuted">Supervisor-only draft review queue. These reports are not approved, signed or released. Child and service filters above apply; chart dates do not.</p>
        </div>
        {data && <Pill tone={data.total ? 'caution' : 'neutral'}>{data.total} awaiting review across centre</Pill>}
      </div>
      <Field label="Search reports" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Report, child, therapist or specialty" testId="review-queue-search" />
      {failed && <ErrorState onRetry={() => void reload()} testId="review-queue-error" />}
      {!failed && !data && <SkeletonRows rows={2} testId="review-queue-loading" />}
      {data && !matches.length && <EmptyState icon={ClipboardCheck} title={data.total > data.items.length ? 'No matches among the most recent reports' : data.total ? 'No reports match these filters' : 'No reports waiting for review'}
        body={data.total > data.items.length ? 'Older pending reports may fall outside the most recent 100. Check the child workspace for older drafts.' : data.total ? 'Try another child, service or search term.' : 'Reports appear when a therapist submits a draft for internal review.'}
        testId="review-queue-empty" />}
      {data && matches.length > 0 && <div className="space-y-2" data-testid="review-queue-list">
        {matches.map((r) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-light p-3" data-testid={`review-queue-row-${r.id}`}>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[14px] font-semibold">{r.title}</p>
            <p className="text-[13px] text-brand-inkMuted">{r.childName} · {serviceLabel(r.service)} · {r.author}</p>
            <p className="text-[12px] text-brand-inkMuted">{r.periodStart} to {r.periodEnd}</p>
          </div>
          <Link href={`/app/reports/${r.id}`} className="inline-flex min-h-[44px] items-center rounded-control px-3 text-[14px] font-semibold text-brand-action hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" data-testid={`review-queue-open-${r.id}`} aria-label={`Open draft: ${r.title} for ${r.childName}`}>Open draft</Link>
        </div>)}
      </div>}
      {data && data.total > data.items.length && <p className="text-[12px] text-brand-inkMuted" data-testid="review-queue-limited">Showing the most recently updated {data.items.length} of {data.total} reviews. Refine your workflow in each child workspace for older reports.</p>}
    </Card>
  );
}
