'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { ChoiceGroup, PageTitle, SelectField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Card } from '@/components/design/ui';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import { SPECIALTY_OPTIONS, type SessionInfo } from '@/lib/auth';
import { ZONES, centersApi, type CenterSettings } from '@/lib/centers';

function SettingsForm({ centerId, initial, canEdit, onSaved, onError }: { centerId: string; initial: CenterSettings; canEdit: boolean; onSaved: (s: CenterSettings) => void; onError: (e: unknown) => void }) {
  const [f, setF] = useState({ name: initial.name, city: initial.city ?? '', country: initial.country ?? '', timezone: initial.timezone });
  const [specialties, setSpecialties] = useState(initial.specialties);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  useEffect(() => { setF({ name: initial.name, city: initial.city ?? '', country: initial.country ?? '', timezone: initial.timezone }); setSpecialties(initial.specialties); }, [initial]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2 || f.city.trim().length < 2 || f.country.trim().length < 2) return setMsg({ tone: 'danger', text: 'Name, city and country need at least 2 characters.' });
    if (!specialties.length) return setMsg({ tone: 'danger', text: 'Choose at least one service.' });
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await centersApi.updateSettings(centerId, { ...f, name: f.name.trim(), city: f.city.trim(), country: f.country.trim(), specialties, version: initial.version }));
      setMsg({ tone: 'success', text: 'Center details saved.' });
    } catch (err) {
      const t = errorText(err, onError);
      if (t) setMsg({ tone: 'danger', text: t });
    } finally {
      setBusy(false);
    }
  }
  const zones = ZONES.includes(f.timezone) ? ZONES : [f.timezone, ...ZONES];
  return (
    <form onSubmit={save} noValidate className="space-y-5" data-testid="center-settings-form">
      {msg && <FormAlert tone={msg.tone} testId={`center-settings-${msg.tone}`}>{msg.text}</FormAlert>}
      <Card className="space-y-4 p-5 md:p-6">
        <Field label="Center name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={160} disabled={!canEdit} testId="settings-name-input" />
        <Field label="Center address" value={initial.slug} readOnly disabled hint="Set when the center was created. Contact TheraBridge to change it." testId="settings-slug-input" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Country" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} maxLength={80} disabled={!canEdit} testId="settings-country-input" />
          <Field label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={80} disabled={!canEdit} testId="settings-city-input" />
        </div>
        <SelectField label="Time zone" value={f.timezone} onChange={(v) => setF({ ...f, timezone: v })} options={zones.map((z) => ({ value: z, label: z.replace('_', ' ') }))} testId="settings-timezone-select" />
        <ChoiceGroup label="Services offered" options={SPECIALTY_OPTIONS} value={specialties} onChange={setSpecialties} testId="settings-specialty" />
      </Card>
      {canEdit && <div className="sm:max-w-[240px]"><SubmitButton busy={busy} testId="settings-save-button">{busy ? 'Saving…' : 'Save center details'}</SubmitButton></div>}
    </form>
  );
}

function Settings({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => centersApi.settings(centerId), [centerId]);
  const { data, setData, failed, reload } = useLoad(fetcher, onError);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="Center details" body="What your team sees about your center. Saving also completes this setup step." testId="center-settings-title" />
      {failed && <ErrorState onRetry={() => void reload()} testId="center-settings-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={4} testId="center-settings-loading" /></Card>}
      {data && <SettingsForm centerId={centerId} initial={data} canEdit={session.permissions.includes('center.settings.update')} onSaved={setData} onError={onError} />}
    </div>
  );
}

export default function CenterSettingsPage() {
  return <Workspace active="center" permission="center.settings.read" deniedText="Center details are managed by center administrators.">{(s, onError) => <Settings session={s} onError={onError} />}</Workspace>;
}
