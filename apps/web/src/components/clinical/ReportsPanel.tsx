'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Field } from '@/components/auth/Field';
import { SelectField, useLoad } from '@/components/centers/kit';
import { Button, Card, Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { Workspace } from '@/lib/clinical';
import { daysAgo, isoDay, reportsApi, type ReportRow } from '@/lib/reports';

type Run = (fn: () => Promise<unknown>, ok: string) => Promise<boolean>;

export function ReportsPanel({ centerId, ws, run, onError }: { centerId: string; ws: Workspace; run: Run; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => reportsApi.list(centerId, ws.child.id), [centerId, ws.child.id]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [older, setOlder] = useState<{ items: ReportRow[]; nextOffset: number | null; hasMore: boolean } | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState('');
  const rows = [...(data?.items ?? []), ...(older?.items ?? []).filter(r => !data?.items.some(x => x.id === r.id))];
  const hasMore = older?.hasMore ?? data?.hasMore ?? false;
  const nextOffset = older?.nextOffset ?? data?.nextOffset;
  const loadOlder = async () => {
    if (loadingOlder || !hasMore || nextOffset === null || nextOffset === undefined) return;
    setLoadingOlder(true); setOlderError('');
    try {
      const page = await reportsApi.list(centerId, ws.child.id, nextOffset);
      setOlder(prev => ({ items: [...(prev?.items ?? []), ...page.items], nextOffset: page.nextOffset, hasMore: page.hasMore }));
    } catch { setOlderError('Earlier report drafts could not be loaded. Please retry.'); }
    finally { setLoadingOlder(false); }
  };
  const [f, setF] = useState({ service: ws.child.services[0] ?? '', title: 'Progress report', periodStart: daysAgo(89), periodEnd: isoDay(new Date()) });
  const create = async () => {
    if (f.periodStart > f.periodEnd) return run(() => Promise.reject(Object.assign(new Error('The start of the period must be on or before its end.'), { status: 422 })), '');
    if (await run(() => reportsApi.create(centerId, ws.child.id, f), 'Report draft started from recorded data.')) { setOlder(null); await reload(); }
  };
  return (
    <div className="space-y-4" data-testid="reports-panel">
      {ws.canEdit && (
        <Card className="space-y-3 p-5" testId="report-form">
          <h3 className="text-[16px] font-semibold">Start a progress report draft</h3>
          <p className="text-[13px] text-brand-inkMuted">The draft starts with recorded assessment summaries, goals and observations for the period. You write the summary and recommendations.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField label="Service" value={f.service} onChange={(service) => setF({ ...f, service })} testId="report-service" options={ws.child.services.map((s) => ({ value: s, label: serviceLabel(s) }))} />
            <Field label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} testId="report-title" />
            <Field label="Period from" type="date" value={f.periodStart} onChange={(e) => setF({ ...f, periodStart: e.target.value })} testId="report-from" />
            <Field label="Period to" type="date" value={f.periodEnd} onChange={(e) => setF({ ...f, periodEnd: e.target.value })} testId="report-to" />
          </div>
          <Button onClick={() => void create()} data-testid="report-create">Start draft</Button>
        </Card>
      )}
      {failed && <ErrorState onRetry={() => void reload()} testId="reports-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={2} testId="reports-loading" /></Card>}
      {data && !data.items.length && <EmptyState icon={FileText} title="No progress reports yet" body={ws.canEdit ? 'Start a draft above.' : 'Reports appear here once a therapist starts a draft.'} testId="reports-empty" />}
      {rows.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4" testId={`report-row-${r.id}`}>
          <div>
            <p className="text-[15px] font-semibold">{r.title}</p>
            <p className="text-[13px] text-brand-inkMuted">{serviceLabel(r.service)} · {r.periodStart} to {r.periodEnd} · by {r.author} · {r.versions} saved {r.versions === 1 ? 'version' : 'versions'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={r.status === 'IN_REVIEW' ? 'caution' : 'neutral'}>{r.status.replaceAll('_', ' ')}</Pill>
            <Link href={`/app/reports/${r.id}`} className="text-[14px] font-semibold text-brand-action hover:underline" data-testid={`report-open-${r.id}`}>Open</Link>
          </div>
        </Card>
      ))}
      {data && hasMore && <Button variant="secondary" disabled={loadingOlder} onClick={() => void loadOlder()} data-testid="reports-load-more">
        {loadingOlder ? 'Loading earlier reports…' : 'Load earlier reports'}
      </Button>}
      {olderError && <p role="alert" className="text-[13px] text-status-caution" data-testid="reports-load-error">{olderError}</p>}
    </div>
  );
}
