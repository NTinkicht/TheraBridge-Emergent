'use client';

import { useCallback, useEffect, useState } from 'react';
import { DatabaseZap, Loader2, RotateCw } from 'lucide-react';
import { apiFetch, type HealthResponse, type Probe, type ProbeList } from '@/lib/api';
import { StackCheck } from './StackCheck';
import { ProbeRows } from './ProbeList';

export function ProbePanel({ nextVersion }: { nextVersion: string }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [list, setList] = useState<ProbeList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [lastWritten, setLastWritten] = useState<Probe | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [h, l] = await Promise.all([apiFetch<HealthResponse>('/api/health'), apiFetch<ProbeList>('/api/health/probe')]);
      setHealth(h);
      setList(l);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const write = async () => {
    setWriting(true);
    setError(null);
    try {
      const created = await apiFetch<Probe>('/api/health/probe', {
        method: 'POST',
        body: JSON.stringify({ label: `preview-${Date.now()}`, source: 'web-preview' }),
      });
      setLastWritten(created);
      setList(await apiFetch<ProbeList>('/api/health/probe'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWriting(false);
    }
  };

  const readBack = lastWritten && list?.items.some((p) => p.id === lastWritten.id) ? lastWritten.id : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="min-w-0 rounded-card border border-border-light bg-surface-white p-5 md:p-6" data-testid="stack-check-card">
        <h2 className="text-[20px] font-semibold">Live stack check</h2>
        <p className="mt-1 text-[14px] text-brand-inkMuted">Browser → public preview URL → /api → NestJS → Prisma → PostgreSQL.</p>
        <div className="mt-3">
          <StackCheck nextVersion={nextVersion} health={health} failed={Boolean(error) && !health} />
        </div>
      </section>

      <section className="min-w-0 rounded-card border border-border-light bg-surface-white p-5 md:p-6" data-testid="probe-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold">Probe round trip</h2>
            <p className="mt-1 text-[14px] text-brand-inkMuted">
              Rows in table <code className="font-mono text-[13px]">feasibility_probe</code>:{' '}
              <strong data-testid="probe-total">{list ? list.total : '—'}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border-strong bg-surface-white px-4 text-[14px] font-medium transition-colors hover:bg-surface-subtle"
              data-testid="probe-refresh-button"
            >
              <RotateCw size={16} aria-hidden="true" /> Read
            </button>
            <button
              type="button"
              onClick={() => void write()}
              disabled={writing}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-control bg-brand-action px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-actionHover disabled:opacity-60"
              data-testid="probe-write-button"
            >
              {writing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <DatabaseZap size={16} aria-hidden="true" />}
              {writing ? 'Writing…' : 'Write probe row'}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-control border border-status-danger/30 bg-status-dangerSurface px-4 py-3 text-[14px] text-status-danger" data-testid="probe-error">
            {error}. <button type="button" className="font-semibold underline" onClick={() => void load()}>Retry</button>
          </div>
        )}

        <div className="mt-4" aria-live="polite">
          {list ? (
            <ProbeRows items={list.items} highlightId={readBack} />
          ) : (
            !error && <div className="h-24 animate-pulse rounded-control bg-surface-subtle" data-testid="probe-loading" />
          )}
        </div>
      </section>
    </div>
  );
}
