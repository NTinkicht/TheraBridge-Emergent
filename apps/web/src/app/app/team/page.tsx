'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { MailPlus, RotateCw, Search, Users, XCircle } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { formatDate } from '@/components/applications/StatusPill';
import { ChoiceGroup, InvitationPill, MemberPill, PageTitle, RolePills, SelectField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Button, Card } from '@/components/design/ui';
import { Dialog, EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { ROLE_LABELS, SPECIALTY_OPTIONS, type SessionInfo } from '@/lib/auth';
import { RESPONSIBILITY_OPTIONS, STAFF_ROLE_OPTIONS, centersApi, type StaffRole } from '@/lib/centers';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function InviteDialog({ centerId, open, onClose, onSent, onError }: { centerId: string; open: boolean; onClose: () => void; onSent: (email: string) => void; onError: (e: unknown) => void }) {
  const [f, setF] = useState({ displayName: '', email: '', title: '' });
  const [roles, setRoles] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ displayName: '', email: '', title: '' }); setRoles([]); setSpecialties([]); setResponsibilities([]); setMsg(null); } }, [open]);
  async function send() {
    if (f.displayName.trim().length < 2) return setMsg('Enter the person’s full name.');
    if (!EMAIL.test(f.email.trim())) return setMsg('Enter a valid email address.');
    if (!roles.length) return setMsg('Choose at least one role.');
    setBusy(true);
    setMsg(null);
    try {
      await centersApi.inviteStaff(centerId, { displayName: f.displayName.trim(), email: f.email.trim(), title: f.title.trim() || undefined, roles: roles as StaffRole[], specialties, responsibilities });
      onSent(f.email.trim());
    } catch (e) {
      setMsg(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Invite a team member" testId="staff-invite-dialog"
      footer={<><Button variant="secondary" onClick={onClose} data-testid="staff-invite-cancel">Cancel</Button><Button onClick={() => void send()} disabled={busy} data-testid="staff-invite-send">{busy ? 'Sending…' : 'Send invitation'}</Button></>}>
      <div className="space-y-4">
        {msg && <FormAlert tone="danger" testId="staff-invite-error">{msg}</FormAlert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={120} testId="staff-invite-name-input" />
          <Field label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} testId="staff-invite-email-input" />
        </div>
        <Field label="Job title (optional)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} testId="staff-invite-title-input" />
        <ChoiceGroup label="Roles (choose one or more)" options={STAFF_ROLE_OPTIONS} value={roles} onChange={setRoles} testId="staff-invite-role" columns={2} />
        <ChoiceGroup label="Specialties" options={SPECIALTY_OPTIONS} value={specialties} onChange={setSpecialties} testId="staff-invite-specialty" />
        <ChoiceGroup label="Responsibilities" options={RESPONSIBILITY_OPTIONS} value={responsibilities} onChange={setResponsibilities} testId="staff-invite-responsibility" columns={2} />
        <p className="text-[13px] text-brand-inkMuted">They get a single-use link valid for 7 days. Center administrators are added by TheraBridge.</p>
      </div>
    </Dialog>
  );
}

function Invitations({ centerId, canInvite, version, onError }: { centerId: string; canInvite: boolean; version: number; onError: (e: unknown) => void }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetcher = useCallback(() => centersApi.invitations(centerId), [centerId, version]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  async function act(id: string, action: 'resend' | 'revoke') {
    setBusy(id);
    setMsg(null);
    try {
      const r = await centersApi.staffInvitation(centerId, id, action);
      setMsg({ tone: 'success', text: action === 'resend' ? `A new link was sent to ${r.email}.` : `The invitation to ${r.email} was revoked.` });
      void reload();
    } catch (e) {
      const t = errorText(e, onError);
      if (t) setMsg({ tone: 'danger', text: t });
    } finally {
      setBusy(null);
    }
  }
  if (failed) return <ErrorState onRetry={() => void reload()} testId="invitations-error" />;
  if (!data) return <Card className="p-5"><SkeletonRows rows={3} testId="invitations-loading" /></Card>;
  if (!data.items.length) return <EmptyState icon={MailPlus} title="No invitations yet" body="Invitations you send appear here with their status." testId="invitations-empty" />;
  return (
    <div className="space-y-3">
      {msg && <FormAlert tone={msg.tone} testId={`invitations-${msg.tone}`}>{msg.text}</FormAlert>}
      <Card className="overflow-hidden" testId="invitations-list">
        <ul className="divide-y divide-border-light">
          {data.items.map((i) => (
            <li key={i.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between" data-testid={`invitation-row-${i.id}`}>
              <div className="min-w-0">
                <p className="break-words font-semibold">{i.displayName} <span className="break-all font-normal text-brand-inkMuted">· {i.email}</span></p>
                <p className="mt-0.5 text-[13px] text-brand-inkMuted">{i.roles.map((r) => ROLE_LABELS[r]).join(', ')} · <span className="tnum">sent {i.sendCount}×, last {formatDate(i.lastSentAt)}</span></p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <InvitationPill status={i.status} testId={`invitation-status-${i.id}`} />
                {canInvite && (i.status === 'PENDING' || i.status === 'EXPIRED') && (
                  <>
                    <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => void act(i.id, 'resend')} data-testid={`invitation-resend-${i.id}`}><RotateCw size={14} aria-hidden="true" /> Resend</Button>
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void act(i.id, 'revoke')} data-testid={`invitation-revoke-${i.id}`}><XCircle size={14} aria-hidden="true" /> Revoke</Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Directory({ centerId, version, onError }: { centerId: string; version: number; onError: (e: unknown) => void }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ q: '', role: '', status: '', specialty: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetcher = useCallback(() => centersApi.staff(centerId, filters), [centerId, filters, version]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const search = (e: FormEvent) => { e.preventDefault(); setFilters({ ...filters, q: query.trim() }); };
  const filtered = !!(filters.q || filters.role || filters.status || filters.specialty);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] md:items-end">
        <form onSubmit={search} role="search" className="flex min-w-0 items-end gap-2">
          <Field label="Search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" maxLength={100} testId="staff-search-input" />
          <button type="submit" aria-label="Search" data-testid="staff-search-button" className="grid min-h-[48px] w-12 shrink-0 place-items-center rounded-control bg-brand-action text-white hover:bg-brand-actionHover"><Search size={18} aria-hidden="true" /></button>
        </form>
        <SelectField label="Role" value={filters.role} onChange={(role) => setFilters({ ...filters, role })} testId="staff-role-filter"
          options={[{ value: '', label: 'All roles' }, { value: 'CENTER_ADMIN', label: 'Center administrator' }, ...STAFF_ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))]} />
        <SelectField label="Status" value={filters.status} onChange={(status) => setFilters({ ...filters, status })} testId="staff-status-filter"
          options={[{ value: '', label: 'Active and suspended' }, { value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }, { value: 'REVOKED', label: 'Access revoked' }]} />
        <SelectField label="Specialty" value={filters.specialty} onChange={(specialty) => setFilters({ ...filters, specialty })} testId="staff-specialty-filter"
          options={[{ value: '', label: 'All specialties' }, ...SPECIALTY_OPTIONS.map((s) => ({ value: s.value, label: s.label }))]} />
      </div>
      {failed && <ErrorState onRetry={() => void reload()} testId="staff-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={4} testId="staff-loading" /></Card>}
      {data && data.items.length === 0 && <EmptyState icon={Users} title={filtered ? 'Nobody matches these filters' : 'No team members yet'} body={filtered ? 'Clear a filter or try another search.' : 'Invite your first colleagues to get started.'} testId="staff-empty" />}
      {data && data.items.length > 0 && (
        <Card className="overflow-hidden" testId="staff-list">
          <p className="tnum border-b border-border-light px-5 py-2.5 text-[13px] text-brand-inkMuted" data-testid="staff-count">{data.total} {data.total === 1 ? 'person' : 'people'}</p>
          <ul className="divide-y divide-border-light">
            {data.items.map((m) => (
              <li key={m.id}>
                <Link href={`/app/team/${m.id}`} data-testid={`staff-row-${m.id}`} className="grid grid-cols-1 gap-2 px-5 py-4 transition-colors hover:bg-surface-subtle md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-6">
                  <span className="min-w-0"><span className="block break-words font-semibold">{m.displayName}</span><span className="block break-all text-[13px] text-brand-inkMuted">{m.title ? `${m.title} · ` : ''}{m.email}</span></span>
                  <RolePills roles={m.roles} />
                  <span className="justify-self-start md:justify-self-end"><MemberPill status={m.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Team({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const canInvite = session.permissions.includes('center.staff.invite');
  const [tab, setTab] = useState<'members' | 'invitations'>('members');
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => { if (canInvite && new URLSearchParams(window.location.search).get('invite')) setInviting(true); }, [canInvite]);
  return (
    <div className="space-y-5">
      <PageTitle title="Team" body="Everyone with staff access to this center." testId="team-title"
        action={canInvite ? <Button onClick={() => setInviting(true)} data-testid="invite-staff-button"><MailPlus size={17} aria-hidden="true" /> Invite people</Button> : undefined} />
      {notice && <FormAlert tone="success" testId="team-notice">{notice}</FormAlert>}
      <div role="tablist" aria-label="Team views" className="inline-flex gap-1 rounded-control bg-surface-white p-1 shadow-sm">
        {(['members', 'invitations'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} data-testid={`team-tab-${t}`}
            className={`min-h-[40px] rounded-[8px] px-4 text-[14px] font-medium transition-colors ${tab === t ? 'bg-brand-action text-white' : 'text-brand-inkMuted hover:bg-surface-subtle'}`}>{t === 'members' ? 'Members' : 'Invitations'}</button>
        ))}
      </div>
      {tab === 'members' ? <Directory centerId={centerId} version={version} onError={onError} /> : <Invitations centerId={centerId} canInvite={canInvite} version={version} onError={onError} />}
      {canInvite && <InviteDialog centerId={centerId} open={inviting} onClose={() => setInviting(false)} onError={onError}
        onSent={(email) => { setInviting(false); setNotice(`Invitation sent to ${email}.`); setTab('invitations'); setVersion((v) => v + 1); }} />}
    </div>
  );
}

export default function TeamPage() {
  return <Workspace active="team" permission="center.staff.read" deniedText="The team directory is available to center administrators and coordinators.">{(s, onError) => <Team session={s} onError={onError} />}</Workspace>;
}
