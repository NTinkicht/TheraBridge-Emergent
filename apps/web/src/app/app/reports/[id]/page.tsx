'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, EyeOff, FlaskConical } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { Workspace, errorText, useLoad } from '@/components/centers/kit';
import { FamilyProgress } from '@/components/clinical/FamilyProgress';
import { ReportEditor } from '@/components/clinical/ReportEditor';
import { Compare, Evidence, HistoryList, Review } from '@/components/clinical/ReportSide';
import { Button, Card, Pill } from '@/components/design/ui';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { SessionInfo } from '@/lib/auth';
import { reportsApi, type FamilyProgress as FP, type ReportVersion } from '@/lib/reports';

function Report({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const { id } = useParams<{ id: string }>();
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => reportsApi.detail(centerId, id), [centerId, id]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [compare, setCompare] = useState<ReportVersion | null>(null);
  const [preview, setPreview] = useState<FP | null>(null);
  const [live, setLive] = useState<Record<string, string> | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (preview) { previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, [preview]);
  const showPreview = async () => {
    try { setPreview(await reportsApi.familyPreview(centerId, id)); } catch (e) { errorText(e, onError); }
  };
  if (failed) return <ErrorState title="We couldn’t open this report" body="It may not exist, or it belongs to a child you’re not assigned to." onRetry={() => void reload()} testId="report-error" />;
  if (!data) return <Card className="p-5"><SkeletonRows rows={6} testId="report-loading" /></Card>;
  const r = data.report;
  return (
    <div className="space-y-5" data-testid="report-page">
      <Link href={`/app/clinical/${r.childId}`} className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-action hover:underline" data-testid="report-back"><ArrowLeft size={15} aria-hidden="true" />{r.childName}</Link>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[28px] font-bold" data-testid="report-title-heading">{r.title}</h1>
          <Pill tone={r.status === 'IN_REVIEW' ? 'caution' : 'neutral'} testId="report-status">{r.status.replaceAll('_', ' ')}</Pill>
          <Pill tone="danger">Unreleased</Pill>
        </div>
        <p className="text-[14px] text-brand-inkMuted">{serviceLabel(r.service)} · {r.periodStart} to {r.periodEnd} · by {r.author}</p>
      </div>
      <p className="flex items-start gap-2 rounded-control bg-status-cautionSurface p-3 text-[13px]" data-testid="report-synthetic-banner"><FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Synthetic data only, not for clinical use. The draft starts from recorded observations and assessment summaries only. {data.locked} AI drafting is not available.</p>
      {preview && (
        <div ref={previewRef} className="scroll-mt-4 space-y-2" data-testid="report-family-preview">
          <div className="flex justify-end"><Button size="sm" variant="ghost" onClick={() => setPreview(null)} data-testid="report-preview-close">Close preview</Button></div>
          <FamilyProgress data={preview} testId="family-format" banner={
            <p className="flex items-start gap-2 rounded-control border-2 border-dashed border-status-danger bg-fam-surface p-3 text-[14px] text-status-danger" data-testid="family-format-unreleased">
              <EyeOff size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span><strong>Internal preview — not approved, signed or released.</strong> No family can see this. It shows the future family-safe format: the family-friendly summary and recorded values only.</span>
            </p>
          } />
          <p className="break-all text-[12px] text-brand-inkMuted">Snapshot {preview.snapshotId} · SHA-256 {preview.fingerprint}</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          {success && <FormAlert tone="success" testId="report-notice-success">{success}</FormAlert>}
          {compare && <Compare v={compare} current={live ?? r.sections} onClose={() => setCompare(null)} />}
          <ReportEditor key={`${r.status}-${r.version}`} centerId={centerId} d={data} onReload={reload} onError={onError} onPreview={() => { setSuccess(null); void showPreview(); }} onSections={setLive} onSuccess={setSuccess} />
        </div>
        <div className="min-w-0 space-y-5">
          <Review centerId={centerId} d={data} onReload={reload} onError={onError} />
          <HistoryList centerId={centerId} d={data} onError={onError} onCompare={setCompare} />
          <Evidence d={data} />
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return <Workspace active="clinical" permission="center.clinical.read" deniedText="Progress reports are available to therapists and clinical supervisors.">{(s, onError) => <Report session={s} onError={onError} />}</Workspace>;
}
