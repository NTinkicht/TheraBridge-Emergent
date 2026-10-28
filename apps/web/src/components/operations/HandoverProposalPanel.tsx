'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@/components/design/ui';
import { SelectField } from '@/components/centers/kit';
import { serviceLabel } from './BookDialog';
import { opsApi, HANDOVER_LABELS, type ChildDetail, type Therapist, type HandoverInbox } from '@/lib/operations';

export function HandoverProposalPanel({ centerId, child }: { centerId: string; child: ChildDetail }) {
  const [data, setData] = useState<HandoverInbox | null>(null);
  const [staff, setStaff] = useState<Therapist[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reasonCode, setReasonCode] = useState<'STAFF_CHANGE'|'AVAILABILITY'|'FAMILY_REQUEST'>('STAFF_CHANGE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const d = await opsApi.handovers(centerId);
      setData(d);
      if (d.enabled) setStaff((await opsApi.therapists(centerId)).items);
      else setStaff([]);
      setError('');
    } catch { setError('Could not load synthetic handover proposals.'); }
  }, [centerId]);
  useEffect(() => { void reload(); }, [reload]);
  const active = child.assignments.filter(a => a.endedAt === null);
  const source = active.find(a => a.id === from);
  const eligible = staff.filter(t => t.membershipId !== source?.membershipId && source &&
    t.specialties.includes(source.service));
  const submit = async () => {
    if (!source || !to || busy) return;
    setBusy(true); setError('');
    try {
      await opsApi.proposeHandover(centerId, { childId: child.id,
        fromMembershipId: source.membershipId, toMembershipId: to, service: source.service, reasonCode });
      setFrom(''); setTo(''); await reload();
    } catch { setError('The handover proposal was not saved. Recheck the current assignment.'); }
    finally { setBusy(false); }
  };
  const cancel = async (id: string) => {
    if (busy) return; setBusy(true); setError('');
    try { await opsApi.cancelHandover(centerId,id); await reload(); }
    catch { setError('Could not cancel this proposal. Refresh its status.'); }
    finally { setBusy(false); }
  };
  const own = (data?.items ?? []).filter(p => p.childId === child.id);
  return <Card className="space-y-3 p-5" testId="handover-manager">
    <h2 className="text-[18px] font-semibold">Therapist replacement preparation</h2>
    <p className="text-[13px] text-brand-inkMuted">
      Synthetic operational acknowledgement only. No existing therapist assignment, clinical documents,
      private reports or permissions will be transferred by this step.
    </p>
    {error && <p role="alert" className="text-[13px] text-status-danger">{error}</p>}
    {data && !data.enabled && <p data-testid="handover-disabled">Handover preparation is disabled in this environment.</p>}
    {data?.enabled && <>
      <SelectField label="Current assignment" value={from} testId="handover-current"
        onChange={value => { setFrom(value); setTo(''); }}
        options={[{value:'',label:'Select an active assignment'}, ...active.map(a => ({
          value:a.id,label:`${a.therapist} · ${serviceLabel(a.service)}`}))]} />
      <SelectField label="Proposed incoming therapist" value={to} testId="handover-incoming"
        onChange={setTo} options={[{value:'',label:source ? 'Select a qualified therapist' : 'Choose current assignment first'},
          ...eligible.map(t=>({value:t.membershipId,label:t.displayName}))]} />
      <SelectField label="Operational reason" value={reasonCode} onChange={v => setReasonCode(v as typeof reasonCode)}
        testId="handover-reason" options={[{value:'STAFF_CHANGE',label:'Staff change'},
        {value:'AVAILABILITY',label:'Availability'}, {value:'FAMILY_REQUEST',label:'Family request'}]} />
      <Button size="sm" disabled={!source || !to || busy} onClick={() => void submit()}
        data-testid="handover-propose">Propose operational handover</Button>
      <ul className="space-y-2" data-testid="handover-manager-history">
        {own.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border-light p-3">
          <span className="text-[13px]">{serviceLabel(r.service)} · {HANDOVER_LABELS[r.status]}
            <span className="block text-brand-inkMuted">No clinical information or assignment changed</span>
          </span>
          {r.status !== 'CANCELLED' && <Button size="sm" variant="secondary" disabled={busy}
            onClick={() => void cancel(r.id)}>Cancel proposal</Button>}
        </li>)}
      </ul>
    </>}
  </Card>;
}
