'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Baby, Plus, Search } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { ChoiceGroup, PageTitle, SelectField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { serviceLabel } from '@/components/operations/BookDialog';
import { Button, Card, Pill } from '@/components/design/ui';
import { Dialog, EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { SPECIALTY_OPTIONS, type SessionInfo } from '@/lib/auth';
import { ageFrom, dayLabel, opsApi } from '@/lib/operations';

function RegisterDialog({ centerId, open, onClose, onError }: { centerId: string; open: boolean; onClose: () => void; onError: (e: unknown) => void }) {
  const router = useRouter();
  const [f, setF] = useState({ firstName: '', lastName: '', preferredName: '', dateOfBirth: '' });
  const [services, setServices] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function save() {
    const missing = [!f.firstName.trim() && 'first name', !f.lastName.trim() && 'last name', !f.dateOfBirth && 'date of birth', !services.length && 'at least one service'].filter(Boolean);
    if (missing.length) return setMsg(`Please add ${missing.join(', ')}.`);
    setBusy(true);
    setMsg(null);
    try {
      const r = await opsApi.createChild(centerId, { ...f, preferredName: f.preferredName || undefined, services });
      router.push(`/app/children/${r.id}?registered=1`);
    } catch (e) {
      setMsg(errorText(e, onError));
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Register a child" testId="register-child-dialog"
      footer={<><Button variant="secondary" onClick={onClose} data-testid="register-child-cancel">Cancel</Button><Button onClick={() => void save()} disabled={busy} data-testid="register-child-save">{busy ? 'Saving…' : 'Register child'}</Button></>}>
      <div className="space-y-4">
        {msg && <FormAlert tone="danger" testId="register-child-error">{msg}</FormAlert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} maxLength={80} testId="child-first-name-input" />
          <Field label="Last name" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} maxLength={80} testId="child-last-name-input" />
          <Field label="Preferred name (optional)" value={f.preferredName} onChange={(e) => setF({ ...f, preferredName: e.target.value })} maxLength={80} testId="child-preferred-name-input" />
          <Field label="Date of birth" type="date" value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} testId="child-dob-input" />
        </div>
        <ChoiceGroup label="Services needed" options={SPECIALTY_OPTIONS} value={services} onChange={setServices} testId="child-service" />
        <p className="text-[13px] text-brand-inkMuted">Operational details only. Clinical records are not part of this version. Synthetic data only.</p>
      </div>
    </Dialog>
  );
}

function Children({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const canManage = session.permissions.includes('center.children.manage');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ q: '', status: 'ACTIVE' });
  const [open, setOpen] = useState(false);
  const fetcher = useCallback(() => opsApi.children(centerId, filters), [centerId, filters]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const search = (e: FormEvent) => { e.preventDefault(); setFilters({ ...filters, q: query.trim() }); };
  return (
    <div className="space-y-5">
      <PageTitle title="Children" body={session.activeContext?.role === 'THERAPIST' ? 'Children assigned to you.' : 'Every child registered at this center.'} testId="children-title"
        action={canManage ? <Button onClick={() => setOpen(true)} data-testid="register-child-button"><Plus size={17} aria-hidden="true" /> Register child</Button> : undefined} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:items-end">
        <form onSubmit={search} role="search" className="flex min-w-0 items-end gap-2">
          <Field label="Search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Child’s name" maxLength={100} testId="children-search-input" />
          <button type="submit" aria-label="Search" data-testid="children-search-button" className="grid min-h-[48px] w-12 shrink-0 place-items-center rounded-control bg-brand-action text-white hover:bg-brand-actionHover"><Search size={18} aria-hidden="true" /></button>
        </form>
        <SelectField label="Status" value={filters.status} onChange={(status) => setFilters({ ...filters, status })} testId="children-status-filter" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'ARCHIVED', label: 'Archived' }]} />
      </div>
      {failed && <ErrorState onRetry={() => void reload()} testId="children-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={4} testId="children-loading" /></Card>}
      {data && !data.items.length && <EmptyState icon={Baby} title="No children here yet" body={canManage ? 'Register the first child to start building their care team and schedule.' : 'Children assigned to you will appear here.'} testId="children-empty" />}
      {data && data.items.length > 0 && (
        <Card className="overflow-hidden" testId="children-list">
          <ul className="divide-y divide-border-light">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link href={`/app/children/${c.id}`} data-testid={`child-row-${c.id}`} className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-surface-subtle md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_auto] md:items-center md:gap-6">
                  <span className="min-w-0"><span className="block break-words font-semibold">{c.preferredName ?? c.firstName} {c.lastName}</span><span className="block text-[13px] text-brand-inkMuted">{ageFrom(c.dateOfBirth)} · {c.services.map(serviceLabel).join(', ')}</span></span>
                  <span className="text-[13px] text-brand-inkMuted">{c.team.length ? c.team.map((t) => `${t.name} (${serviceLabel(t.service)})`).join(', ') : 'No therapist assigned'}<span className="block">{c.nextAppointment ? `Next: ${dayLabel(c.nextAppointment)}` : 'No upcoming visit'}</span></span>
                  <span className="flex flex-wrap gap-1.5 md:justify-end">{!c.guardians && <Pill tone="caution">No guardian</Pill>}{!c.team.length && <Pill tone="caution">Unassigned</Pill>}{c.status === 'ARCHIVED' && <Pill>Archived</Pill>}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {canManage && <RegisterDialog centerId={centerId} open={open} onClose={() => setOpen(false)} onError={onError} />}
    </div>
  );
}

export default function ChildrenPage() {
  return <Workspace active="children" permission="center.children.read" deniedText="Children are visible to center staff.">{(s, onError) => <Children session={s} onError={onError} />}</Workspace>;
}
