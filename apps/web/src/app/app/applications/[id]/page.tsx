'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, Lock, PlayCircle } from 'lucide-react';
import { ProductShell } from '@/components/auth/ProductShell';
import { FormAlert, SubmitButton } from '@/components/auth/Field';
import { useSession } from '@/components/auth/useSession';
import { StatusPill, formatDate } from '@/components/applications/StatusPill';
import { Card } from '@/components/design/ui';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import { ApiError } from '@/lib/api';
import { SPECIALTY_OPTIONS, STATUS_LABELS, authApi, type ApplicationDetail } from '@/lib/auth';

const EVENT_LABELS: Record<string, string> = { submitted: 'Application submitted', review_started: 'Review started', approved: 'Approved', rejected: 'Rejected' };
const specialtyLabel = (v: string) => SPECIALTY_OPTIONS.find((s) => s.value === v)?.label ?? v;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[13px] font-medium text-brand-inkMuted">{label}</dt>
      <dd className="min-w-0 break-words text-[15px]">{children}</dd>
    </div>
  );
}

function DecisionPanel({ app, canDecide, onChanged, onError }: { app: ApplicationDetail; canDecide: boolean; onChanged: (a: ApplicationDetail) => void; onError: (e: unknown) => void }) {
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const open = app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW';

  async function run(action: () => Promise<ApplicationDetail>) {
    setBusy(true);
    setMsg(null);
    try {
      onChanged(await action());
      setDecision(null);
      setRationale('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setMsg(e.message);
      else if (e instanceof ApiError && e.status === 400) setMsg(e.message);
      else {
        try {
          onError(e);
        } catch {
          setMsg(`We couldn’t save this decision yet — ${(e as Error).message}`);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Card className="p-5 md:p-6" testId="decision-record">
        <h2 className="text-[18px] font-semibold">Decision</h2>
        <dl className="mt-3 divide-y divide-border-light">
          <Row label="Outcome"><StatusPill status={app.status} testId="decision-outcome" /></Row>
          <Row label="Decided by">{app.decidedBy ?? 'Unknown'}</Row>
          <Row label="Decided at"><span className="tnum">{app.decidedAt ? formatDate(app.decidedAt) : '—'}</span></Row>
          <Row label="Rationale"><span className="whitespace-pre-wrap" data-testid="decision-rationale">{app.decisionRationale}</span></Row>
        </dl>
        {app.provisioning && (
          <div className="mt-4 flex flex-col gap-3 rounded-control border border-dashed border-border-strong bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="provisioning-pending">
            <p className="text-[14px]"><span className="font-semibold">Awaiting center provisioning.</span> Creating the center and inviting its first administrator arrives in {app.provisioning.workUnit}.</p>
            <button type="button" disabled aria-disabled="true" title={`Arrives in ${app.provisioning.workUnit}`} data-testid="provision-center-button"
              className="inline-flex min-h-[44px] shrink-0 cursor-not-allowed items-center gap-2 rounded-control border border-border-strong px-4 text-[14px] font-medium text-brand-inkMuted">
              <Lock size={15} aria-hidden="true" /> Provision center
            </button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-5 md:p-6" testId="decision-panel">
      <h2 className="text-[18px] font-semibold">Review and decide</h2>
      <p className="mt-1 text-[14px] text-brand-inkMuted">Your decision and rationale become a permanent part of this application’s history.</p>
      {msg && <div className="mt-4"><FormAlert tone="danger" testId="decision-error">{msg}</FormAlert></div>}
      {!canDecide && <div className="mt-4"><FormAlert tone="info" testId="decision-readonly">You can view this application but not decide on it.</FormAlert></div>}
      {canDecide && app.status === 'SUBMITTED' && (
        <button type="button" disabled={busy} onClick={() => void run(() => authApi.startReview(app.id, app.version))} data-testid="start-review-button"
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border-strong bg-surface-white px-4 text-[14px] font-medium transition-colors hover:bg-surface-subtle">
          <PlayCircle size={17} aria-hidden="true" /> Start review
        </button>
      )}
      {canDecide && (
        <form className="mt-5 space-y-4" noValidate data-testid="decision-form"
          onSubmit={(e) => { e.preventDefault(); if (!decision) return setMsg('Choose approve or reject.'); if (rationale.trim().length < 10) return setMsg('Explain the decision in at least 10 characters.'); void run(() => authApi.decide(app.id, decision, rationale.trim(), app.version)); }}>
          <div role="radiogroup" aria-label="Decision" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['APPROVED', 'REJECTED'] as const).map((d) => (
              <label key={d} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-control border px-4 text-[15px] font-medium transition-colors ${decision === d ? (d === 'APPROVED' ? 'border-status-success bg-status-successSurface' : 'border-status-danger bg-status-dangerSurface') : 'border-border-light hover:bg-surface-subtle'}`}>
                <input type="radio" name="decision" className="h-4 w-4" checked={decision === d} onChange={() => setDecision(d)} data-testid={`decision-${d.toLowerCase()}`} />
                {d === 'APPROVED' ? 'Approve' : 'Reject'}
              </label>
            ))}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="rationale" className="block text-[14px] font-medium">Rationale (shared with the applicant later)</label>
            <textarea id="rationale" rows={4} maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} data-testid="decision-rationale-input"
              className="block w-full rounded-control border border-border-strong bg-surface-white px-3.5 py-3 text-[15px] focus:border-brand-action focus:outline-none focus:ring-[3px] focus:ring-brand-action/20" />
            <p className="text-[12px] text-brand-inkMuted">At least 10 characters.</p>
          </div>
          <div className="sm:max-w-[260px]"><SubmitButton busy={busy} testId="decision-submit-button">{decision === 'REJECTED' ? 'Record rejection' : 'Record approval'}</SubmitButton></div>
        </form>
      )}
    </Card>
  );
}

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
      <div className="tb-rise flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
