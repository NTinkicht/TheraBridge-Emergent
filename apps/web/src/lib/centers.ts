import { rest, type Role, type SessionInfo } from './auth';

export type InvitationStatus = 'PENDING' | 'EXPIRED' | 'ACCEPTED' | 'REVOKED' | 'REPLACED';
export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
export type StaffRole = 'COORDINATOR' | 'THERAPIST' | 'CLINICAL_SUPERVISOR';

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string; hint: string }[] = [
  { value: 'COORDINATOR', label: 'Coordinator', hint: 'Sees the team directory and helps run the center day to day.' },
  { value: 'THERAPIST', label: 'Therapist', hint: 'Works on assigned child and specialty-scoped clinical drafts, session notes and reports; signing and release stay locked.' },
  { value: 'CLINICAL_SUPERVISOR', label: 'Clinical supervisor', hint: 'Oversees clinical quality. Sign-off powers stay locked until a clinical policy is approved.' },
];
export const RESPONSIBILITY_OPTIONS = [
  { value: 'intake', label: 'Intake' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'family_liaison', label: 'Family liaison' },
  { value: 'supervision', label: 'Supervision' },
  { value: 'training', label: 'Training' },
  { value: 'quality', label: 'Quality' },
] as const;
export const ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Casablanca', 'Asia/Dubai', 'Australia/Sydney', 'UTC'];
export const SETUP_LABELS: Record<string, { title: string; body: string; href?: string; cta: string }> = {
  center_details: { title: 'Confirm your center details', body: 'Check the name, location, time zone and services your team will see.', href: '/app/center', cta: 'Review details' },
  your_profile: { title: 'Complete your profile', body: 'Add your title and contact number so your team knows who you are.', href: '/app/profile', cta: 'Open profile' },
  invite_team: { title: 'Invite your team', body: 'Invite coordinators, therapists and clinical supervisors. Each person activates their own account.', href: '/app/team?invite=1', cta: 'Invite people' },
  review_permissions: { title: 'Review who can do what', body: 'Read the role summary below. Clinical sign-off stays locked for everyone until a clinical policy is approved.', cta: 'Mark as reviewed' },
};

export interface Invitation {
  id: string; kind: 'FIRST_ADMIN' | 'STAFF'; email: string; displayName: string; roles: Role[]; specialties: string[]; responsibilities: string[];
  title: string | null; status: InvitationStatus; expiresAt: string; sendCount: number; lastSentAt: string; createdAt: string; acceptedAt: string | null; revokedAt: string | null;
}
export interface HistoryEvent { id: number; type: string; actor: string | null; subject: string | null; meta: Record<string, unknown>; createdAt: string }
export interface CenterListItem {
  id: string; name: string; slug: string; city: string | null; country: string | null; status: 'ACTIVE' | 'SUSPENDED'; source: 'APPLICATION' | 'DIRECT';
  createdAt: string; activeMembers: number; setup: { done: number; total: number }; adminStatus: 'ACTIVE' | 'INVITED' | 'EXPIRED' | 'NONE';
}
export interface CenterDetail {
  id: string; name: string; slug: string; status: string; timezone: string; country: string | null; city: string | null; specialties: string[];
  source: 'APPLICATION' | 'DIRECT'; application: { id: string; reference: string } | null; createdAt: string; version: number;
  admins: { membershipId: string; displayName: string; email: string; status: MemberStatus; joinedAt: string }[];
  adminInvitations: Invitation[]; stats: { activeMembers: number; pendingStaffInvites: number };
  setup: { key: string; completedAt: string | null }[]; events: HistoryEvent[];
}
export interface CenterInput { name: string; slug?: string; timezone: string; country: string; city: string; specialties: string[]; applicationId?: string; firstAdmin: { email: string; displayName: string } }
export interface CenterSettings { id: string; name: string; slug: string; timezone: string; country: string | null; city: string | null; specialties: string[]; status: string; version: number }
export interface Member {
  id: string; userId: string; displayName: string; email: string; status: MemberStatus; roles: Role[]; title: string | null; phone: string | null;
  specialties: string[]; responsibilities: string[]; statusReason: string | null; statusChangedAt: string | null; joinedAt: string;
}
export interface MemberList { total: number; page: number; pageSize: number; items: Member[]; counts: Partial<Record<MemberStatus, number>> }
export interface SetupState { steps: { key: string; manual: boolean; completedAt: string | null; completedBy: string | null }[]; done: number; total: number; activeMembers: number; invitationsSent: number }
export type InvitePreview =
  | { status: 'PENDING'; kind: 'FIRST_ADMIN' | 'STAFF'; centerName: string; email: string; displayName: string; roles: Role[]; title: string | null; expiresAt: string; accountExists: boolean }
  | { status: 'EXPIRED' | 'ACCEPTED' | 'REVOKED' | 'REPLACED' | 'UNAVAILABLE' };
