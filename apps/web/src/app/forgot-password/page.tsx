'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { authApi } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setDone((await authApi.forgot(email)).message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We’ll send a single-use link that works for 30 minutes." testId="forgot-page">
      {done ? (
        <div className="space-y-5">
          <FormAlert tone="success" testId="forgot-success">{done}</FormAlert>
          <p className="text-[13px] text-brand-inkMuted">Email delivery is not connected in this synthetic environment, so no message will actually arrive.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate data-testid="forgot-form">
          {error && <FormAlert tone="danger" testId="forgot-error">{error}</FormAlert>}
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} testId="forgot-email-input" />
          <SubmitButton busy={busy} testId="forgot-submit-button">Send reset link</SubmitButton>
        </form>
      )}
      <Link href="/login" className="mt-8 inline-block text-[14px] font-medium text-brand-action underline-offset-4 hover:underline" data-testid="forgot-back-link">Back to sign in</Link>
    </AuthLayout>
  );
}
