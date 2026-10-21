'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, Globe2, Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormAlert } from '@/components/auth/Field';
import { useSession } from '@/components/auth/useSession';
import { ROLE_LABELS, authApi, contextLabel, type ContextOption } from '@/lib/auth';

const keyOf = (c: ContextOption) => (c.type === 'platform' ? 'platform' : `${c.membershipId}-${c.role}`);

export default function SelectContextPage() {
  const router = useRouter();
  const { state, handle } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(c: ContextOption) {
    setBusy(keyOf(c));
    setError(null);
    try {
      await authApi.selectContext(c.type === 'platform' ? { platform: true } : { membershipId: c.membershipId, role: c.role });
      router.replace('/app');
    } catch (e) {
      try {
        handle(e);
      } catch {
        setError((e as Error).message);
      }
      setBusy(null);
    }
  }

  const data = state.status === 'ready' ? state.data : null;
  return (
    <AuthLayout title="Choose a workspace" subtitle={data ? `Signed in as ${data.user.email}` : 'Loading your workspaces…'} testId="select-context-page">
      {error && <div className="mb-4"><FormAlert tone="danger" testId="select-context-error">{error}</FormAlert></div>}
      {state.status === 'error' && <FormAlert tone="danger" testId="select-context-load-error">{state.message}</FormAlert>}
      {data && data.contexts.length === 0 && (
        <FormAlert tone="info" testId="select-context-empty">Your account is not yet assigned to a center role. Ask your center administrator to add you.</FormAlert>
      )}
      <ul className="space-y-3" data-testid="context-list">
        {data?.contexts.map((c) => {
          const active = data.activeContext && keyOf(data.activeContext) === keyOf(c);
          const Icon = c.type === 'platform' ? Globe2 : Building2;
          return (
            <li key={keyOf(c)}>
              <button type="button" onClick={() => void choose(c)} disabled={!!busy} data-testid={`context-option-${keyOf(c)}`}
                className="group flex w-full items-center gap-4 rounded-card border border-border-light bg-surface-white p-4 text-left transition-[border-color,box-shadow,transform] duration-150 hover:border-brand-action hover:shadow-sm active:scale-[0.99] disabled:opacity-70">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-brand-actionTint text-brand-action"><Icon size={20} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[15px] font-semibold">{contextLabel(c)}</span>
                  <span className="block text-[13px] text-brand-inkMuted">{ROLE_LABELS[c.role]}{active ? ' · current' : ''}</span>
                </span>
                {busy === keyOf(c) ? <Loader2 size={18} className="animate-spin text-brand-action" aria-hidden="true" /> : <ChevronRight size={18} className="text-brand-inkMuted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </AuthLayout>
  );
}
