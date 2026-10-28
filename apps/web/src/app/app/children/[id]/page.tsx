'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarPlus, MailPlus, UserPlus } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { HistoryCard, PageTitle, ReasonField, Row, SelectField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { BookDialog, serviceLabel } from '@/components/operations/BookDialog';
import { HandoverProposalPanel } from '@/components/operations/HandoverProposalPanel';
import { ApptPill } from '@/components/operations/Dashboards';
import { Button, Card, Pill } from '@/components/design/ui';
import { Dialog, ErrorState, SkeletonRows } from '@/components/design/states';
import type { SessionInfo } from '@/lib/auth';
import { RELATIONSHIPS, ageFrom, dayLabel, opsApi, timeRange, type ChildDetail, type Therapist } from '@/lib/operations';

const PORTAL: Record<string, { tone: 'success' | 'info' | 'caution' | 'neutral'; label: string }> = {
  CONNECTED: { tone: 'success', label: 'Portal connected' }, PENDING: { tone: 'info', label: 'Invited' }, EXPIRED: { tone: 'caution', label: 'Invitation expired' },
  NOT_INVITED: { tone: 'neutral', label: 'Not invited' }, REVOKED: { tone: 'neutral', label: 'Invitation revoked' }, ACCEPTED: { tone: 'success', label: 'Portal connected' }, REPLACED: { tone: 'neutral', label: 'Replaced' },
};
type Ctx = { centerId: string; child: ChildDetail; manage: boolean; canDesignate?: boolean; run: (fn: () => Promise<unknown>, ok: string) => Promise<boolean> };

function Guardians({ centerId, child, manage, run }: Ctx) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [f, setF] = useState({ displayName: '', email: '', relationship: 'mother', isPrimary: !child.guardians.length, invite: true });
  const [msg, setMsg] = useState<string | null>(null);
  async function add() {
    if (f.displayName.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setMsg('Enter a full name and a valid email address.');
    if (await run(() => opsApi.addGuardian(centerId, child.id, { ...f, displayName: f.displayName.trim(), email: f.email.trim() }), f.invite ? 'Guardian added and invited to the family portal.' : 'Guardian added.')) setAdding(false);
  }
  return (
    <Card className="p-5 md:p-6" testId="guardians-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[18px] font-semibold">Family</h2>
        {manage && child.status === 'ACTIVE' && <Button size="sm" onClick={() => { setAdding(true); setMsg(null); }} data-testid="add-guardian-button"><UserPlus size={15} aria-hidden="true" /> Add guardian</Button>}
      </div>
      {!child.guardians.length && <p className="mt-3 text-[14px] text-brand-inkMuted" data-testid="guardians-empty">No guardian linked yet.</p>}
      <ul className="mt-3 space-y-2">
        {child.guardians.map((g) => (
          <li key={g.id} className="flex flex-col gap-2 rounded-control border border-border-light p-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`guardian-${g.id}`}>
            <span className="min-w-0"><span className="block break-words font-semibold">{g.displayName}{g.isPrimary ? ' · primary' : ''}</span><span className="block break-all text-[13px] text-brand-inkMuted">{RELATIONSHIPS.find((r) => r.value === g.relationship)?.label}{g.email ? ` · ${g.email}` : ''}</span></span>
            <span className="flex flex-wrap items-center gap-2">
              <Pill tone={PORTAL[g.portalStatus].tone} testId={`guardian-status-${g.id}`}>{PORTAL[g.portalStatus].label}</Pill>
              {manage && g.portalStatus !== 'CONNECTED' && <Button size="sm" variant="secondary" onClick={() => void run(() => opsApi.inviteGuardian(centerId, child.id, g.id), 'Family portal invitation sent.')} data-testid={`guardian-invite-${g.id}`}><MailPlus size={14} aria-hidden="true" /> {g.portalStatus === 'PENDING' || g.portalStatus === 'EXPIRED' ? 'Resend' : 'Invite'}</Button>}
              {manage && <Button size="sm" variant="ghost" onClick={() => { setRemoving(g.id); setReason(''); }} data-testid={`guardian-remove-${g.id}`}>Remove</Button>}
            </span>
          </li>
        ))}
      </ul>
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a guardian" testId="guardian-dialog"
        footer={<><Button variant="secondary" onClick={() => setAdding(false)} data-testid="guardian-cancel">Cancel</Button><Button onClick={() => void add()} data-testid="guardian-save">Add guardian</Button></>}>
        <div className="space-y-4">
          {msg && <FormAlert tone="danger" testId="guardian-error">{msg}</FormAlert>}
          <Field label="Full name" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} maxLength={120} testId="guardian-name-input" />
          <Field label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} testId="guardian-email-input" />
          <SelectField label="Relationship" value={f.relationship} onChange={(relationship) => setF({ ...f, relationship })} options={RELATIONSHIPS} testId="guardian-relationship-select" />
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#0F5692]" checked={f.isPrimary} onChange={(e) => setF({ ...f, isPrimary: e.target.checked })} data-testid="guardian-primary-checkbox" /> Primary contact</label>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#0F5692]" checked={f.invite} onChange={(e) => setF({ ...f, invite: e.target.checked })} data-testid="guardian-invite-checkbox" /> Invite to the family portal now</label>
        </div>
      </Dialog>
      <Dialog open={!!removing} onClose={() => setRemoving(null)} title="Remove guardian" testId="guardian-remove-dialog"
        footer={<><Button variant="secondary" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" data-testid="guardian-remove-confirm" onClick={() => void (async () => { if (reason.trim().length >= 3 && await run(() => opsApi.removeGuardian(centerId, child.id, removing!, reason.trim()), 'Guardian removed. Their portal access to this child ended.')) setRemoving(null); })()}>Remove</Button></>}>
        <p className="mb-3 text-[14px]">Their family portal access to {child.preferredName ?? child.firstName} ends immediately.</p>
        <ReasonField value={reason} onChange={setReason} testId="guardian-remove-reason" />
      </Dialog>
    </Card>
  );
}

