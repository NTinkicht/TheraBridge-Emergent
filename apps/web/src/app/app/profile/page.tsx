'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { ChoiceGroup, PageTitle, RolePills, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Card } from '@/components/design/ui';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import { SPECIALTY_OPTIONS, type SessionInfo } from '@/lib/auth';
import { RESPONSIBILITY_OPTIONS, centersApi, type Member } from '@/lib/centers';

function ProfileForm({ centerId, me, onSaved, onError }: { centerId: string; me: Member; onSaved: (m: Member) => void; onError: (e: unknown) => void }) {
  const [f, setF] = useState({ displayName: me.displayName, title: me.title ?? '', phone: me.phone ?? '' });
  const [specialties, setSpecialties] = useState(me.specialties);
  const [responsibilities, setResponsibilities] = useState(me.responsibilities);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  useEffect(() => { setSpecialties(me.specialties); setResponsibilities(me.responsibilities); }, [me]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (f.displayName.trim().length < 2) return setMsg({ tone: 'danger', text: 'Enter your full name.' });
    if (f.phone && !/^[+()0-9 .-]{6,40}$/.test(f.phone.trim())) return setMsg({ tone: 'danger', text: 'Use digits, spaces and + ( ) - only for the phone number.' });
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await centersApi.updateMe(centerId, { displayName: f.displayName.trim(), title: f.title.trim(), phone: f.phone.trim(), specialties, responsibilities }));
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
        <Field label="Full name" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={120} testId="profile-name-input" />
        <Field label="Email" value={me.email} readOnly disabled testId="profile-email-input" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Job title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} placeholder="e.g. Speech-language pathologist" testId="profile-title-input" />
          <Field label="Work phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} testId="profile-phone-input" />
        </div>
        <ChoiceGroup label="Specialties" options={SPECIALTY_OPTIONS} value={specialties} onChange={setSpecialties} testId="profile-specialty" />
        <ChoiceGroup label="Responsibilities" options={RESPONSIBILITY_OPTIONS} value={responsibilities} onChange={setResponsibilities} testId="profile-responsibility" columns={3} />
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