export interface ProfileInput { displayName?: string; title?: string; phone?: string; specialties?: string[]; responsibilities?: string[] }

const qs = (p: Record<string, string | number | undefined>) => new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();
const c = (centerId: string, path: string) => `/api/centers/${centerId}/${path}`;
const p = (centerId: string, path = '') => `/api/platform/centers/${centerId}${path}`;

export const centersApi = {
  list: (q: { q?: string; status?: string; page?: number }) => rest.get<{ total: number; page: number; pageSize: number; items: CenterListItem[] }>(`/api/platform/centers?${qs(q)}`),
  create: (body: CenterInput) => rest.send<CenterDetail>('POST', '/api/platform/centers', body),
  detail: (id: string) => rest.get<CenterDetail>(p(id)),
  inviteAdmin: (id: string, body: { email: string; displayName: string }) => rest.send<Invitation>('POST', p(id, '/admin-invitations'), body),
  adminInvitation: (id: string, invId: string, action: 'resend' | 'revoke') => rest.send<Invitation>('POST', p(id, `/admin-invitations/${invId}/${action}`)),
  replaceAdmin: (id: string, invId: string, body: { email: string; displayName: string }) => rest.send<Invitation>('POST', p(id, `/admin-invitations/${invId}/replace`), body),

  settings: (centerId: string) => rest.get<CenterSettings>(c(centerId, 'settings')),
  updateSettings: (centerId: string, body: Partial<CenterSettings> & { version: number }) => rest.send<CenterSettings>('PATCH', c(centerId, 'settings'), body),
  setup: (centerId: string) => rest.get<SetupState>(c(centerId, 'setup')),
  completeStep: (centerId: string, key: string) => rest.send<SetupState>('POST', c(centerId, `setup/${key}/complete`)),
  staff: (centerId: string, q: { q?: string; role?: string; status?: string; specialty?: string; page?: number }) => rest.get<MemberList>(`${c(centerId, 'staff')}?${qs(q)}`),
  member: (centerId: string, id: string) => rest.get<Member & { events: HistoryEvent[] }>(c(centerId, `staff/${id}`)),
  updateMember: (centerId: string, id: string, body: ProfileInput & { roles?: StaffRole[] }) => rest.send<Member & { events: HistoryEvent[] }>('PATCH', c(centerId, `staff/${id}`), body),
  memberStatus: (centerId: string, id: string, action: 'suspend' | 'reactivate' | 'revoke', reason?: string) =>
    rest.send<Member & { events: HistoryEvent[] }>('POST', c(centerId, `staff/${id}/${action}`), reason ? { reason } : {}),
  invitations: (centerId: string) => rest.get<{ items: Invitation[] }>(c(centerId, 'invitations')),
  inviteStaff: (centerId: string, body: { email: string; displayName: string; roles: StaffRole[]; title?: string; specialties?: string[]; responsibilities?: string[] }) =>
    rest.send<Invitation>('POST', c(centerId, 'invitations'), body),
  staffInvitation: (centerId: string, id: string, action: 'resend' | 'revoke') => rest.send<Invitation>('POST', c(centerId, `invitations/${id}/${action}`)),
  me: (centerId: string) => rest.get<Member>(c(centerId, 'me')),
  updateMe: (centerId: string, body: ProfileInput) => rest.send<Member>('PATCH', c(centerId, 'me'), body),

  inspectInvite: (token: string) => rest.publicPost<InvitePreview>('/api/invitations/inspect', { token }),
  acceptNew: async (token: string, displayName: string, password: string) => rest.remember(await rest.publicPost<SessionInfo>('/api/invitations/accept-new', { token, displayName, password })),
  acceptExisting: async (token: string) => rest.remember(await rest.send<SessionInfo>('POST', '/api/invitations/accept', { token })),
};