function CareTeam({ centerId, child, manage, canDesignate, run }: Ctx) {
  const [open, setOpen] = useState(false);
  const [referentOpen, setReferentOpen] = useState(false);
  const [referentMember, setReferentMember] = useState(child.referent?.membershipId ?? '');
  const [referentReason, setReferentReason] = useState('');
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [f, setF] = useState({ membershipId: '', service: child.services[0] ?? '', isLead: true });
  useEffect(() => { if (open || referentOpen) void opsApi.therapists(centerId).then((r) => setTherapists(r.items)).catch(() => setTherapists([])); }, [open, referentOpen, centerId]);
  const active = child.assignments.filter((a) => !a.endedAt);
  const qualified = therapists.filter((t) => t.specialties.includes(f.service));
  return (
    <Card className="p-5 md:p-6" testId="care-team-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[18px] font-semibold">Care team</h2>
        {manage && child.status === 'ACTIVE' && <Button size="sm" onClick={() => setOpen(true)} data-testid="assign-therapist-button"><UserPlus size={15} aria-hidden="true" /> Assign therapist</Button>}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-control bg-surface-subtle p-3" data-testid="child-referent">
        <div><p className="text-[13px] font-semibold">Child-wide care referent</p>
          <p className="text-[13px] text-brand-inkMuted" data-testid="referent-current">
            {child.referent?.displayName ?? (child.referentStatus === 'UNAVAILABLE' ? 'Designation unavailable; choose another active assigned therapist' : 'Not designated')}
          </p>
          <p className="text-[12px] text-brand-inkMuted">Coordination only. This designation grants no clinical permissions.</p>
        </div>
        {canDesignate && child.status === 'ACTIVE' &&
          <Button size="sm" variant="secondary" data-testid="referent-change" onClick={() => {
            setReferentMember(child.referent?.membershipId ?? '');
            setReferentReason(''); setReferentOpen(true);
          }}>Change referent</Button>}
      </div>
      {!active.length && <p className="mt-3 text-[14px] text-brand-inkMuted" data-testid="care-team-empty">No therapist assigned yet.</p>}
      <ul className="mt-3 space-y-2">
        {active.map((a) => (
          <li key={a.id} className="flex flex-col gap-2 rounded-control border border-border-light p-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`assignment-${a.id}`}>
            <span><span className="block font-semibold">{a.therapist}{a.isLead ? ' · lead' : ''}</span><span className="text-[13px] text-brand-inkMuted">{serviceLabel(a.service)}{a.title ? ` · ${a.title}` : ''}</span></span>
            {manage && <Button size="sm" variant="ghost" onClick={() => void run(() => opsApi.endAssignment(centerId, child.id, a.id), 'Assignment ended. Their future visits with this child were cancelled.')} data-testid={`assignment-end-${a.id}`}>End assignment</Button>}
          </li>
        ))}
      </ul>
      <Dialog open={referentOpen} onClose={() => setReferentOpen(false)} title="Child-wide care referent" testId="referent-dialog"
        footer={<><Button variant="secondary" onClick={() => setReferentOpen(false)}>Cancel</Button>
          <Button data-testid="referent-save" disabled={referentReason.trim().length < 3}
            onClick={() => void (async () => {
              if (await run(() => opsApi.designateReferent(centerId, child.id, {
                membershipId: referentMember || null, version: child.version, reason: referentReason.trim(),
              }), 'Child-wide referent designation saved. No clinical access changed.')) setReferentOpen(false);
            })()}>Save designation</Button></>}>
        <div className="space-y-3">
          <p className="text-[13px] text-brand-inkMuted">Only an existing active assigned therapist may be selected. You can clear the designation, but must document the change.</p>
          <SelectField label="Referent" value={referentMember} onChange={setReferentMember}
            testId="referent-therapist-select" options={[
              { value: '', label: 'No child-wide referent' },
              ...active.filter(a => therapists.some(m => m.membershipId === a.membershipId && m.specialties.includes(a.service))).filter((a, i, rows) => rows.findIndex(b => b.membershipId === a.membershipId) === i)
                .map(a => ({ value: a.membershipId, label: a.therapist })),
            ]}/>
          <ReasonField label="Reason (audit history)" value={referentReason} onChange={setReferentReason} testId="referent-reason"/>
        </div>
      </Dialog>
      <Dialog open={open} onClose={() => setOpen(false)} title="Assign a therapist" testId="assign-dialog"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button data-testid="assign-save" onClick={() => void (async () => { if (f.membershipId && await run(() => opsApi.assign(centerId, child.id, f), 'Therapist assigned.')) setOpen(false); })()}>Assign</Button></>}>
        <div className="space-y-4">
          <SelectField label="Service" value={f.service} onChange={(service) => setF({ ...f, service, membershipId: '' })} testId="assign-service-select" options={child.services.map((s) => ({ value: s, label: serviceLabel(s) }))} />
          <SelectField label="Therapist" value={f.membershipId} onChange={(membershipId) => setF({ ...f, membershipId })} testId="assign-therapist-select" options={[{ value: '', label: qualified.length ? 'Choose a therapist' : 'No therapist lists this specialty' }, ...qualified.map((t) => ({ value: t.membershipId, label: t.displayName }))]} />
          <p className="text-[13px] text-brand-inkMuted">Only active therapists whose profile lists {serviceLabel(f.service).toLowerCase()} are shown.</p>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="h-4 w-4 accent-[#0F5692]" checked={f.isLead} onChange={(e) => setF({ ...f, isLead: e.target.checked })} data-testid="assign-lead-checkbox" /> Lead therapist for this service</label>
        </div>
      </Dialog>
    </Card>
  );
}

