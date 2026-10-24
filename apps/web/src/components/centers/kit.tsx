'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Ban, CheckCircle2, Clock3, History, MailCheck, PauseCircle, Repeat, XCircle } from 'lucide-react';
import { ProductShell } from '@/components/auth/ProductShell';
import { FormAlert } from '@/components/auth/Field';
import { useSession } from '@/components/auth/useSession';
import { formatDate } from '@/components/applications/StatusPill';
import { Card, Pill } from '@/components/design/ui';
import { SkeletonRows } from '@/components/design/states';
import { ROLE_LABELS, type Role, type SessionInfo } from '@/lib/auth';
import type { HistoryEvent, InvitationStatus, MemberStatus } from '@/lib/centers';

export type ShellKey = 'governance' | 'access-review' | 'home' | 'security' | 'applications' | 'centers' | 'setup' | 'team' | 'center' | 'profile' | 'children' | 'schedule' | 'messages' | 'clinical' | 'activities' | 'progress' | 'family-progress' | 'practice' | 'practice-feedback';

// Session gate + permission check + shell, shared by every TB-EM-003/004 screen.
export function Workspace({ active, permission, deniedText, children }: { active: ShellKey; permission: string; deniedText: string; children: (s: SessionInfo, onError: (e: unknown) => void) => ReactNode }) {
  const { state, handle } = useSession();
  if (state.status === 'loading') return <div className="p-8"><SkeletonRows rows={4} testId="session-loading" /></div>;
  if (state.status === 'error') return <div className="p-8"><FormAlert tone="danger" testId="session-error">{state.message}</FormAlert></div>;
  const allowed = permission.split('|').some((p) => state.data.permissions.includes(p));
  return (
    <ProductShell session={state.data} active={active} planned={[]}>
      {allowed ? children(state.data, handle) : <FormAlert tone="danger" testId="page-forbidden">{deniedText}</FormAlert>}
    </ProductShell>
  );
}

// Loads data with a stale-response guard; 401/403/404 are routed by the session handler, other errors show a retry state.
export function useLoad<T>(fetcher: (() => Promise<T>) | null, onError: (e: unknown) => void) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);
  const load = useCallback(async () => {
    if (!fetcher) return;
    const id = ++latest.current;
    setFailed(false);
    try {
      const r = await fetcher();
      if (id === latest.current) setData(r);
    } catch (e) {
      if (id !== latest.current) return;
      try {
        onError(e);
      } catch {
        setFailed(true);
      }
    }
  }, [fetcher, onError]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, setData, failed, reload: load };
}

export const errorText = (e: unknown, onError: (e: unknown) => void): string | null => {
  const status = (e as { status?: number }).status;
  if (status && [400, 409, 410, 422, 429].includes(status)) return (e as Error).message;
  try {
    onError(e);
    return null;
  } catch {
    return (e as Error).message;
  }
};

export function PageTitle({ eyebrow, title, body, action, testId }: { eyebrow?: string; title: string; body?: string; action?: ReactNode; testId: string }) {
  return (
    <div className="tb-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-brand-inkMuted">{eyebrow}</p>}
        <h1 className="mt-1 break-words font-display text-[28px] font-bold leading-tight md:text-[32px]" data-testid={testId}>{title}</h1>
        {body && <p className="mt-1 max-w-2xl text-[15px] text-brand-inkMuted">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[13px] font-medium text-brand-inkMuted">{label}</dt>
      <dd className="min-w-0 break-words text-[15px]">{children}</dd>
    </div>
  );
}

