'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Info } from 'lucide-react';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { ChoiceGroup, PageTitle, SelectField, Workspace, errorText } from '@/components/centers/kit';
import { SkeletonRows } from '@/components/design/states';
import { SPECIALTY_OPTIONS, authApi } from '@/lib/auth';
import { ZONES, centersApi } from '@/lib/centers';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
type Form = { name: string; slug: string; city: string; country: string; timezone: string; adminName: string; adminEmail: string };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-card border border-border-light bg-surface-white p-5">
      <legend className="px-1 font-display text-[16px] font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function validate(f: Form, specialties: string[]) {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = 'Enter the center’s name.';
  if (f.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.slug = 'Use lowercase letters, numbers and single dashes.';
  if (f.slug && (f.slug.length < 3 || f.slug.length > 64)) e.slug = 'Use 3 to 64 characters.';
  if (f.country.trim().length < 2) e.country = 'Enter the country.';
  if (f.city.trim().length < 2) e.city = 'Enter the city.';
  if (!specialties.length) e.specialties = 'Choose at least one service.';
  if (f.adminName.trim().length < 2) e.adminName = 'Enter the administrator’s full name.';
  if (!EMAIL.test(f.adminEmail.trim())) e.adminEmail = 'Enter a valid email address.';
  return e;
}

function NewCenter({ onError }: { onError: (e: unknown) => void }) {
  const router = useRouter();
  const [f, setF] = useState<Form>({ name: '', slug: '', city: '', country: '', timezone: 'UTC', adminName: '', adminEmail: '' });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const summary = useRef<HTMLDivElement>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('applicationId');
    if (!id) return;
    setPrefilling(true);
    authApi.application(id).then((a) => {
      setApplicationId(a.id);
      setReference(a.reference);
      setF({ name: a.organizationName, slug: '', city: a.city, country: a.country, timezone: a.timezone, adminName: a.contactName, adminEmail: a.contactEmail });
      setSpecialties(a.specialties);
    }).catch((e) => setFailure(errorText(e, onError))).finally(() => setPrefilling(false));
  }, [onError]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(f, specialties);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return requestAnimationFrame(() => summary.current?.focus());
    setBusy(true);
    try {
      const c = await centersApi.create({
        name: f.name.trim(), slug: f.slug || undefined, city: f.city.trim(), country: f.country.trim(), timezone: f.timezone, specialties,
        applicationId: applicationId ?? undefined, firstAdmin: { displayName: f.adminName.trim(), email: f.adminEmail.trim() },
      });
      router.replace(`/app/centers/${c.id}?created=1`);
    } catch (err) {
      setFailure(errorText(err, onError));
      setBusy(false);
      requestAnimationFrame(() => summary.current?.focus());
    }
  }

  if (prefilling) return <SkeletonRows rows={5} testId="new-center-prefill-loading" />;
  const zones = ZONES.includes(f.timezone) ? ZONES : [f.timezone, ...ZONES];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={reference ? `/app/applications/${applicationId}` : '/app/centers'} className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-action hover:underline" data-testid="new-center-back"><ArrowLeft size={16} aria-hidden="true" /> {reference ? 'Back to application' : 'All centers'}</Link>
      <PageTitle title="Create a center" eyebrow={reference ? `From application ${reference}` : 'Direct creation'} body="The center, its first administrator invitation and its history are created together, or not at all." testId="new-center-title" />
      <form onSubmit={submit} noValidate className="space-y-5" data-testid="new-center-form">
        <div ref={summary} tabIndex={-1} className="space-y-3 outline-none empty:hidden">
          {failure && <FormAlert tone="danger" testId="new-center-error">{failure}</FormAlert>}
          {Object.keys(errors).length > 0 && <FormAlert tone="danger" testId="new-center-validation-summary">Please fix the highlighted fields.</FormAlert>}
        </div>
        <Section title="Center">
          <Field label="Center name" value={f.name} onChange={set('name')} error={errors.name} maxLength={160} testId="center-name-input" />
          <Field label="Center address (optional)" hint="Used in links, e.g. lakeside-therapy. Left empty, we create a unique one from the name." value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} error={errors.slug} maxLength={64} testId="center-slug-input" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Country" value={f.country} onChange={set('country')} error={errors.country} maxLength={80} testId="center-country-input" />
            <Field label="City" value={f.city} onChange={set('city')} error={errors.city} maxLength={80} testId="center-city-input" />
          </div>
          <SelectField label="Time zone" value={f.timezone} onChange={(v) => setF({ ...f, timezone: v })} options={zones.map((z) => ({ value: z, label: z.replace('_', ' ') }))} testId="center-timezone-select" />
          <ChoiceGroup label="Services offered" options={SPECIALTY_OPTIONS} value={specialties} onChange={setSpecialties} error={errors.specialties} testId="center-specialty" />
        </Section>
        <Section title="First center administrator">
          <p className="flex gap-2 text-[14px] text-brand-inkMuted"><Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> They receive a single-use invitation valid for 7 days, activate their own account and then invite their team.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" value={f.adminName} onChange={set('adminName')} error={errors.adminName} maxLength={120} testId="admin-name-input" />
            <Field label="Email" type="email" value={f.adminEmail} onChange={set('adminEmail')} error={errors.adminEmail} testId="admin-email-input" />
          </div>
        </Section>
        <div className="sm:max-w-[280px]"><SubmitButton busy={busy} testId="create-center-submit">{busy ? 'Creating center…' : 'Create center and invite'}</SubmitButton></div>
      </form>
    </div>
  );
}

export default function NewCenterPage() {
  return <Workspace active="centers" permission="platform.centers.create" deniedText="Only TheraBridge platform administrators can create centers.">{(_, onError) => <NewCenter onError={onError} />}</Workspace>;
}
