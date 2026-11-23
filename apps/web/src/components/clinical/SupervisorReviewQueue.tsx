'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ClipboardCheck, Eye } from 'lucide-react';
import { Field } from '@/components/auth/Field';
import { useLoad } from '@/components/centers/kit';
import { serviceLabel } from '@/components/operations/BookDialog';
import { Button, Card, Pill } from '@/components/design/ui';
import { DisclosureSection, TaskStepper } from '@/components/design/workspace-patterns';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { reportsApi } from '@/lib/reports';

// A change of tenant, child or specialty must destroy the old queue's
// filters, selected page and API results immediately — not merely re-fetch.
// The API remains authoritative for every report and document permission.
export function SupervisorReviewQueue(props: {
  centerId: string; childId: string; service: string; onError: (e: unknown) => void;
}) {
  return <ScopedSupervisorReviewQueue key={JSON.stringify([props.centerId, props.childId, props.service])} {...props} />;
}
function ScopedSupervisorReviewQueue({ centerId, childId, service, onError }: {
  centerId: string; childId: string; service: string; onError: (e: unknown) => void;
}) {
  const mounted = useRef(true);
  const latestFetch = useRef(0);
  const [accessFailure, setAccessFailure] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  // A pending request from an unmounted scope must never dispatch its late
  // 401/403/404 into the shared session handler for the newly selected scope.
  const scopedOnError = useCallback((error: unknown) => {
    if (!mounted.current) return;
    // The app's session handler *handles* 401/403/404 by navigating away,
    // without throwing. useLoad therefore leaves failed=false for these
    // errors. Always revoke old visible queue data before navigation.
    setAccessFailure(true);
    onError(error);
  }, [onError]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => { setPage(1); }, [childId, service, debounced]);
  // useLoad deliberately retains its previous successful data while a request
  // is in flight. Bind results to their exact filters and page so neither the
  // former search nor a previous page can be displayed as the new worklist.
  const requestKey = JSON.stringify([centerId, childId, service, debounced, page]);
  const fetcher = useCallback(
    async () => {
      const generation = ++latestFetch.current;
      const result = await reportsApi.reviewQueue(centerId, {
        childId: childId || undefined, service: service || undefined,
        search: debounced || undefined, page,
      });
      // A late success for an obsolete query cannot reauthorize a denied
      // current page. No stale-response handler may change this boundary.
      if (mounted.current && generation === latestFetch.current) setAccessFailure(false);
      return { requestKey, result };
    },
    [centerId, childId, service, debounced, page, requestKey],
  );
  const { data: loaded, failed, reload } = useLoad(fetcher, scopedOnError);
  // useLoad intentionally keeps its last successful response for retry UX.
  // A failed refresh (including a withdrawn 401/403) must NOT keep its old
  // report links or author/child metadata visible beside the denial banner.
  // Same fail-closed pattern as the scoped Schedule workspace.
  const data = !failed && !accessFailure && loaded?.requestKey === requestKey ? loaded.result : null;
  const items = data?.items ?? [];
  const filterActive = !!(search.trim() || childId || service);
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
      <TaskStepper label="Internal supervisor review process" steps={[
        { id:'queue', label:'Review queue', status:'current', description:'Filtered server worklist' },
        { id:'evidence', label:'Inspect evidence', status:'pending', description:'Open source-bound report draft' },
        { id:'decision', label:'Comment or return', status:'pending', description:'Only actions granted by the server' },
        { id:'release', label:'Clinical release', status:'blocked', description:'Signing and family release disabled' },
      ]} />
      <DisclosureSection title="Review filters" summary={filterActive ? 'Filters active — scope is current child and specialty' : 'Search report, child, author or specialty'}>
        <Field label="Search reports" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Report, child, therapist or specialty" testId="review-queue-search" />
        {search && <Button size="sm" variant="ghost" onClick={() => setSearch('')}
          data-testid="review-queue-clear-search">Clear search</Button>}
        <p className="mt-2 text-xs text-brand-inkMuted">Child and specialty scope is supplied by the authorized parent workspace. Search only narrows the server-side review queue; it never broadens permissions.</p>
      </DisclosureSection>
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
          <div className="flex flex-wrap items-center gap-2">
            <details className="rounded-control border border-border-light px-3 py-2" data-testid={`review-queue-preview-${r.id}`}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
                <Eye size={16} aria-hidden="true"/> Context
              </summary>
              <p className="mt-2 max-w-xs text-xs text-brand-inkMuted">Draft by {r.author}, {serviceLabel(r.service)} for {r.childName}. Period {r.periodStart} to {r.periodEnd}. Open the report to inspect exact source evidence and permitted internal decisions.</p>
              <p className="mt-1 text-xs font-medium">No clinical approval or family release is implied.</p>
            </details>
            <Link href={`/app/reports/${r.id}`} className="inline-flex min-h-[44px] items-center rounded-control px-3 text-[14px] font-semibold text-brand-action hover:bg-surface-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" data-testid={`review-queue-open-${r.id}`} aria-label={`Open draft: ${r.title} for ${r.childName}`}>Open draft</Link>
          </div>
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
