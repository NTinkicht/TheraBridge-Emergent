'use client';
import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/design/ui';
import { familyReleaseApi } from '@/lib/family-releases';

type Grant = { id: string; approvalId: string; guardianLinkId: string; status: string;
  childId: string; childName: string; guardianName: string };

export function SyntheticGrantRecovery({ centerId }: { centerId: string }) {
  const [items, setItems] = useState<Grant[]>([]);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const reload = async () => {
    const data = await familyReleaseApi.recoverGrants(centerId);
    setItems(data.items); setEnabled(true);
  };
  useEffect(() => {
    let alive = true;
    familyReleaseApi.recoverGrants(centerId).then(data => {
      if (alive) { setItems(data.items); setEnabled(true); }
    }).catch(() => { if (alive) setEnabled(false); });
    return () => { alive = false; };
  }, [centerId]);
  if (!enabled) return null;
  const change = async (id: string, status: 'REVOKED' | 'WITHDRAWN') => {
    setBusy(true); setMessage('');
    try {
      await familyReleaseApi.change(centerId, id, status, 'Synthetic family release correction');
      await reload();
      setMessage(`Grant ${status.toLowerCase()}.`);
    } catch { setMessage('Unable to change grant. Reload to check its latest state.'); }
    finally { setBusy(false); }
  };
  return <Card className="space-y-3 p-5" testId="synthetic-grant-recovery">
    <h2 className="text-lg font-semibold">Existing family releases (synthetic only)</h2>
    <p className="text-sm">Recover withdrawal controls independently of clinical approval or governance history, including when a child service has been removed.</p>
    <Button variant="secondary" disabled={busy} onClick={() => void reload().catch(() => setMessage('Unable to reload grants.'))}>Reload grants</Button>
    {items.length === 0 ? <p className="text-sm">No accessible releases requiring correction.</p> :
      <ul className="space-y-2">{items.map(g => <li key={g.id} className="rounded-control border border-border-light p-3">
        <p className="text-sm font-semibold">{g.childName} — {g.guardianName} ({g.status.toLowerCase()})</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => void change(g.id, 'REVOKED')}>Revoke</Button>
          <Button variant="secondary" disabled={busy} onClick={() => void change(g.id, 'WITHDRAWN')}>Withdraw</Button>
        </div>
      </li>)}</ul>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </Card>;
}
