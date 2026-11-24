'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { PageTitle, RolePills, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Card } from '@/components/design/ui';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import type { SessionInfo } from '@/lib/auth';
import { centersApi, type Member } from '@/lib/centers';

function ProfileForm({ centerId, me, onSaved, onError }: { centerId: string; me: Member; onSaved: (m: Member) => void; onError: (e: unknown) => void }) {
  const [f, setF] = useState({ displayName: me.displayName, title: me.title ?? '', phone: me.phone ?? '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (f.displayName.trim().length < 2) return setMsg({ tone: 'danger', text: 'Enter your full name.' });
    if (f.phone && !/^[+()0-9 .-]{6,40}$/.test(f.phone.trim())) return setMsg({ tone: 'danger', text: 'Use digits, spaces and + ( ) - only for the phone number.' });
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await centersApi.updateMe(centerId, { displayName: f.displayName.trim(), title: f.title.trim(), phone: f.phone.trim() }));
      setMsg({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      const t = errorText(err, onError);
      if (t) setMsg({ tone: 'danger', text: t });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} noValidate className="space-y-5" data-testid="profile-form">
      {msg && <FormAlert tone={msg.tone} testId={`profile-${msg.tone}`}>{msg.text}</FormAlert>}
      <Card className="space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[14px]"><span className="text-brand-inkMuted">Your roles:</span><RolePills roles={me.roles} /></div>
        <p className="text-[13px] text-brand-inkMuted" data-testid="profile-role-help">
          Your job title describes your position and can be edited here. Center roles and access permissions are assigned by your administrator; changing your job title does not change your access.
        </p>
        <Field label="Full name" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={120} testId="profile-name-input" />
        <Field label="Email" value={me.email} readOnly disabled testId="profile-email-input" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Job title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} placeholder="e.g. Speech-language pathologist" testId="profile-title-input" />
          <Field label="Work phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} testId="profile-phone-input" />
        </div>
        <section aria-label="Assigned specialties and responsibilities" className="space-y-2 rounded-control border border-border-light bg-surface-subtle p-3" data-testid="profile-admin-managed-grants">
          <p className="text-sm font-semibold">Assigned by the center administrator</p>
          <p className="text-sm" data-testid="profile-specialties-readonly">Specialties: {me.specialties.join(', ') || 'None assigned'}</p>
          <p className="text-sm" data-testid="profile-responsibilities-readonly">Responsibilities: {me.responsibilities.join(', ') || 'None assigned'}</p>
          <p className="text-xs text-brand-inkMuted">Ask your center administrator to change these assignments. Editing your profile never changes your clinical access or care-team assignments.</p>
        </section>
      </Card>
      <div className="sm:max-w-[220px]"><SubmitButton busy={busy} testId="profile-save-button">{busy ? 'Saving…' : 'Save profile'}</SubmitButton></div>
    </form>
  );
}

function Profile({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => centersApi.me(centerId), [centerId]);
  const { data, setData, failed, reload } = useLoad(fetcher, onError);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="My profile" body="How you appear to colleagues at this center." testId="profile-title" />
      {failed && <ErrorState onRetry={() => void reload()} testId="profile-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={4} testId="profile-loading" /></Card>}
      {data && <ProfileForm centerId={centerId} me={data} onSaved={setData} onError={onError} />}
    </div>
  );
}

export default function ProfilePage() {
  return <Workspace active="profile" permission="center.profile.self" deniedText="Profiles are available inside a center workspace.">{(s, onError) => <Profile session={s} onError={onError} />}</Workspace>;
}