function ChildPage({ id, session, onError }: { id: string; session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const manage = session.permissions.includes('center.children.manage');
  const fetcher = useCallback(() => opsApi.child(centerId, id), [centerId, id]);
  const { data: child, failed, reload } = useLoad(fetcher, onError);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [booking, setBooking] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [reason, setReason] = useState('');
  const [archiveErr, setArchiveErr] = useState<string | null>(null);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('registered')) setNotice({ tone: 'success', text: 'Child registered. Next: add a guardian and assign a therapist.' }); }, []);
  if (failed) return <ErrorState onRetry={() => void reload()} testId="child-error" />;
  if (!child) return <Card className="p-5"><SkeletonRows rows={5} testId="child-loading" /></Card>;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setNotice({ tone: 'success', text: ok });
      await reload();
      return true;
    } catch (e) {
      const t = errorText(e, onError);
      if (t) setNotice({ tone: 'danger', text: t });
      return false;
    }
  };
  const ctx = { centerId, child, manage, canDesignate: session.activeContext?.role === 'CENTER_ADMIN', run };
  return (
    <div className="space-y-6">
      <Link href="/app/children" className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-action hover:underline" data-testid="back-to-children"><ArrowLeft size={16} aria-hidden="true" /> Children</Link>
      <PageTitle title={`${child.preferredName ?? child.firstName} ${child.lastName}`} eyebrow={child.status === 'ARCHIVED' ? 'Archived' : undefined} body={`${ageFrom(child.dateOfBirth)} · ${child.services.map(serviceLabel).join(', ')}`} testId="child-title"
        action={session.permissions.includes('center.schedule.manage') && child.status === 'ACTIVE' ? <Button onClick={() => setBooking(true)} data-testid="child-book-button"><CalendarPlus size={17} aria-hidden="true" /> Book appointment</Button> : undefined} />
      {notice && <FormAlert tone={notice.tone} testId={`child-notice-${notice.tone}`}>{notice.text}</FormAlert>}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 md:p-6" testId="child-profile">
            <h2 className="text-[18px] font-semibold">Profile</h2>
            <dl className="mt-3 divide-y divide-border-light">
              <Row label="Legal name">{child.firstName} {child.lastName}</Row>
              <Row label="Date of birth"><span className="tnum">{child.dateOfBirth}</span></Row>
              <Row label="Services">{child.services.map(serviceLabel).join(', ')}</Row>
            </dl>
            {manage && (child.status === 'ACTIVE'
              ? <Button className="mt-3" size="sm" variant="ghost" onClick={() => { setArchiving(true); setReason(''); }} data-testid="child-archive-button">Archive record</Button>
              : <Button className="mt-3" size="sm" variant="secondary" onClick={() => void run(() => opsApi.restoreChild(centerId, child.id), 'Child record restored.')} data-testid="child-restore-button">Restore record</Button>)}
          </Card>
          <Guardians {...ctx} />
          <CareTeam {...ctx} />
          {manage && child.status === 'ACTIVE' && <HandoverProposalPanel centerId={centerId} child={child} />}
          <Card className="p-5 md:p-6" testId="child-appointments">
            <h2 className="text-[18px] font-semibold">Appointments</h2>
            {!child.appointments.length ? <p className="mt-3 text-[14px] text-brand-inkMuted">No appointments yet.</p> : (
              <ul className="mt-3 divide-y divide-border-light">
                {child.appointments.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3" data-testid={`child-appointment-${a.id}`}>
                    <span><span className="block font-semibold">{dayLabel(a.startsAt)}</span><span className="tnum text-[13px] text-brand-inkMuted">{timeRange(a.startsAt, a.endsAt)} · {serviceLabel(a.service)} · {a.therapist}</span></span>
                    <ApptPill a={a} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <HistoryCard events={child.events} testId="child-history" />
      </div>
      <BookDialog centerId={centerId} open={booking} childId={child.id} onClose={() => setBooking(false)} onError={onError} onDone={(m) => { setBooking(false); setNotice({ tone: 'success', text: m }); void reload(); }} />
      <Dialog open={archiving} onClose={() => setArchiving(false)} title="Archive this record" testId="child-archive-dialog"
        footer={<><Button variant="secondary" onClick={() => setArchiving(false)}>Cancel</Button><Button variant="danger" data-testid="child-archive-confirm" onClick={() => void (async () => { if (reason.trim().length < 3) return setArchiveErr('Give a reason of at least 3 characters.'); setArchiveErr(null); if (await run(() => opsApi.archiveChild(centerId, child.id, reason.trim()), 'Record archived. Future appointments were cancelled.')) setArchiving(false); })()}>Archive</Button></>}>
        <p className="mb-3 text-[14px]">Future appointments are cancelled and the care team assignments end. The record stays available under Archived.</p>
        {archiveErr && <div className="mb-3"><FormAlert tone="danger" testId="child-archive-error">{archiveErr}</FormAlert></div>}
        <ReasonField value={reason} onChange={setReason} testId="child-archive-reason" />
      </Dialog>
    </div>
  );
}

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <Workspace active="children" permission="center.children.read" deniedText="Children are visible to center staff.">{(s, onError) => <ChildPage id={id} session={s} onError={onError} />}</Workspace>;
}
