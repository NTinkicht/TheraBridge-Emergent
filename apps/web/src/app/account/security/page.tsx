'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ProductShell } from '@/components/auth/ProductShell';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { useSession } from '@/components/auth/useSession';
import { Card } from '@/components/design/ui';
import { SkeletonRows } from '@/components/design/states';
import { ApiError } from '@/lib/api';
import { PASSWORD_HINT, authApi } from '@/lib/auth';

function ChangePassword({ onRotated }: { onRotated: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) return setMsg({ tone: 'danger', text: 'The two new passwords do not match.' });
    setBusy(true);
    setMsg(null);
    try {
      await authApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMsg({ tone: 'success', text: 'Password changed. Your other devices were signed out.' });
      onRotated();
    } catch (err) {
      setMsg({ tone: 'danger', text: err instanceof ApiError && err.status === 401 ? 'Your session ended. Please sign in again.' : (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 md:p-6" testId="change-password-card">
      <h2 className="text-[18px] font-semibold">Change password</h2>
      <form onSubmit={submit} className="mt-5 max-w-[440px] space-y-5" noValidate data-testid="change-password-form">
        {msg && <FormAlert tone={msg.tone} testId={`change-password-${msg.tone}`}>{msg.text}</FormAlert>}
        <Field label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} testId="current-password-input" />
        <Field label="New password" type="password" autoComplete="new-password" hint={PASSWORD_HINT} value={next} onChange={(e) => setNext(e.target.value)} testId="new-password-input" />
        <Field label="Repeat new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} testId="confirm-password-input" />
        <SubmitButton busy={busy} testId="change-password-submit">Change password</SubmitButton>
      </form>
    </Card>
  );
}

function SignOutEverywhere() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-5 md:p-6" testId="sign-out-everywhere-card">
      <h2 className="text-[18px] font-semibold">Sign out everywhere</h2>
      <p className="mt-1 max-w-[560px] text-[14px] text-brand-inkMuted">Ends every TheraBridge session for your account, including this one. Use it if you signed in on a shared or lost device.</p>
      <button type="button" disabled={busy} data-testid="sign-out-everywhere-button"
        onClick={async () => { setBusy(true); await authApi.logoutAll().catch(() => undefined); router.replace('/login?signedout=1'); }}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-control bg-status-danger px-4 text-[14px] font-semibold text-white transition-[filter] hover:brightness-95">
        {busy ? 'Signing out…' : 'Sign out on all devices'}
      </button>
    </Card>
  );
}

export default function SecurityPage() {
  const { state, reload } = useSession();
  if (state.status === 'loading') return <div className="p-8"><SkeletonRows rows={4} testId="session-loading" /></div>;
  if (state.status === 'error') return <div className="p-8"><FormAlert tone="danger" testId="session-error">{state.message}</FormAlert></div>;
  const ctx = state.data.activeContext;
  return (
    <ProductShell session={state.data} active="security" planned={[]}>
      <div className="space-y-6">
        <div className="tb-rise">
          <h1 className="font-display text-[28px] font-bold leading-tight md:text-[32px]" data-testid="security-title">Account security</h1>
          <p className="mt-1 break-words text-[15px] text-brand-inkMuted" data-testid="security-email">{state.data.user.email}</p>
        </div>
        <ChangePassword onRotated={() => void reload()} />
        <SignOutEverywhere />
        <p className="text-[13px] text-brand-inkMuted" data-testid="session-expiry-note">
          Sessions end after 30 minutes without activity and always after 12 hours.{ctx ? '' : ' No workspace is selected.'}
        </p>
      </div>
    </ProductShell>
  );
}
