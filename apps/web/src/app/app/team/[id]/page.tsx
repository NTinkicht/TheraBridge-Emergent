'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Ban, PauseCircle, PlayCircle } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { formatDate } from '@/components/applications/StatusPill';
import { ChoiceGroup, HistoryCard, MemberPill, PageTitle, ReasonField, RolePills, Row, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Button, Card } from '@/components/design/ui';
import { Dialog, ErrorState, SkeletonRows } from '@/components/design/states';
import { SPECIALTY_OPTIONS, type SessionInfo } from '@/lib/auth';
import { RESPONSIBILITY_OPTIONS, STAFF_ROLE_OPTIONS, centersApi, type HistoryEvent, type Member, type StaffRole } from '@/lib/centers';

type Full = Member & { events: HistoryEvent[] };
const label = (opts: readonly { value: string; label: string }[], v: string) => opts.find((o) => o.value === v)?.label ?? v;

function EditCard({ centerId, m, onSaved, onError }: { centerId: string; m: Full; onSaved: (m: Full, msg: string) => void; onError: (e: unknown) => void }) {
  const [roles, setRoles] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [f, setF] = useState({ title: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    setRoles(m.roles.filter((r) => STAFF_ROLE_OPTIONS.some((o) => o.value === r)));
    setSpecialties(m.specialties); setResponsibilities(m.responsibilities); setF({ title: m.title ?? '', phone: m.phone ?? '' });
  }, [m]);
  const isAdmin = m.roles.includes('CENTER_ADMIN');
  async function save() {
    if (!isAdmin && !roles.length) return setMsg('Keep at least one role. To remove access, revoke it instead.');
    if (f.phone && !/^[+()0-9 .-]{6,40}$/.test(f.phone.trim())) return setMsg('Use digits, spaces and + ( ) - only for the phone number.');
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await centersApi.updateMember(centerId, m.id, { roles: roles as StaffRole[], specialties, responsibilities, title: f.title.trim(), phone: f.phone.trim() }), 'Changes saved. New permissions apply on their next request.');
    } catch (e) {
      setMsg(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-4 p-5 md:p-6" testId="member-edit-card">
      <h2 className="text-[18px] font-semibold">Roles and responsibilities</h2>
      {msg && <FormAlert tone="danger" testId="member-edit-error">{msg}</FormAlert>}
      {isAdmin && <p className="text-[13px] text-brand-inkMuted">This person is a center administrator. That role is managed by TheraBridge; you can add staff roles alongside it.</p>}
      <ChoiceGroup label="Staff roles" options={STAFF_ROLE_OPTIONS} value={roles} onChange={setRoles} testId="member-role" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Job title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} testId="member-title-input" />
        <Field label="Work phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} testId="member-phone-input" />
      </div>
      <ChoiceGroup label="Specialties" options={SPECIALTY_OPTIONS} value={specialties} onChange={setSpecialties} testId="member-specialty" />
      <ChoiceGroup label="Responsibilities" options={RESPONSIBILITY_OPTIONS} value={responsibilities} onChange={setResponsibilities} testId="member-responsibility" columns={3} />
      <Button onClick={() => void save()} disabled={busy} data-testid="member-save-button">{busy ? 'Saving…' : 'Save changes'}</Button>
    </Card>
  );
}

type Action = 'suspend' | 'reactivate' | 'revoke';
const ACTIONS: Record<Action, { title: string; body: string; cta: string; needsReason: boolean }> = {
  suspend: { title: 'Suspend access', body: 'They are signed out of this center at once and cannot return until reactivated.', cta: 'Suspend access', needsReason: true },
  reactivate: { title: 'Reactivate access', body: 'They can sign in to this center again with their existing roles.', cta: 'Reactivate', needsReason: false },
  revoke: { title: 'Revoke access permanently', body: 'Their membership ends. To return, they need a new invitation.', cta: 'Revoke access', needsReason: true },
};

