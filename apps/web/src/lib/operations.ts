import { rest } from './auth';

export interface Trial { onTrial: boolean; endsAt: string | null; expired: boolean; daysLeft: number | null; therapistSeats: { used: number; limit: number }; children: { used: number; limit: number } }
export interface Appointment {
  id: string; childId: string; child: string; childFull: string; membershipId: string; therapist: string; service: string;
  startsAt: string; endsAt: string; room: string | null; status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'; statusReason: string | null; version: number;
}
export interface ChildRow { id: string; firstName: string; lastName: string; preferredName: string | null; dateOfBirth: string; services: string[]; status: 'ACTIVE' | 'ARCHIVED'; guardians: number; nextAppointment: string | null; team: { service: string; name: string }[] }
export interface Guardian { id: string; displayName: string; relationship: string; isPrimary: boolean; portalStatus: 'CONNECTED' | 'NOT_INVITED' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED' | 'REPLACED'; email?: string }
export interface Assignment { id: string; membershipId: string; therapist: string; title: string | null; service: string; isLead: boolean; startedAt: string; endedAt: string | null }
export interface ChildDetail {
  id: string; firstName: string; lastName: string; preferredName: string | null; dateOfBirth: string; services: string[]; status: 'ACTIVE' | 'ARCHIVED'; version: number;
  guardians: Guardian[]; assignments: Assignment[]; appointments: (Omit<Appointment, 'child' | 'childFull' | 'childId' | 'statusReason'>)[];
  events: { id: number; type: string; actor: string | null; subject: string | null; meta: Record<string, unknown>; createdAt: string }[];
}
export interface ChildInput { firstName: string; lastName: string; preferredName?: string; dateOfBirth: string; services: string[] }
export interface Therapist { membershipId: string; displayName: string; title: string | null; specialties: string[] }
export interface Dashboard { dayStart: string; timezone: string; today: Appointment[]; counts: { activeChildren: number; unassigned: number; noGuardian: number; therapists: number; pendingInvites: number; upcomingWeek: number }; trial: Trial }
export interface FamilyOverview {
  center: { name: string; timezone: string };
  children: { id: string; name: string; fullName: string; relationship: string; team: { name: string; title: string | null; service: string; isLead: boolean }[]; upcoming: { id: string; startsAt: string; endsAt: string; service: string; room: string | null; therapist: string }[] }[];
}

export const RELATIONSHIPS = [
  { value: 'mother', label: 'Mother' }, { value: 'father', label: 'Father' }, { value: 'parent', label: 'Parent' }, { value: 'grandparent', label: 'Grandparent' },
  { value: 'legal_guardian', label: 'Legal guardian' }, { value: 'foster_parent', label: 'Foster parent' }, { value: 'other', label: 'Other' },
];

const c = (centerId: string, path: string) => `/api/centers/${centerId}/${path}`;
const qs = (p: Record<string, string | undefined>) => new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();

export const opsApi = {
  trial: (centerId: string) => rest.get<Trial>(c(centerId, 'trial')),
  platformTrial: (centerId: string) => rest.get<Trial>(`/api/platform/centers/${centerId}/trial`),
  extendTrial: (centerId: string, days: number, reason: string) => rest.send<Trial>('POST', `/api/platform/centers/${centerId}/trial/extend`, { days, reason }),
  dashboard: (centerId: string) => rest.get<Dashboard>(c(centerId, 'dashboard')),
  family: (centerId: string) => rest.get<FamilyOverview>(c(centerId, 'family')),
  therapists: (centerId: string) => rest.get<{ items: Therapist[] }>(c(centerId, 'therapists')),
  children: (centerId: string, q: { q?: string; status?: string }) => rest.get<{ items: ChildRow[] }>(`${c(centerId, 'children')}?${qs(q)}`),
  createChild: (centerId: string, body: ChildInput) => rest.send<{ id: string }>('POST', c(centerId, 'children'), body),
  child: (centerId: string, id: string) => rest.get<ChildDetail>(c(centerId, `children/${id}`)),
  updateChild: (centerId: string, id: string, body: Partial<ChildInput> & { version: number }) => rest.send<ChildDetail>('PATCH', c(centerId, `children/${id}`), body),
  archiveChild: (centerId: string, id: string, reason: string) => rest.send<ChildDetail>('POST', c(centerId, `children/${id}/archive`), { reason }),
  restoreChild: (centerId: string, id: string) => rest.send<ChildDetail>('POST', c(centerId, `children/${id}/restore`)),
  addGuardian: (centerId: string, id: string, body: { displayName: string; email: string; relationship: string; isPrimary: boolean; invite: boolean }) =>
    rest.send<{ id: string; connected: boolean; invited: boolean }>('POST', c(centerId, `children/${id}/guardians`), body),
  inviteGuardian: (centerId: string, id: string, linkId: string) => rest.send('POST', c(centerId, `children/${id}/guardians/${linkId}/invite`)),
  removeGuardian: (centerId: string, id: string, linkId: string, reason: string) => rest.send('POST', c(centerId, `children/${id}/guardians/${linkId}/remove`), { reason }),
  assign: (centerId: string, id: string, body: { membershipId: string; service: string; isLead: boolean }) => rest.send('POST', c(centerId, `children/${id}/assignments`), body),
  endAssignment: (centerId: string, id: string, aid: string) => rest.send('POST', c(centerId, `children/${id}/assignments/${aid}/end`)),
  appointments: (centerId: string, q: { from: string; to: string; membershipId?: string; childId?: string }) => rest.get<{ items: Appointment[] }>(`${c(centerId, 'appointments')}?${qs(q)}`),
  book: (centerId: string, body: { childId: string; membershipId: string; service: string; startsAt: string; endsAt: string; room?: string }) => rest.send<{ id: string }>('POST', c(centerId, 'appointments'), body),
  reschedule: (centerId: string, id: string, body: { startsAt: string; endsAt: string; version: number; room?: string }) => rest.send('PATCH', c(centerId, `appointments/${id}`), body),
  setStatus: (centerId: string, id: string, status: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW', reason?: string) => rest.send('POST', c(centerId, `appointments/${id}/status`), { status, ...(reason ? { reason } : {}) }),
};

export const timeRange = (startsAt: string, endsAt: string) => {
  const f = (s: string) => new Date(s).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${f(startsAt)}–${f(endsAt)}`;
};
export const dayLabel = (s: string) => new Date(s).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
export const ageFrom = (dob: string) => {
  const d = new Date(`${dob}T00:00:00`);
  const n = new Date();
  const months = (n.getFullYear() - d.getFullYear()) * 12 + n.getMonth() - d.getMonth() - (n.getDate() < d.getDate() ? 1 : 0);
  return months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`;
};
