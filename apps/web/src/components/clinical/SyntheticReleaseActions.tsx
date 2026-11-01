'use client';
import { useState } from 'react';
import { Button, Card } from '@/components/design/ui';
import { familyReleaseApi } from '@/lib/family-releases';
import type { DocumentItem, HistoryItem } from '@/lib/governance';

export function SyntheticReleaseActions({ centerId, document, history }:
  { centerId: string; document: DocumentItem; history: HistoryItem[] }) {
  const [approvalId, setApprovalId] = useState('');
  const [recipients, setRecipients] = useState<{ id: string; displayName: string; eligible: boolean }[]>([]);
  const [recipient, setRecipient] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const latestSubmission = history.find(h => h.toStatus === 'IN_REVIEW' &&
    ['DRAFT','RETURNED_FOR_REVISION'].includes(h.fromStatus));
  if (document.status !== 'IN_REVIEW' || !latestSubmission) return null;
  const approve = async () => {
    setBusy(true); setMessage('');
    try {
      const a = await familyReleaseApi.approve(centerId, latestSubmission.snapshotId);
      setApprovalId(a.id);
      setRecipients((await familyReleaseApi.recipients(centerId, a.id)).items);
      setMessage('Synthetic family rendering approved. No production clinical signature was issued.');
    } catch { setMessage('Synthetic approval unavailable or denied.'); }
    finally { setBusy(false); }
  };
  const grant = async () => {
    if (!recipient) return;
    setBusy(true); setMessage('');
    try {
      const r = await familyReleaseApi.grant(centerId, approvalId, recipient) as { id: string };
      setReleaseId(r.id); setMessage('Synthetic recipient-specific grant recorded. Notification captured only.');
    } catch { setMessage('Release denied. Check guardian consent, restriction and clinical assignment.'); }
    finally { setBusy(false); }
  };
  const change = async (status: 'REVOKED' | 'WITHDRAWN' | 'SUPERSEDED') => {
    setBusy(true); setMessage('');
    try {
      await familyReleaseApi.change(centerId, releaseId, status, 'Synthetic clinical release correction');
      setReleaseId(''); setMessage(`Release ${status.toLowerCase()}.`);
    } catch { setMessage('Release change denied. Reload the latest state.'); }
    finally { setBusy(false); }
  };
  return <Card className="space-y-3 p-5" testId="synthetic-family-release-actions">
    <h3 className="text-lg font-semibold">Family release (synthetic only)</h3>
    <p className="text-sm">Clinical production signing and release remain disabled. These actions require both server-controlled synthetic flags.</p>
    <Button variant="secondary" disabled={busy} onClick={() => void approve()}>Approve family rendering (synthetic)</Button>
    {approvalId && <div className="space-y-2">
      <label className="block text-sm font-semibold" htmlFor="family-release-guardian">Authorized guardian</label>
      <select id="family-release-guardian" className="w-full rounded-control border border-border-light p-2" value={recipient} onChange={e => setRecipient(e.target.value)}>
        <option value="">Select guardian</option>
        {recipients.map(r => <option key={r.id} value={r.id} disabled={!r.eligible}>{r.displayName}{r.eligible ? '' : ' — restricted or consent pending'}</option>)}
      </select>
      <Button disabled={busy || !recipient} onClick={() => void grant()}>Release approved version</Button>
    </div>}
    {releaseId && <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={busy} onClick={() => void change('REVOKED')}>Revoke</Button>
      <Button variant="secondary" disabled={busy} onClick={() => void change('WITHDRAWN')}>Withdraw</Button>
      <Button variant="secondary" disabled={busy} onClick={() => void change('SUPERSEDED')}>Mark replaced</Button>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </Card>;
}