function AccessCard({ centerId, m, self, onSaved, onError }: { centerId: string; m: Full; self: boolean; onSaved: (m: Full, msg: string) => void; onError: (e: unknown) => void }) {
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function run() {
    if (!action) return;
    if (ACTIONS[action].needsReason && reason.trim().length < 3) return setMsg('Give a reason of at least 3 characters.');
    setBusy(true);
    setMsg(null);
    try {
      onSaved(await centersApi.memberStatus(centerId, m.id, action, ACTIONS[action].needsReason ? reason.trim() : undefined), `${ACTIONS[action].cta} — done.`);
      setAction(null);
      setReason('');
    } catch (e) {
      setMsg(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 md:p-6" testId="member-access-card">
      <h2 className="text-[18px] font-semibold">Access</h2>
      {self ? <p className="mt-2 text-[14px] text-brand-inkMuted" data-testid="member-self-note">You cannot change your own access. Ask another administrator.</p> : (
        <div className="mt-3 flex flex-wrap gap-2">
          {m.status === 'ACTIVE' && <Button variant="secondary" onClick={() => { setAction('suspend'); setMsg(null); }} data-testid="member-suspend-button"><PauseCircle size={16} aria-hidden="true" /> Suspend</Button>}
          {m.status === 'SUSPENDED' && <Button onClick={() => { setAction('reactivate'); setMsg(null); }} data-testid="member-reactivate-button"><PlayCircle size={16} aria-hidden="true" /> Reactivate</Button>}
          {m.status !== 'REVOKED' && <Button variant="danger" onClick={() => { setAction('revoke'); setMsg(null); }} data-testid="member-revoke-button"><Ban size={16} aria-hidden="true" /> Revoke access</Button>}
          {m.status === 'REVOKED' && <p className="text-[14px] text-brand-inkMuted">Access was revoked. Send a new invitation from the Team page to restore it.</p>}
        </div>
      )}
      <Dialog open={!!action} onClose={() => setAction(null)} title={action ? ACTIONS[action].title : ''} testId="member-status-dialog"
        footer={<><Button variant="secondary" onClick={() => setAction(null)} data-testid="member-status-cancel">Cancel</Button><Button variant={action === 'reactivate' ? 'primary' : 'danger'} disabled={busy} onClick={() => void run()} data-testid="member-status-confirm">{busy ? 'Saving…' : action ? ACTIONS[action].cta : ''}</Button></>}>
        <div className="space-y-4">
          {action && <p className="text-[14px]">{ACTIONS[action].body}</p>}
          {msg && <FormAlert tone="danger" testId="member-status-error">{msg}</FormAlert>}
          {action && ACTIONS[action].needsReason && <ReasonField value={reason} onChange={setReason} testId="member-status-reason" />}
        </div>
      </Dialog>
    </Card>
  );
}

function MemberDetail({ id, session, onError }: { id: string; session: SessionInfo; onError: (e: unknown) => void }) {
  const ctx = session.activeContext?.type === 'center' ? session.activeContext : null;
  const centerId = ctx?.centerId ?? '';
  const fetcher = useCallback(() => centersApi.member(centerId, id), [centerId, id]);
  const { data: m, setData, failed, reload } = useLoad(fetcher, onError);
  const [notice, setNotice] = useState<string | null>(null);
  if (failed) return <ErrorState onRetry={() => void reload()} testId="member-error" />;
  if (!m) return <Card className="p-5"><SkeletonRows rows={5} testId="member-loading" /></Card>;
  const canManage = session.permissions.includes('center.staff.manage');
  const saved = (next: Full, msg: string) => { setData(next); setNotice(msg); };
  return (
    <div className="space-y-6">
      <Link href="/app/team" className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-action hover:underline" data-testid="back-to-team"><ArrowLeft size={16} aria-hidden="true" /> Team</Link>
      <PageTitle title={m.displayName} eyebrow={m.title ?? undefined} body={m.email} action={<MemberPill status={m.status} testId="member-status" />} testId="member-title" />
      {notice && <FormAlert tone="success" testId="member-notice">{notice}</FormAlert>}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 md:p-6" testId="member-profile">
            <h2 className="text-[18px] font-semibold">Profile</h2>
            <dl className="mt-3 divide-y divide-border-light">
              <Row label="Roles"><RolePills roles={m.roles} /></Row>
              <Row label="Specialties">{m.specialties.map((s) => label(SPECIALTY_OPTIONS, s)).join(', ') || '—'}</Row>
              <Row label="Responsibilities">{m.responsibilities.map((r) => label(RESPONSIBILITY_OPTIONS, r)).join(', ') || '—'}</Row>
              <Row label="Phone">{m.phone || '—'}</Row>
              <Row label="Joined"><span className="tnum">{formatDate(m.joinedAt)}</span></Row>
              {m.status !== 'ACTIVE' && <Row label="Status note"><span data-testid="member-status-reason-text">{m.statusReason ?? '—'}{m.statusChangedAt ? ` · ${formatDate(m.statusChangedAt)}` : ''}</span></Row>}
            </dl>
          </Card>
          {canManage && m.status !== 'REVOKED' && <EditCard centerId={centerId} m={m} onSaved={saved} onError={onError} />}
          {canManage && <AccessCard centerId={centerId} m={m} self={ctx?.membershipId === m.id} onSaved={saved} onError={onError} />}
        </div>
        <HistoryCard events={m.events} testId="member-history" />
      </div>
    </div>
  );
}

export default function MemberPage() {
  const { id } = useParams<{ id: string }>();
  return <Workspace active="team" permission="center.staff.read" deniedText="The team directory is available to center administrators and coordinators.">{(s, onError) => <MemberDetail id={id} session={s} onError={onError} />}</Workspace>;
}
