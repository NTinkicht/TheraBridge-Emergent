'use client';

import { useEffect, useRef, useState } from 'react';
import { checkLocalMediaReadiness, type LocalMediaReadiness } from '@/lib/activity-media-local-preflight';

/**
 * No File is kept in component state, no FileReader/object URL or network call
 * occurs, and a check only reports local dimensions. Candidate bytes are never
 * retained or submitted to the private metadata proposal API.
 */
export function LocalActivityMediaReadiness() {
  const generation = useRef(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LocalMediaReadiness | null>(null);
  const [error, setError] = useState('');
  useEffect(() => () => { generation.current += 1; }, []);

  const choose = async (file: File | undefined) => {
    const token = ++generation.current;
    setResult(null); setError('');
    if (!file) { setBusy(false); return; }
    setBusy(true);
    try {
      const checked = await checkLocalMediaReadiness(file);
      if (token === generation.current) setResult(checked);
    } catch {
      if (token === generation.current) setError('This file did not pass the local PNG header check. No file was uploaded. Only a full private security and rights review could authorize future storage.');
    } finally {
      if (token === generation.current) setBusy(false);
    }
  };
  return <section className="space-y-2 rounded-control border border-border-light bg-surface-white p-3"
    data-testid="m5-local-media-readiness">
    <h5 className="text-sm font-semibold">Optional image readiness check — on this device only</h5>
    <p className="text-[13px] text-brand-inkMuted" data-testid="m5-media-local-nonrelease">
      Choose a PNG to check its basic dimensions locally. This does not upload, preview, save, publish or approve any image.
      Image admission remains blocked until private storage, independent scanning and rights approval are available.
    </p>
    <label className="block text-sm font-medium">Check a local PNG (maximum 8 MiB)
      <input type="file" accept=".png,image/png" disabled={busy}
        className="mt-1 block min-h-[44px] w-full rounded-control border border-border-strong p-2 text-[13px]"
        data-testid="m5-local-media-input"
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          // Let the same file be selected again, never retain a raw File in state.
          event.currentTarget.value = '';
          void choose(file);
        }} />
    </label>
    {busy && <p role="status" className="text-sm">Checking basic PNG header locally…</p>}
    {result && <p role="status" className="text-sm" data-testid="m5-local-media-result">
      Local header check only: {result.width} × {result.height} px, {result.byteLength} bytes.
      Not scanned, uploaded, stored or approved.
    </p>}
    {error && <p role="alert" className="text-sm text-status-danger">{error}</p>}
  </section>;
}
