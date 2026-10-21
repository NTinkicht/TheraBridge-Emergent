'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { PASSWORD_HINT, authApi } from '@/lib/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Token travels in the URL fragment so it is never sent to servers or written to access logs.
    setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
    history.replaceState(null, '', window.location.pathname);
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await authApi.reset(token ?? '', password);
      router.replace('/login?reset=1');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Signing in again will be required on every device." testId="reset-page">
      {token === '' ? (
        <FormAlert tone="danger" testId="reset-missing-token">This reset link is incomplete. Request a new one from the sign-in page.</FormAlert>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate data-testid="reset-form">
          {error && <FormAlert tone="danger" testId="reset-error">{error}</FormAlert>}
          <Field label="New password" type="password" autoComplete="new-password" hint={PASSWORD_HINT} value={password} onChange={(e) => setPassword(e.target.value)} testId="reset-password-input" />
          <Field label="Repeat new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} testId="reset-confirm-input" />
          <SubmitButton busy={busy} testId="reset-submit-button">Save new password</SubmitButton>
        </form>
      )}
      <Link href="/login" className="mt-8 inline-block text-[14px] font-medium text-brand-action underline-offset-4 hover:underline" data-testid="reset-back-link">Back to sign in</Link>
    </AuthLayout>
  );
}