export function ChoiceGroup({ label, options, value, onChange, error, testId, columns = 2 }: { label: string; options: readonly { value: string; label: string; hint?: string }[]; value: string[]; onChange: (v: string[]) => void; error?: string; testId: string; columns?: 2 | 3 }) {
  return (
    <div role="group" aria-label={label} data-testid={testId}>
      <p className="text-[14px] font-medium">{label}</p>
      <div className={`mt-2 grid grid-cols-1 gap-2 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {options.map((o) => (
          <label key={o.value} className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-control border border-border-light px-3 py-2.5 text-[14px] transition-colors hover:bg-surface-subtle has-[:checked]:border-brand-action has-[:checked]:bg-brand-actionTint">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#0F5692]" checked={value.includes(o.value)} data-testid={`${testId}-${o.value}`}
              onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((x) => x !== o.value))} />
            <span className="min-w-0">
              <span className="block font-medium">{o.label}</span>
              {o.hint && <span className="block text-[12px] text-brand-inkMuted">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-[13px] font-medium text-status-danger" data-testid={`${testId}-error`}>{error}</p>}
    </div>
  );
}

export function SelectField({ label, value, onChange, options, testId }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; testId: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={testId} className="block text-[14px] font-medium">{label}</label>
      <select id={testId} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}
        className="block min-h-[48px] w-full rounded-control border border-border-strong bg-surface-white px-3 text-[15px] focus:border-brand-action focus:outline-none focus:ring-[3px] focus:ring-brand-action/20">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

const INVITE_LOOK: Record<InvitationStatus, { tone: 'caution' | 'success' | 'danger' | 'neutral' | 'info'; icon: typeof Clock3; label: string }> = {
  PENDING: { tone: 'info', icon: MailCheck, label: 'Invited' },
  EXPIRED: { tone: 'caution', icon: Clock3, label: 'Expired' },
  ACCEPTED: { tone: 'success', icon: CheckCircle2, label: 'Accepted' },
  REVOKED: { tone: 'danger', icon: XCircle, label: 'Revoked' },
  REPLACED: { tone: 'neutral', icon: Repeat, label: 'Replaced' },
};
export const InvitationPill = ({ status, testId }: { status: InvitationStatus; testId?: string }) => (
  <Pill tone={INVITE_LOOK[status].tone} icon={INVITE_LOOK[status].icon} testId={testId}>{INVITE_LOOK[status].label}</Pill>
);

const MEMBER_LOOK: Record<MemberStatus, { tone: 'success' | 'caution' | 'danger'; icon: typeof Clock3; label: string }> = {
  ACTIVE: { tone: 'success', icon: CheckCircle2, label: 'Active' },
  SUSPENDED: { tone: 'caution', icon: PauseCircle, label: 'Suspended' },
  REVOKED: { tone: 'danger', icon: Ban, label: 'Access revoked' },
};
export const MemberPill = ({ status, testId }: { status: MemberStatus; testId?: string }) => (
  <Pill tone={MEMBER_LOOK[status].tone} icon={MEMBER_LOOK[status].icon} testId={testId}>{MEMBER_LOOK[status].label}</Pill>
);

export const RolePills = ({ roles }: { roles: Role[] }) => (
  <span className="flex flex-wrap gap-1.5">{roles.map((r) => <Pill key={r} tone={r === 'CENTER_ADMIN' ? 'brand' : 'neutral'}>{ROLE_LABELS[r]}</Pill>)}</span>
);

const EVENT_LABELS: Record<string, string> = {
  'center.created': 'Center created', 'center.updated': 'Center details updated', 'setup.step_completed': 'Setup step completed',
  'invitation.created': 'Invitation sent', 'invitation.resent': 'Invitation resent', 'invitation.revoked': 'Invitation revoked',
  'invitation.replaced': 'Invitation replaced', 'invitation.accepted': 'Invitation accepted',
  'member.updated': 'Roles or profile changed', 'member.profile_updated': 'Profile updated', 'member.suspended': 'Access suspended',
  'member.reactivated': 'Access reactivated', 'member.revoked': 'Access revoked',
  'trial.extended': 'Trial extended', 'child.registered': 'Child registered', 'child.updated': 'Child details updated', 'child.archived': 'Record archived',
  'child.restored': 'Record restored', 'child.referent_changed': 'Child-wide referent changed', 'guardian.added': 'Guardian added', 'guardian.removed': 'Guardian removed', 'assignment.started': 'Therapist assigned',
  'assignment.ended': 'Assignment ended', 'appointment.scheduled': 'Appointment booked', 'appointment.rescheduled': 'Appointment moved',
  'appointment.cancelled': 'Appointment cancelled', 'appointment.completed': 'Attendance recorded', 'appointment.no_show': 'No-show recorded',
};

export function HistoryCard({ events, testId }: { events: HistoryEvent[]; testId: string }) {
  return (
    <Card className="p-5 md:p-6" testId={testId}>
      <h2 className="flex items-center gap-2 text-[18px] font-semibold"><History size={18} aria-hidden="true" /> History</h2>
      {events.length === 0 ? <p className="mt-3 text-[14px] text-brand-inkMuted">Nothing recorded yet.</p> : (
        <ol className="mt-4 space-y-4 border-l-2 border-border-light pl-4">
          {events.map((e) => (
            <li key={e.id} className="relative" data-testid={`${testId}-${e.type}`}>
              <span aria-hidden="true" className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-surface-white bg-brand-action" />
              <p className="text-[14px] font-semibold">{EVENT_LABELS[e.type] ?? e.type}{typeof e.meta?.invitee === 'string' ? ` · ${e.meta.invitee}` : ''}</p>
              <p className="tnum text-[13px] text-brand-inkMuted">{formatDate(e.createdAt)}{e.actor ? ` · by ${e.actor}` : ''}</p>
              {typeof e.meta?.reason === 'string' && <p className="mt-1 break-words text-[14px]">“{e.meta.reason}”</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function ReasonField({ value, onChange, testId, label = 'Reason (kept in the history)' }: { value: string; onChange: (v: string) => void; testId: string; label?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={testId} className="block text-[14px] font-medium">{label}</label>
      <textarea id={testId} rows={3} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}
        className="block w-full rounded-control border border-border-strong bg-surface-white px-3.5 py-3 text-[15px] focus:border-brand-action focus:outline-none focus:ring-[3px] focus:ring-brand-action/20" />
    </div>
  );
}
