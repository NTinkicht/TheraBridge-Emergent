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
  const [releaseStatus, setReleaseStatus] = useState('');
  const [existingGrants, setExistingGrants] = useState<{ id: string; guardianLinkId: string; status: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const latestSubmission = history.find(h => h.toStatus === 'IN_REVIEW' &&
    ['DRAFT','RETURNED_FOR_REVISION'].includes(h.fromStatus));
  if (document.status !== 'IN_REVIEW' || !latestSubmission) return null;
  const reloadGrants = async (id = approvalId) => {
    if (!id) return;
    const result = await familyReleaseApi.grantsForApproval(centerId, id);
    setExistingGrants(result.items);
    const selected = result.items.find(g => g.guardianLinkId === recipient &&
      ['ACTIVE', 'SUPERSEDED'].includes(g.status));
    setReleaseId(selected?.id ?? '');
    setReleaseStatus(selected?.status ?? '');
  };
  const approve = async () => {
    setBusy(true); setMessage('');
    try {
      const a = await familyReleaseApi.approve(centerId, latestSubmission.snapshotId);
      setApprovalId(a.id);
      setRecipient(''); setReleaseId(''); setReleaseStatus('');
      setExistingGrants((await familyReleaseApi.grantsForApproval(centerId, a.id)).items);
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
      setReleaseId(r.id); setReleaseStatus('ACTIVE');
      setExistingGrants((await familyReleaseApi.grantsForApproval(centerId, approvalId)).items);
      setMessage('Synthetic recipient-specific grant recorded. Notification captured only.');
    } catch { setMessage('Release denied. Check guardian consent, restriction and clinical assignment.'); }
    finally { setBusy(false); }
  };
  const change = async (status: 'REVOKED' | 'WITHDRAWN' | 'SUPERSEDED') => {
    setBusy(true); setMessage('');
    try {
      await familyReleaseApi.change(centerId, releaseId, status, 'Synthetic clinical release correction');
      setReleaseStatus(status);
      if (status !== 'SUPERSEDED') setReleaseId('');
      setExistingGrants((await familyReleaseApi.grantsForApproval(centerId, approvalId)).items);
      setMessage(`Release ${status.toLowerCase()}.`);
    } catch { setMessage('Release change denied. Reload the latest state.'); }
    finally { setBusy(false); }
  };
  return <Card className="space-y-3 p-5" testId="synthetic-family-release-actions">
    <h3 className="text-lg font-semibold">Family release (synthetic only)</h3>
    <p className="text-sm">Clinical production signing and release remain disabled. These actions require both server-controlled synthetic flags.</p>
    <Button variant="secondary" disabled={busy} onClick={() => void approve()}>Approve family rendering (synthetic)</Button>
    {approvalId && <div className="space-y-2">
      <label className="block text-sm font-semibold" htmlFor="family-release-guardian">Authorized guardian</label>
      <select id="family-release-guardian" className="w-full rounded-control border border-border-light p-2" value={recipient} onChange={e => { const next = e.target.value; setRecipient(next);
        const found = existingGrants.find(g => g.guardianLinkId === next && ['ACTIVE', 'SUPERSEDED'].includes(g.status));
        setReleaseId(found?.id ?? ''); setReleaseStatus(found?.status ?? ''); }}>
        <option value="">Select guardian</option>
        {recipients.map(r => <option key={r.id} value={r.id} disabled={!r.eligible && !existingGrants.some(g => g.guardianLinkId === r.id && ['ACTIVE', 'SUPERSEDED'].includes(g.status))}>{r.displayName}{r.eligible ? '' : ' — restricted or consent pending (withdrawal only if granted)'}</option>)}
      </select>
      <Button disabled={busy || !recipient || !!releaseId || !recipients.some(r => r.id === recipient && r.eligible)} onClick={() => void grant()}>Release approved version</Button>
      <Button variant="secondary" disabled={busy} onClick={() => void reloadGrants().catch(() => setMessage('Unable to reload grants.'))}>Reload existing grants</Button>
      {existingGrants.filter(g => g.guardianLinkId === recipient).map(g => <p key={g.id} className="text-sm">Existing grant: {g.status}</p>)}
    </div>}
    {releaseId && <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={busy} onClick={() => void change('REVOKED')}>Revoke</Button>
      <Button variant="secondary" disabled={busy} onClick={() => void change('WITHDRAWN')}>Withdraw</Button>
      {releaseStatus === 'ACTIVE' && <Button variant="secondary" disabled={busy} onClick={() => void change('SUPERSEDED')}>Mark replaced</Button>}
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </Card>;
}
