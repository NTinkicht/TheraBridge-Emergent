'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { SkeletonRows } from '@/components/design/states';
import { formatDate } from '@/components/applications/StatusPill';
import { ApiError } from '@/lib/api';
import { PASSWORD_HINT, ROLE_LABELS, authApi, type SessionInfo } from '@/lib/auth';
import { centersApi, type InvitePreview } from '@/lib/centers';

const KEY = 'tb_invite_token';
const ENDED: Record<string, string> = {
  EXPIRED: 'This invitation has expired. Ask the person who invited you to send a new one.',
  ACCEPTED: 'This invitation has already been used. Sign in with the account you created.',
  REVOKED: 'This invitation was withdrawn. Ask your center administrator if you still need access.',
  REPLACED: 'This invitation was replaced by a newer one. Use the most recent invitation you received.',
  UNAVAILABLE: 'This center is not accepting new members right now. Contact your center administrator.',
};

type Pending = Extract<InvitePreview, { status: 'PENDING' }>;

function Summary({ p }: { p: Pending }) {
  return (
    <div className="mb-6 rounded-card border border-border-light bg-surface-subtle p-4" data-testid="invite-summary">
      <p className="flex items-center gap-2 font-semibold"><Building2 size={17} aria-hidden="true" /> <span className="break-words" data-testid="invite-center-name">{p.centerName}</span></p>
      <p className="mt-1 text-[14px] text-brand-inkMuted" data-testid="invite-roles">{p.roles.map((r) => ROLE_LABELS[r]).join(' · ')}{p.title ? ` · ${p.title}` : ''}</p>
      <p className="mt-1 break-all text-[13px] text-brand-inkMuted">For {p.email} · valid until <span className="tnum">{formatDate(p.expiresAt)}</span></p>
    </div>
  );
}

function NewAccount({ token, p, onDone }: { token: string; p: Pending; onDone: () => void }) {
  const [name, setName] = useState(p.displayName);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Enter your full name.');
    if ([...password].length < 12) return setError('Use at least 12 characters for your password.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await centersApi.acceptNew(token, name.trim(), password);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5" data-testid="invite-new-account-form">
      {error && <FormAlert tone="danger" testId="invite-error">{error}</FormAlert>}
      <Field label="Email" value={p.email} readOnly disabled testId="invite-email-input" />
      <Field label="Your full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" testId="invite-name-input" />
      <Field label="Create a password" type="password" hint={PASSWORD_HINT} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" testId="invite-password-input" />
      <Field label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" testId="invite-confirm-input" />
      <SubmitButton busy={busy} testId="invite-activate-button">{busy ? 'Activating…' : 'Activate account and join'}</SubmitButton>
    </form>
  );
}

function ExistingAccount({ token, p, session, onDone }: { token: string; p: Pending; session: SessionInfo | null; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!session) {
    return (
      <div className="space-y-4" data-testid="invite-sign-in-required">
        <FormAlert tone="info" testId="invite-existing-notice">You already have a TheraBridge account for {p.email}. Sign in to add {p.centerName} to it.</FormAlert>
        <Link href="/login?next=invite" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-control bg-brand-action px-5 text-[15px] font-semibold text-white hover:bg-brand-actionHover" data-testid="invite-sign-in-link">Sign in to accept</Link>
      </div>
    );
  }
  if (session.user.email.toLowerCase() !== p.email.toLowerCase()) {
    return (
      <div className="space-y-4">
        <FormAlert tone="danger" testId="invite-wrong-account">You are signed in as {session.user.email}, but this invitation is for {p.email}.</FormAlert>
        <button type="button" onClick={() => void authApi.logout().then(() => window.location.reload())} data-testid="invite-switch-account-button"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-control border border-border-strong px-5 text-[15px] font-semibold hover:bg-surface-subtle">Sign out and use the invited account</button>
      </div>
    );
  }
  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await centersApi.acceptExisting(token);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      {error && <FormAlert tone="danger" testId="invite-error">{error}</FormAlert>}
      <button type="button" disabled={busy} onClick={() => void accept()} data-testid="invite-accept-button"
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-control bg-brand-action px-5 text-[15px] font-semibold text-white hover:bg-brand-actionHover disabled:opacity-80">
        <ShieldCheck size={18} aria-hidden="true" /> {busy ? 'Joining…' : `Accept and open ${p.centerName}`}
      </button>
    </div>
  );
}

export default function InvitePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const load = () => {
      const fromHash = new URLSearchParams(window.location.hash.slice(1)).get('token');
      if (fromHash) {
        sessionStorage.setItem(KEY, fromHash);
        window.history.replaceState(null, '', '/invite');
      }
      const t = fromHash ?? sessionStorage.getItem(KEY);
      setPreview(null);
      setError(null);
      if (!t) return setError('This page needs the link from your invitation email. Open the link again.');
      setToken(t);
      Promise.all([centersApi.inspectInvite(t), authApi.session().catch(() => null)])
        .then(([p, s]) => { if (current) { setPreview(p); setSession(s); } })
        .catch((e) => { if (current) setError(e instanceof ApiError && e.status === 404 ? 'This invitation link is not valid. Ask for a new invitation.' : (e as Error).message); });
    };
    load();
    window.addEventListener('hashchange', load);
    return () => {
      current = false;
      window.removeEventListener('hashchange', load);
    };
  }, []);

  const done = () => {
    sessionStorage.removeItem(KEY);
    router.replace('/app');
  };
  const pending = preview?.status === 'PENDING' ? (preview as Pending) : null;
  return (
    <AuthLayout title={pending ? (pending.kind === 'FIRST_ADMIN' ? 'Set up your center' : 'Join your team') : 'Your invitation'} subtitle={pending ? `Welcome, ${pending.displayName}.` : 'Checking your invitation…'} testId="invite-page">
      {error && <FormAlert tone="danger" testId="invite-load-error">{error}</FormAlert>}
      {!error && !preview && <SkeletonRows rows={3} testId="invite-loading" />}
      {preview && !pending && (
        <div className="space-y-4">
          <FormAlert tone="info" testId="invite-ended">{ENDED[preview.status]}</FormAlert>
          <Link href="/login" className="text-[14px] font-medium text-brand-action hover:underline" data-testid="invite-login-link">Go to sign in</Link>
        </div>
      )}
      {pending && token && (
        <>
          <Summary p={pending} />
          {pending.accountExists ? <ExistingAccount token={token} p={pending} session={session} onDone={done} /> : <NewAccount token={token} p={pending} onDone={done} />}
        </>
      )}
    </AuthLayout>
  );
}
