'use client';

import { useCallback, useState } from 'react';
import { Field, FormAlert } from '@/components/auth/Field';
import { ReasonField, errorText, useLoad } from '@/components/centers/kit';
import { Button } from '@/components/design/ui';
import { Dialog } from '@/components/design/states';
import { TrialBanner } from '@/components/operations/Dashboards';
import { opsApi } from '@/lib/operations';

export function TrialCard({ centerId, onError }: { centerId: string; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => opsApi.platformTrial(centerId), [centerId]);
  const { data, setData } = useLoad(fetcher, onError);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState('14');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  if (!data) return null;
  async function extend() {
    const n = Number(days);
    if (!Number.isInteger(n) || n < 1 || n > 90) return setMsg('Extend by 1 to 90 days.');
    if (reason.trim().length < 3) return setMsg('Give a reason of at least 3 characters.');
    try {
      setData(await opsApi.extendTrial(centerId, n, reason.trim()));
      setOpen(false);
    } catch (e) {
      setMsg(errorText(e, onError));
    }
  }
  return (
    <div className="space-y-2" data-testid="platform-trial">
      <TrialBanner trial={data} />
      <Button size="sm" variant="secondary" onClick={() => { setOpen(true); setMsg(null); setReason(''); }} data-testid="trial-extend-button">Extend trial</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Extend the trial" testId="trial-extend-dialog"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void extend()} data-testid="trial-extend-confirm">Extend</Button></>}>
        <div className="space-y-4">
          {msg && <FormAlert tone="danger" testId="trial-extend-error">{msg}</FormAlert>}
          <Field label="Days to add" type="number" value={days} onChange={(e) => setDays(e.target.value)} testId="trial-extend-days-input" />
          <ReasonField value={reason} onChange={setReason} testId="trial-extend-reason" />
        </div>
      </Dialog>
    </div>
  );
}
