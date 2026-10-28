'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@/components/design/ui';
import { opsApi, type HandoverInbox } from '@/lib/operations';
import { serviceLabel } from '@/components/operations/BookDialog';

export function HandoverInboxPanel({ centerId }: { centerId: string }) {
  const [data,setData] = useState<HandoverInbox|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const reload=useCallback(async()=>{
    try { setData(await opsApi.handovers(centerId)); setError(''); }
    catch { setData(null); setError('Could not load handover preparation requests.'); }
  },[centerId]);
  useEffect(()=>{void reload();},[reload]);
  const ack=async (id:string)=>{
    if(busy)return;setBusy(true);setError('');
    try { await opsApi.acknowledgeHandover(centerId,id);await reload(); }
    catch { setError('The proposed handover changed. Ask your coordinator to refresh it.'); }
    finally { setBusy(false); }
  };
  return <Card className="space-y-3 p-4" testId="handover-inbox">
    <h2 className="text-[17px] font-semibold">Operational handover requests</h2>
    <p className="text-[13px] text-brand-inkMuted">
      Acknowledge that you received a proposed staff change. This does not grant access to
      an unassigned child or approve, sign, transfer or release any clinical content.
    </p>
    {error && <p role="alert" className="text-[13px] text-status-danger">{error}</p>}
    {!data && !error && <p role="status">Loading handover requests…</p>}
    {data && !data.enabled && <p data-testid="handover-inbox-disabled">Handover preparation is disabled.</p>}
    {data?.enabled && <ul className="space-y-2">
      {!data.items.length && <li className="text-[13px]">No operational handover requests.</li>}
      {data.items.map(h => <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border-light p-3">
        <div className="text-[13px]">
          <strong>{serviceLabel(h.service)}</strong> · {h.status.replaceAll('_',' ')}
          <span className="block text-brand-inkMuted">No child details or clinical documents exposed</span>
        </div>
        {h.status === 'PENDING_ACK' && <Button size="sm" disabled={busy}
          data-testid="handover-acknowledge" onClick={()=>void ack(h.id)}>Acknowledge receipt</Button>}
      </li>)}
    </ul>}
  </Card>;
}
