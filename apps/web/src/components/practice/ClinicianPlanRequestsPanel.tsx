'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/design/ui';
import { practiceApi, HOME_REQUEST_STATUS, type ClinicianPlanRequests } from '@/lib/practice';
import { serviceLabel } from '@/components/operations/BookDialog';

export function ClinicianPlanRequestsPanel({ centerId }: { centerId: string }) {
  const [data, setData] = useState<ClinicianPlanRequests | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try { setData(await practiceApi.clinicianPlanRequests(centerId)); setError(''); }
    catch { setData(null); setError('Could not load requests.'); }
  }, [centerId]);
  useEffect(() => { void reload(); }, [reload]);

  const respond = async (id: string, status: 'ACKNOWLEDGED' | 'CLOSED_UNAVAILABLE') => {
    setBusy(id); setError('');
    try { await practiceApi.respondHomePlan(centerId, id, status); await reload(); }
    catch { setError('The request could not be updated. Refresh before retrying.'); }
    finally { setBusy(null); }
  };
  return <section className="space-y-3 rounded-card border border-border-light bg-surface-white p-4"
    data-testid="clinician-home-plan-requests" aria-label="Home-plan requests">
    <h2 className="text-[17px] font-semibold">Family home-plan requests</h2>
    <p className="text-[13px] text-brand-inkMuted">
      Structured requests for assigned children only. Acknowledging means the care team received a request;
      it does not approve, sign, send or release a home plan.
    </p>
    {error && <p role="alert" className="text-[13px] text-status-danger">{error}
      <button type="button" className="ml-2 underline" onClick={() => void reload()}>Retry</button></p>}
    {!data && !error && <p className="text-[13px]" role="status">Loading requests…</p>}
    {data && !data.enabled && <p className="text-[13px]">Synthetic request workflow disabled.</p>}
    {data?.enabled && <div className="space-y-2">
      {!data.items.length && <p className="text-[13px]">No requests from currently connected families for assigned children.</p>}
      {data.items.map(r => <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-light p-3"
        data-testid={`clinician-plan-request-${r.id}`}>
        <div className="min-w-0">
          <p className="font-semibold text-[14px]">{r.childName ?? 'Assigned child'} · {serviceLabel(r.service)}</p>
          <p className="text-[12px] text-brand-inkMuted">{HOME_REQUEST_STATUS[r.status]} · {new Date(r.createdAt).toLocaleDateString()}</p>
        </div>
        {r.status === 'PENDING' && <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy !== null} onClick={() => void respond(r.id,'ACKNOWLEDGED')}
            data-testid="plan-request-acknowledge">Acknowledge received</Button>
          <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void respond(r.id,'CLOSED_UNAVAILABLE')}
            data-testid="plan-request-close">Close unavailable</Button>
        </div>}
      </article>)}
    </div>}
  </section>;
}
