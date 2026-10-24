'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react';
import { Field } from '@/components/auth/Field';
import { useLoad } from '@/components/centers/kit';
import { serviceLabel } from '@/components/operations/BookDialog';
import { Button, Card, Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { reportsApi } from '@/lib/reports';

// Independent of chart dates. The API enforces supervisor and tenant access.
export function SupervisorReviewQueue({ centerId, childId, service, onError }: {
  centerId: string; childId: string; service: string; onError: (e: unknown) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setPage(1); }, [childId, service, debounced]);
  const fetcher = useCallback(
    () => reportsApi.reviewQueue(centerId, {
      childId: childId || undefined, service: service || undefined,
      search: debounced || undefined, page,
    }),
    [centerId, childId, service, debounced, page],
  );
  const { data, failed, reload } = useLoad(fetcher, onError);
  const items = data?.items ?? [];
  return (
    <Card className="space-y-4 p-5" testId="supervisor-review-queue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold">Reports awaiting review</h2>
          <p className="mt-1 text-[13px] text-brand-inkMuted">
            Internal supervisor review only. These reports are not approved, signed or released.
            Child and specialty filters apply; chart dates do not.
          </p>
        </div>
        {data && <Pill tone={data.total ? 'caution' : 'neutral'}>
          {data.total} awaiting review across centre
        </Pill>}
      </div>
      <Field label="Search reports" value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Report, child, therapist or specialty" testId="review-queue-search" />
      {failed && <ErrorState onRetry={() => void reload()} testId="review-queue-error" />}
      {!failed && !data && <SkeletonRows rows={2} testId="review-queue-loading" />}
      {data && !items.length && <EmptyState icon={ClipboardCheck}
        title={data.filteredTotal ? 'No reports on this page' : data.total ? 'No reports match these filters' : 'No reports waiting for review'}
        body={data.filteredTotal ? 'Return to the first page.' : data.total ? 'Try another child, service or search term.' : 'Reports appear after a therapist submits a draft for review.'}
        testId="review-queue-empty" />}
      {data && items.length > 0 && <div className="space-y-2" data-testid="review-queue-list">
        {items.map((r) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-light p-3" data-testid={`review-queue-row-${r.id}`}>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[14px] font-semibold">{r.title}</p>
            <p className="text-[13px] text-brand-inkMuted">{r.childName} · {serviceLabel(r.service)} · {r.author}</p>
            <p className="text-[12px] text-brand-inkMuted">{r.periodStart} to {r.periodEnd}</p>
          </div>
          <Link href={`/app/reports/${r.id}`} className="inline-flex min-h-[44px] items-center rounded-control px-3 text-[14px] font-semibold text-brand-action hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" data-testid={`review-queue-open-${r.id}`} aria-label={`Open draft: ${r.title} for ${r.childName}`}>Open draft</Link>
        </div>)}
      </div>}
      {data && <div className="flex flex-wrap items-center justify-between gap-2" data-testid="review-queue-pagination">
        <p className="text-[13px] text-brand-inkMuted" aria-live="polite" data-testid="review-queue-count">
          {data.filteredTotal} matching across centre · Page {data.page} · {items.length} shown
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" data-testid="review-queue-prev" disabled={page <= 1 || page !== data.page} onClick={() => {
              if (page === data.page) setPage(page - 1);
            }}>
            <ChevronLeft size={15} aria-hidden="true" /> Previous
          </Button>
          <Button variant="secondary" data-testid="review-queue-next" disabled={!data.hasMore || page !== data.page} onClick={() => {
              if (page === data.page && data.hasMore) setPage(page + 1);
            }}>
            Next <ChevronRight size={15} aria-hidden="true" />
          </Button>
        </div>
      </div>}
    </Card>
  );
}
