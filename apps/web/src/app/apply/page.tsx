'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { ApiError } from '@/lib/api';
import { SPECIALTY_OPTIONS, authApi } from '@/lib/auth';

const ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'Europe/London', 'Europe/Paris', 'Africa/Casablanca', 'Asia/Dubai', 'Australia/Sydney', 'UTC'];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type Form = Record<'organizationName' | 'contactName' | 'contactEmail' | 'contactPhone' | 'country' | 'city' | 'timezone' | 'therapistEstimate' | 'childEstimate' | 'message', string>;

function validate(f: Form, specialties: string[], ack: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.organizationName.trim().length < 2) e.organizationName = 'Enter your center’s name.';
  if (f.contactName.trim().length < 2) e.contactName = 'Enter the name of the person we should contact.';
  if (!EMAIL.test(f.contactEmail.trim())) e.contactEmail = 'Enter a valid email address.';
  if (f.contactPhone && !/^[+()0-9 .-]{6,40}$/.test(f.contactPhone.trim())) e.contactPhone = 'Use digits, spaces and + ( ) - only.';
  if (f.country.trim().length < 2) e.country = 'Enter the country.';
  if (f.city.trim().length < 2) e.city = 'Enter the city.';
  const t = Number(f.therapistEstimate);
  if (!Number.isInteger(t) || t < 1 || t > 500) e.therapistEstimate = 'Enter a whole number from 1 to 500.';
  const c = Number(f.childEstimate);
  if (f.childEstimate === '' || !Number.isInteger(c) || c < 0 || c > 5000) e.childEstimate = 'Enter a whole number from 0 to 5000.';
  if (!specialties.length) e.specialties = 'Choose at least one service.';
  if (f.message.length > 2000) e.message = 'Keep the message under 2000 characters.';
  if (!ack) e.ack = 'Please confirm to continue.';
  return e;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-card border border-border-light bg-surface-white p-5">
      <legend className="px-1 font-display text-[16px] font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function ApplyPage() {
  const [f, setF] = useState<Form>({ organizationName: '', contactName: '', contactEmail: '', contactPhone: '', country: '', city: '', timezone: 'America/New_York', therapistEstimate: '', childEstimate: '', message: '' });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (ZONES.includes(tz)) setF((prev) => ({ ...prev, timezone: tz }));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(f, specialties, ack);
    setErrors(found);
    setFailure(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const r = await authApi.submitApplication({
        organizationName: f.organizationName.trim(), contactName: f.contactName.trim(), contactEmail: f.contactEmail.trim(),
        contactPhone: f.contactPhone.trim() || undefined, country: f.country.trim(), city: f.city.trim(), timezone: f.timezone,
        specialties, therapistEstimate: Number(f.therapistEstimate), childEstimate: Number(f.childEstimate),
        message: f.message.trim() || undefined, syntheticDataAcknowledged: ack,
      });
      setDone({ reference: r.reference });
    } catch (err) {
      setFailure(err instanceof ApiError && err.status === 400 ? 'Some details were not accepted. Check the fields and try again.' : `We couldn’t send your application yet — ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title="Application received" subtitle="Thank you. A TheraBridge administrator will review it." testId="apply-success-page" wide>
        <div className="space-y-5 rounded-card border border-border-light bg-surface-white p-5" data-testid="apply-success">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-status-success"><CheckCircle2 size={20} aria-hidden="true" /> Application pending</p>
          <p className="text-[15px]">Your reference is <span className="tnum font-mono text-[16px] font-semibold" data-testid="apply-reference">{done.reference}</span>. Keep it for any questions.</p>
          <ol className="list-decimal space-y-1 pl-5 text-[14px] text-brand-inkMuted">
            <li>A platform administrator reviews your application.</li>
            <li>You receive an approval or a reasoned decision.</li>
            <li>If approved, your center is set up and your first administrator is invited.</li>
          </ol>
          <p className="text-[13px] text-brand-inkMuted">Email delivery is not connected in this synthetic environment.</p>
        </div>
        <Link href="/login" className="mt-6 inline-block text-[14px] font-medium text-brand-action underline-offset-4 hover:underline" data-testid="apply-back-to-login">Back to sign in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Apply for your center" subtitle="Tell us about your therapy center. Applications are reviewed before any center is created." testId="apply-page" wide>
      <form onSubmit={submit} noValidate className="space-y-5" data-testid="apply-form">
        {failure && <FormAlert tone="danger" testId="apply-error">{failure}</FormAlert>}
        {Object.keys(errors).length > 0 && <FormAlert tone="danger" testId="apply-validation-summary">Please fix the highlighted fields.</FormAlert>}
        <Section title="Your center">
          <Field label="Center name" value={f.organizationName} onChange={set('organizationName')} error={errors.organizationName} maxLength={160} testId="apply-org-input" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Country" value={f.country} onChange={set('country')} error={errors.country} maxLength={80} testId="apply-country-input" />
            <Field label="City" value={f.city} onChange={set('city')} error={errors.city} maxLength={80} testId="apply-city-input" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="tz" className="block text-[14px] font-medium">Time zone</label>
            <select id="tz" value={f.timezone} onChange={set('timezone')} data-testid="apply-timezone-select"
              className="block min-h-[48px] w-full rounded-control border border-border-strong bg-surface-white px-3 text-[15px] focus:border-brand-action focus:outline-none focus:ring-[3px] focus:ring-brand-action/20">
              {ZONES.map((z) => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
            </select>
          </div>
        </Section>
        <Section title="Contact person">
          <Field label="Full name" value={f.contactName} onChange={set('contactName')} error={errors.contactName} maxLength={120} autoComplete="name" testId="apply-contact-name-input" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" type="email" value={f.contactEmail} onChange={set('contactEmail')} error={errors.contactEmail} autoComplete="email" testId="apply-contact-email-input" />
            <Field label="Phone (optional)" type="tel" value={f.contactPhone} onChange={set('contactPhone')} error={errors.contactPhone} autoComplete="tel" testId="apply-contact-phone-input" />
          </div>
        </Section>
        <Section title="Services and size">
          <div role="group" aria-labelledby="svc-label" aria-describedby={errors.specialties ? 'svc-error' : undefined}>
            <p id="svc-label" className="text-[14px] font-medium">Services you offer</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SPECIALTY_OPTIONS.map((s) => (
                <label key={s.value} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-control border border-border-light px-3 text-[14px] transition-colors hover:bg-surface-subtle has-[:checked]:border-brand-action has-[:checked]:bg-brand-actionTint">
                  <input type="checkbox" className="h-4 w-4 accent-[#0F5692]" checked={specialties.includes(s.value)} data-testid={`apply-specialty-${s.value}`}
                    onChange={(e) => setSpecialties(e.target.checked ? [...specialties, s.value] : specialties.filter((x) => x !== s.value))} />
                  {s.label}
                </label>
              ))}
            </div>
            {errors.specialties && <p id="svc-error" className="mt-1.5 text-[13px] font-medium text-status-danger" data-testid="apply-specialties-error">{errors.specialties}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Therapists (approx.)" inputMode="numeric" value={f.therapistEstimate} onChange={set('therapistEstimate')} error={errors.therapistEstimate} testId="apply-therapists-input" />
            <Field label="Children served (approx.)" inputMode="numeric" value={f.childEstimate} onChange={set('childEstimate')} error={errors.childEstimate} testId="apply-children-input" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="msg" className="block text-[14px] font-medium">Anything else we should know? (optional)</label>
            <textarea id="msg" rows={4} maxLength={2000} value={f.message} onChange={set('message')} data-testid="apply-message-input"
              className="block w-full rounded-control border border-border-strong bg-surface-white px-3.5 py-3 text-[15px] focus:border-brand-action focus:outline-none focus:ring-[3px] focus:ring-brand-action/20" />
            <p className="tnum text-right text-[12px] text-brand-inkMuted">{f.message.length}/2000</p>
          </div>
        </Section>
        <label className="flex cursor-pointer items-start gap-3 text-[14px]">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0F5692]" data-testid="apply-ack-checkbox" aria-describedby={errors.ack ? 'ack-error' : undefined} />
          <span>I understand this TheraBridge environment uses synthetic data only and must not contain real patient information.</span>
        </label>
        {errors.ack && <p id="ack-error" className="-mt-3 text-[13px] font-medium text-status-danger" data-testid="apply-ack-error">{errors.ack}</p>}
        <SubmitButton busy={busy} testId="apply-submit-button">{busy ? 'Sending…' : 'Submit application'}</SubmitButton>
      </form>
      <Link href="/login" className="mt-6 inline-block text-[14px] font-medium text-brand-action underline-offset-4 hover:underline" data-testid="apply-login-link">Already have an account? Sign in</Link>
    </AuthLayout>
  );
}
