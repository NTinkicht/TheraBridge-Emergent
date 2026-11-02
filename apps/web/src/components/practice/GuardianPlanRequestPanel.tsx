'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/design/ui';
import { errorText } from '@/components/centers/kit';
import { practiceApi, HOME_REQUEST_STATUS, type GuardianPlanRequests } from '@/lib/practice';
import { serviceLabel } from '@/components/operations/BookDialog';

export function GuardianPlanRequestPanel({ centerId, childId }: { centerId: string; childId: string }) {
  const [data, setData] = useState<GuardianPlanRequests | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true);
    try { setData(await practiceApi.guardianPlanRequests(centerId)); setError(''); }
    catch { setData(null); setError('Request status is unavailable. Please retry.'); }
    finally { setLoading(false); }
  }, [centerId]);
  useEffect(() => { void reload(); }, [reload]);

  const submit = async (service: string) => {
    setBusy(service); setError('');
    try {
      await practiceApi.requestHomePlan(centerId, { childId, service, requestKey: crypto.randomUUID() });
      await reload();
    } catch (e) { setError(errorText(e, () => {}) || 'Request not saved. Nothing was shared.'); }
    finally { setBusy(null); }
  };
  const child = data?.children.find(k => k.id === childId);
  const requests = data?.items.filter(r => r.childId === childId) ?? [];
  return <section className="space-y-3 rounded-card border border-fam-border bg-fam-surface p-4"
    aria-label="Request home plan" data-testid="guardian-home-plan-requests">
    <h2 className="text-[17px] font-semibold">Ask about a home plan</h2>
    <p className="text-[13px] text-fam-muted">
      This is a synthetic, fixed-choice request to your assigned care team, not a care plan,
      clinical advice or private message. No draft activities or reports are released to families.
    </p>
    {loading && <p className="text-[13px]" role="status">Loading request status…</p>}
    {error && <p role="alert" className="text-[13px] text-status-danger" data-testid="guardian-home-plan-error">{error}
      <button type="button" className="ml-2 underline" onClick={() => void reload()}>Retry</button></p>}
    {data && !data.enabled && <p className="text-[13px]" data-testid="guardian-home-plan-disabled">Home-plan requests are not enabled in this synthetic environment.</p>}
    {data?.enabled && child && <>
      <div className="flex flex-wrap gap-2" data-testid="guardian-home-plan-services">
        {child.services.map(service => {
          const pending = requests.some(r => r.service === service && r.status === 'PENDING');
          return <Button key={service} size="sm" variant="secondary" disabled={!!busy || pending}
            onClick={() => void submit(service)} data-testid={`guardian-home-plan-request-${service}`}>
            {pending ? 'Request pending' : 'Request ' + serviceLabel(service) + ' plan'}
          </Button>;
        })}
      </div>
      <ul className="space-y-2" data-testid="guardian-home-plan-history">
        {requests.map(r => <li key={r.id} className="rounded-control bg-fam-tile p-3 text-[13px]">
          <strong>{serviceLabel(r.service)}</strong> · {HOME_REQUEST_STATUS[r.status]}
          <span className="block text-fam-muted">Requested {new Date(r.createdAt).toLocaleDateString()} · No clinical plan or report delivered</span>
        </li>)}
      </ul>
      {!requests.length && <p className="text-[13px] text-fam-muted">No home-plan requests for this child yet.</p>}
    </>}
  </section>;
}
