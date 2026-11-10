'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, PlayCircle } from 'lucide-react';
import { ProductShell } from '@/components/auth/ProductShell';
import { FormAlert, SubmitButton } from '@/components/auth/Field';
import { useSession } from '@/components/auth/useSession';
import { StatusPill, formatDate } from '@/components/applications/StatusPill';
import { DecisionPanel } from '@/components/applications/DecisionPanel';
import { Card } from '@/components/design/ui';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import { ApiError } from '@/lib/api';
import { SPECIALTY_OPTIONS, STATUS_LABELS, authApi, type ApplicationDetail } from '@/lib/auth';

const EVENT_LABELS: Record<string, string> = { submitted: 'Application submitted', review_started: 'Review started', approved: 'Approved', rejected: 'Rejected', provisioned: 'Center provisioned' };
const specialtyLabel = (v: string) => SPECIALTY_OPTIONS.find((s) => s.value === v)?.label ?? v;

function Detail({ id, canDecide, onError }: { id: string; canDecide: boolean; onError: (e: unknown) => void }) {
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setFailed(false);
    try {
      setApp(await authApi.application(id));
    } catch (e) {
      try {
        onError(e);
      } catch {
        setFailed(true);
      }
    }
  }, [id, onError]);
  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <ErrorState onRetry={() => void load()} testId="application-error" />;
  if (!app) return <Card className="p-5"><SkeletonRows rows={5} testId="application-loading" /></Card>;
  return (
    <div className="space-y-6">
      <Link href="/app/applications" className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-action hover:underline" data-testid="back-to-applications"><ArrowLeft size={16} aria-hidden="true" /> All applications</Link>
      <div className="tb-rise flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words font-display text-[28px] font-bold leading-tight md:text-[32px]" data-testid="application-title">{app.organizationName}</h1>
          <p className="mt-1 text-[14px] text-brand-inkMuted"><span className="tnum font-mono" data-testid="application-reference">{app.reference}</span> · Submitted <span className="tnum">{formatDate(app.submittedAt)}</span></p>
        </div>
        <StatusPill status={app.status} testId="application-status" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 md:p-6" testId="application-details">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold"><Building2 size={18} aria-hidden="true" /> Application details</h2>
            <dl className="mt-3 divide-y divide-border-light">
              <Row label="Location">{app.city}, {app.country} · {app.timezone.replace('_', ' ')}</Row>
              <Row label="Contact">{app.contactName}</Row>
              <Row label="Email">{app.contactEmail}</Row>
              <Row label="Phone">{app.contactPhone || '—'}</Row>
              <Row label="Services">{app.specialties.map(specialtyLabel).join(', ')}</Row>
              <Row label="Size"><span className="tnum">{app.therapistEstimate} therapists · {app.childEstimate} children</span></Row>
              <Row label="Message"><span className="whitespace-pre-wrap">{app.message || '—'}</span></Row>
            </dl>
          </Card>
          <DecisionPanel app={app} canDecide={canDecide} onChanged={setApp} onError={onError} />
        </div>
        <Card className="p-5 md:p-6" testId="application-history">
          <h2 className="text-[18px] font-semibold">History</h2>
          <ol className="mt-4 space-y-4 border-l-2 border-border-light pl-4">
            {app.events.map((e) => (
              <li key={e.id} className="relative" data-testid={`history-${e.type}`}>
                <span aria-hidden="true" className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-surface-white bg-brand-action" />
                <p className="text-[14px] font-semibold">{EVENT_LABELS[e.type] ?? e.type}</p>
                <p className="tnum text-[13px] text-brand-inkMuted">{formatDate(e.createdAt)}{e.actor ? ` · ${e.actor}` : ' · Applicant'}{e.fromStatus ? ` · ${STATUS_LABELS[e.fromStatus]} → ${STATUS_LABELS[e.toStatus]}` : ''}</p>
                {e.note && <p className="mt-1 whitespace-pre-wrap break-words text-[14px]">{e.note}</p>}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, handle } = useSession();
  if (state.status === 'loading') return <div className="p-8"><SkeletonRows rows={4} testId="session-loading" /></div>;
  if (state.status === 'error') return <div className="p-8"><FormAlert tone="danger" testId="session-error">{state.message}</FormAlert></div>;
  return (
    <ProductShell session={state.data} active="applications" planned={[]}>
      <Detail id={id} canDecide={state.data.permissions.includes('platform.applications.decide')} onError={handle} />
    </ProductShell>
  );
}
