'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { apiFetch, type HealthResponse } from '@/lib/api';
import { StackCheck } from './StackCheck';

export function StackPanel({ nextVersion }: { nextVersion: string }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setHealth(await apiFetch<HealthResponse>('/api/health'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="min-w-0 rounded-card border border-border-light bg-surface-white p-5 md:p-6" data-testid="stack-check-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold">Live stack check</h2>
          <p className="mt-1 text-[14px] text-brand-inkMuted">Browser → public preview URL → /api → NestJS → Prisma → PostgreSQL.</p>
        </div>
        <button type="button" onClick={() => void load()} data-testid="stack-refresh-button"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border-strong bg-surface-white px-4 text-[14px] font-medium transition-colors hover:bg-surface-subtle">
          <RotateCw size={16} aria-hidden="true" /> Check again
        </button>
      </div>
      {error && (
        <div role="alert" className="mt-4 rounded-control border border-status-danger/30 bg-status-dangerSurface px-4 py-3 text-[14px] text-status-danger" data-testid="stack-error">
          {error}
        </div>
      )}
      <div className="mt-3">
        <StackCheck nextVersion={nextVersion} health={health} failed={Boolean(error) && !health} />
      </div>
      <p className="mt-3 text-[13px] text-brand-inkMuted" data-testid="probe-retired-note">
        The TB-EM-000 probe write endpoint and its table were retired in TB-EM-001 checkpoint 0.
      </p>
    </section>
  );
}
