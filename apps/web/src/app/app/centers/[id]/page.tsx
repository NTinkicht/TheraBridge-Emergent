'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle2, Circle, MailPlus, RotateCw, UserCog, XCircle } from 'lucide-react';
import { Field, FormAlert, SubmitButton } from '@/components/auth/Field';
import { formatDate } from '@/components/applications/StatusPill';
import { HistoryCard, InvitationPill, MemberPill, PageTitle, Row, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Button, Card } from '@/components/design/ui';
import { Dialog, ErrorState, SkeletonRows } from '@/components/design/states';
import { SPECIALTY_OPTIONS } from '@/lib/auth';
import { SETUP_LABELS, centersApi, type CenterDetail, type Invitation } from '@/lib/centers';
import { TrialCard } from '@/components/operations/TrialCard';

type Mode = { kind: 'new' } | { kind: 'replace'; invitation: Invitation } | null;

function InviteDialog({ center, mode, onClose, onDone, onError }: { center: CenterDetail; mode: Mode; onClose: () => void; onDone: (msg: string) => void; onError: (e: unknown) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { setName(''); setEmail(''); setMsg(null); }, [mode]);
  async function send() {
    if (name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setMsg('Enter a full name and a valid email address.');
    setBusy(true);
    try {
      const body = { displayName: name.trim(), email: email.trim() };
      if (mode?.kind === 'replace') await centersApi.replaceAdmin(center.id, mode.invitation.id, body);
      else await centersApi.inviteAdmin(center.id, body);
      onDone(`Invitation sent to ${body.email}.`);
    } catch (e) {
      setMsg(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={!!mode} onClose={onClose} title={mode?.kind === 'replace' ? 'Replace administrator invitation' : 'Invite a center administrator'} testId="admin-invite-dialog"
      footer={<><Button variant="secondary" onClick={onClose} data-testid="admin-invite-cancel">Cancel</Button><Button onClick={() => void send()} disabled={busy} data-testid="admin-invite-send">{busy ? 'Sending…' : 'Send invitation'}</Button></>}>
      <div className="space-y-4">
        {mode?.kind === 'replace' && <p className="text-[14px] text-brand-inkMuted">The invitation to {mode.invitation.email} stops working immediately.</p>}
        {msg && <FormAlert tone="danger" testId="admin-invite-error">{msg}</FormAlert>}
        <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} testId="admin-invite-name-input" />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} testId="admin-invite-email-input" />
      </div>
    </Dialog>
  );
}

function AdminCard({ center, onChanged, onError }: { center: CenterDetail; onChanged: (msg: string) => void; onError: (e: unknown) => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const open = center.adminInvitations.find((i) => i.status === 'PENDING' || i.status === 'EXPIRED');
  async function act(i: Invitation, action: 'resend' | 'revoke') {
    setBusy(`${action}-${i.id}`);
    setMsg(null);
    try {
      await centersApi.adminInvitation(center.id, i.id, action);
      onChanged(action === 'resend' ? `A new link was sent to ${i.email}. Earlier links no longer work.` : 'The invitation was revoked.');
    } catch (e) {
      setMsg(errorText(e, onError));
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card className="p-5 md:p-6" testId="admin-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[18px] font-semibold"><UserCog size={18} aria-hidden="true" /> Center administrators</h2>
        {!open && <Button size="sm" onClick={() => setMode({ kind: 'new' })} data-testid="invite-admin-button"><MailPlus size={15} aria-hidden="true" /> Invite administrator</Button>}
      </div>
      {msg && <div className="mt-3"><FormAlert tone="danger" testId="admin-action-error">{msg}</FormAlert></div>}
      <ul className="mt-4 space-y-3">
        {center.admins.map((a) => (
          <li key={a.membershipId} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border-light p-3" data-testid={`admin-${a.membershipId}`}>
            <span className="min-w-0"><span className="block break-words font-semibold">{a.displayName}</span><span className="block break-all text-[13px] text-brand-inkMuted">{a.email} · joined {formatDate(a.joinedAt)}</span></span>
            <MemberPill status={a.status} />
          </li>
        ))}
        {center.adminInvitations.map((i) => (
          <li key={i.id} className="rounded-control border border-dashed border-border-strong p-3" data-testid={`admin-invitation-${i.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0"><span className="block break-words font-semibold">{i.displayName}</span><span className="block break-all text-[13px] text-brand-inkMuted">{i.email}</span></span>
              <InvitationPill status={i.status} testId={`admin-invitation-status-${i.id}`} />
            </div>
            <p className="tnum mt-1 text-[12px] text-brand-inkMuted">Sent {i.sendCount}× · last {formatDate(i.lastSentAt)}{i.status === 'PENDING' || i.status === 'EXPIRED' ? ` · ${i.status === 'EXPIRED' ? 'expired' : 'expires'} ${formatDate(i.expiresAt)}` : ''}</p>
            {(i.status === 'PENDING' || i.status === 'EXPIRED') && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => void act(i, 'resend')} data-testid={`admin-invitation-resend-${i.id}`}><RotateCw size={14} aria-hidden="true" /> {busy === `resend-${i.id}` ? 'Sending…' : 'Resend'}</Button>
                <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => setMode({ kind: 'replace', invitation: i })} data-testid={`admin-invitation-replace-${i.id}`}>Replace person</Button>
                <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void act(i, 'revoke')} data-testid={`admin-invitation-revoke-${i.id}`}><XCircle size={14} aria-hidden="true" /> Revoke</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <InviteDialog center={center} mode={mode} onClose={() => setMode(null)} onDone={(m) => { setMode(null); onChanged(m); }} onError={onError} />
    </Card>
  );
}

function Detail({ id, onError }: { id: string; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => centersApi.detail(id), [id]);
  const { data: c, failed, reload } = useLoad(fetcher, onError);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('created')) setNotice('Center created. The first administrator invitation is on its way.'); }, []);
  if (failed) return <ErrorState onRetry={() => void reload()} testId="center-error" />;
  if (!c) return <Card className="p-5"><SkeletonRows rows={5} testId="center-loading" /></Card>;
  const changed = (m: string) => { setNotice(m); void reload(); };
  return (
    <div className="space-y-6">
      <Link href="/app/centers" className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-action hover:underline" data-testid="back-to-centers"><ArrowLeft size={16} aria-hidden="true" /> All centers</Link>
      <PageTitle title={c.name} eyebrow={c.source === 'APPLICATION' ? 'Provisioned from application' : 'Created directly'} body={`${c.city ?? ''}${c.country ? `, ${c.country}` : ''} · ${c.timezone.replace('_', ' ')}`} testId="center-title" />
      {notice && <FormAlert tone="success" testId="center-notice">{notice}</FormAlert>}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-start">
        <div className="min-w-0 space-y-6">
          <TrialCard centerId={c.id} onError={onError} />
          <AdminCard center={c} onChanged={changed} onError={onError} />
          <Card className="p-5 md:p-6" testId="center-config">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold"><Building2 size={18} aria-hidden="true" /> Configuration</h2>
            <dl className="mt-3 divide-y divide-border-light">
              <Row label="Address"><span className="font-mono" data-testid="center-slug">{c.slug}</span></Row>
              <Row label="Status">{c.status === 'ACTIVE' ? 'Active' : 'Suspended'}</Row>
              <Row label="Services">{c.specialties.map((s) => SPECIALTY_OPTIONS.find((o) => o.value === s)?.label ?? s).join(', ') || '—'}</Row>
              <Row label="Application">{c.application ? <Link className="font-mono text-brand-action hover:underline" href={`/app/applications/${c.application.id}`} data-testid="center-application-link">{c.application.reference}</Link> : '—'}</Row>
              <Row label="Members"><span className="tnum">{c.stats.activeMembers} active · {c.stats.pendingStaffInvites} staff invitations pending</span></Row>
              <Row label="Created"><span className="tnum">{formatDate(c.createdAt)}</span></Row>
            </dl>
          </Card>
          <Card className="p-5 md:p-6" testId="center-setup-progress">
            <h2 className="text-[18px] font-semibold">Administrator onboarding</h2>
            <ul className="mt-3 space-y-2">
              {c.setup.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-[14px]" data-testid={`center-setup-${s.key}`}>
                  {s.completedAt ? <CheckCircle2 size={17} className="text-status-success" aria-hidden="true" /> : <Circle size={17} className="text-brand-inkMuted" aria-hidden="true" />}
                  <span className={s.completedAt ? '' : 'text-brand-inkMuted'}>{SETUP_LABELS[s.key]?.title ?? s.key}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <HistoryCard events={c.events} testId="center-history" />
      </div>
    </div>
  );
}

export default function CenterDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <Workspace active="centers" permission="platform.centers.read" deniedText="Centers are managed by TheraBridge platform administrators only.">{(_, onError) => <Detail id={id} onError={onError} />}</Workspace>;
}
