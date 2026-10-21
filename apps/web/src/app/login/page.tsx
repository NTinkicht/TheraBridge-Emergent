'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { ApiError } from '@/lib/api';
import { authApi } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('expired')) setNotice('Your session ended. Please sign in again.');
    if (q.get('reset')) setNotice('Your password was changed. Sign in with your new password.');
    if (q.get('signedout')) setNotice('You have signed out.');
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError(null);
    try {
      const s = await authApi.login(email.trim(), password);
      router.replace(!s.activeContext && s.contexts.length > 1 ? '/select-context' : '/app');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? err.message : err instanceof ApiError && err.status === 401 ? 'Email or password is incorrect.' : err instanceof ApiError && err.status === 400 ? 'Enter a valid email address and password.' : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Sign in to TheraBridge" subtitle="Use the email your center registered for you." testId="login-page">
      <form onSubmit={submit} className="space-y-5" noValidate data-testid="login-form">
        {notice && !error && <FormAlert tone="info" testId="login-notice">{notice}</FormAlert>}
        {error && <FormAlert tone="danger" testId="login-error">{error}</FormAlert>}
        <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} testId="login-email-input" />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} testId="login-password-input" />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[14px] font-medium text-brand-action underline-offset-4 hover:underline" data-testid="login-forgot-link">Forgot password?</Link>
        </div>
        <SubmitButton busy={busy} testId="login-submit-button">{busy ? 'Signing in…' : 'Sign in'}</SubmitButton>
      </form>
      <p className="mt-8 text-[13px] leading-relaxed text-brand-inkMuted">
        Accounts are created by your center. New centers apply to TheraBridge first (arrives in TB-EM-002).
      </p>
    </AuthLayout>
  );
}
