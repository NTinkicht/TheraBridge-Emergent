import { rest } from './auth';

export interface Trial { onTrial: boolean; endsAt: string | null; expired: boolean; daysLeft: number | null; therapistSeats: { used: number; limit: number }; children: { used: number; limit: number } }
export interface Appointment {
  id: string; childId: string; child: string; childFull: string; membershipId: string; therapist: string; service: string;
  startsAt: string; endsAt: string; room: string | null; status: ApptStatus; statusReason: string | null; version: number;
  seriesId: string | null; isException: boolean; reminderSentAt: string | null;
}
export type ApptStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export interface Series {
  id: string; childId: string; membershipId: string; service: string; room: string | null; startTime: string; durationMinutes: number; weekdays: number[];
  intervalWeeks: number; startDate: string; untilDate: string; status: 'ACTIVE' | 'ENDED'; version: number; occurrences: Appointment[];
}
export interface SeriesInput { childId: string; membershipId: string; service: string; room?: string; startDate: string; startTime: string; durationMinutes: number; weekdays: number[]; intervalWeeks: number; untilDate?: string; count?: number; skipConflicts?: boolean }
export interface Clash { date: string; reason: string }
export interface FamilyVisit { id: string; startsAt: string; endsAt: string; service: string; room: string | null; therapist: string; status: ApptStatus; changed: boolean; recurring: boolean }
export interface ChildRow { id: string; firstName: string; lastName: string; preferredName: string | null; dateOfBirth: string; services: string[]; status: 'ACTIVE' | 'ARCHIVED'; guardians: number; nextAppointment: string | null; team: { service: string; name: string }[] }
export interface Guardian { id: string; displayName: string; relationship: string; isPrimary: boolean; portalStatus: 'CONNECTED' | 'NOT_INVITED' | 'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED' | 'REPLACED'; email?: string }
export interface Assignment { id: string; membershipId: string; therapist: string; title: string | null; service: string; isLead: boolean; startedAt: string; endedAt: string | null }
export interface ChildDetail {
  id: string; firstName: string; lastName: string; preferredName: string | null; dateOfBirth: string; services: string[]; status: 'ACTIVE' | 'ARCHIVED'; version: number;
  referent: { membershipId: string; displayName: string } | null; referentRevision: number; referentStatus: 'NOT_DESIGNATED' | 'ACTIVE' | 'UNAVAILABLE';
  guardians: Guardian[]; assignments: Assignment[]; appointments: (Omit<Appointment, 'child' | 'childFull' | 'childId' | 'statusReason'>)[];
  events: { id: number; type: string; actor: string | null; subject: string | null; meta: Record<string, unknown>; createdAt: string }[];
}
export interface ChildInput { firstName: string; lastName: string; preferredName?: string; dateOfBirth: string; services: string[] }
export type HandoverStatus = 'PENDING_ACK' | 'ACKNOWLEDGED' | 'CANCELLED';
export const HANDOVER_LABELS: Record<HandoverStatus, string> = {
  PENDING_ACK: 'Awaiting incoming therapist receipt',
  ACKNOWLEDGED: 'Receipt acknowledged — assignment unchanged',
  CANCELLED: 'Proposal cancelled — assignment unchanged',
};
export interface HandoverProposal {
  id: string; service: string; status: HandoverStatus; reasonCode: string;
  createdAt: string; childId?: string; fromMembershipId?: string; toMembershipId?: string;
  synthetic: true; accessGranted: false; assignmentChanged: false; clinicalHandover: false; released: false;
}
export interface HandoverInbox { enabled: boolean; synthetic: true; items: HandoverProposal[] }
export interface HandoverReadiness {
  proposalId: string; childId: string; service: string; status: HandoverStatus; checkedAt: string;
  synthetic: true; readonly: true; readyForTransfer: false; assignmentChanged: false;
  accessGranted: false; clinicalHandover: false; released: false;
  checks: { code: string; met: boolean; label: string }[];
}
export interface Therapist { membershipId: string; displayName: string; title: string | null; specialties: string[] }
export interface Dashboard { dayStart: string; timezone: string; today: Appointment[]; counts: { activeChildren: number; unassigned: number; noGuardian: number; therapists: number; pendingInvites: number; upcomingWeek: number }; trial: Trial }
export interface FamilyOverview {
  center: { name: string; timezone: string };
  children: {
    id: string; name: string; fullName: string; relationship: string; remindersEnabled: boolean; team: { name: string; title: string | null; service: string; isLead: boolean }[];
    upcoming: FamilyVisit[]; history: FamilyVisit[]; attendance: { attended: number; noShow: number; cancelled: number; days: number };
  }[];
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
  dashboard: (centerId: string) => rest.get<Dashboard>(c(centerId, 'dashboard')).then((r) => { setCenterTz(r.timezone); return r; }),
  family: (centerId: string) => rest.get<FamilyOverview>(c(centerId, 'family')).then((r) => { setCenterTz(r.center.timezone); return r; }),
  therapists: (centerId: string, options: { offset?: number; limit?: number; service?: string; search?: string; ids?: string } = {}) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) if (value !== undefined && value !== '') query.set(key, String(value));
    return rest.get<{ items: Therapist[]; hasMore: boolean; nextOffset: number | null }>(c(centerId, 'therapists' + (query.size ? '?' + query.toString() : '')));
  },
  children: (centerId: string, q: { q?: string; status?: string }) => rest.get<{ items: ChildRow[] }>(`${c(centerId, 'children')}?${qs(q)}`),
  createChild: (centerId: string, body: ChildInput) => rest.send<{ id: string }>('POST', c(centerId, 'children'), body),
  child: (centerId: string, id: string) => rest.get<ChildDetail & { timezone: string }>(c(centerId, `children/${id}`)).then((r) => { setCenterTz(r.timezone); return r; }),
  updateChild: (centerId: string, id: string, body: Partial<ChildInput> & { version: number }) => rest.send<ChildDetail>('PATCH', c(centerId, `children/${id}`), body),
  archiveChild: (centerId: string, id: string, reason: string) => rest.send<ChildDetail>('POST', c(centerId, `children/${id}/archive`), { reason }),
  restoreChild: (centerId: string, id: string) => rest.send<ChildDetail>('POST', c(centerId, `children/${id}/restore`)),
  addGuardian: (centerId: string, id: string, body: { displayName: string; email: string; relationship: string; isPrimary: boolean; invite: boolean }) =>
    rest.send<{ id: string; connected: boolean; invited: boolean }>('POST', c(centerId, `children/${id}/guardians`), body),
  inviteGuardian: (centerId: string, id: string, linkId: string) => rest.send('POST', c(centerId, `children/${id}/guardians/${linkId}/invite`)),
  removeGuardian: (centerId: string, id: string, linkId: string, reason: string) => rest.send('POST', c(centerId, `children/${id}/guardians/${linkId}/remove`), { reason }),
  handovers: (centerId: string) => rest.get<HandoverInbox>(c(centerId, 'governance/handover-proposals')),
  handoverReadiness: (centerId: string, id: string) =>
    rest.get<HandoverReadiness>(c(centerId, `governance/handover-proposals/${id}/readiness`)),
  proposeHandover: (centerId: string, body: { childId: string; fromMembershipId: string;
    toMembershipId: string; service: string; reasonCode: 'STAFF_CHANGE' | 'AVAILABILITY' | 'FAMILY_REQUEST' }) =>
    rest.send<HandoverProposal>('POST',c(centerId,'governance/handover-proposals'),body),
  acknowledgeHandover: (centerId: string, id: string) =>
    rest.send<HandoverProposal>('POST',c(centerId,`governance/handover-proposals/${id}/acknowledge`),{}),
  cancelHandover: (centerId: string, id: string) =>
    rest.send<HandoverProposal>('POST',c(centerId,`governance/handover-proposals/${id}/cancel`),{}),
  assign: (centerId: string, id: string, body: { membershipId: string; service: string; isLead: boolean }) => rest.send('POST', c(centerId, `children/${id}/assignments`), body),
  endAssignment: (centerId: string, id: string, aid: string) => rest.send('POST', c(centerId, `children/${id}/assignments/${aid}/end`)),
  designateReferent: (centerId: string, id: string, body: { membershipId: string | null; version: number; reason: string }) =>
    rest.send<{ version: number; referentRevision: number }>('PATCH', c(centerId, `children/${id}/referent`), body),
  appointments: (centerId: string, q: { from: string; to: string; membershipId?: string; childId?: string }) => rest.get<{ items: Appointment[]; timezone: string }>(`${c(centerId, 'appointments')}?${qs(q)}`).then((r) => { setCenterTz(r.timezone); return r; }),
  book: (centerId: string, body: { childId: string; membershipId: string; service: string; startsAt: string; endsAt: string; room?: string }) => rest.send<{ id: string }>('POST', c(centerId, 'appointments'), body),
  reschedule: (centerId: string, id: string, body: { startsAt: string; endsAt: string; version: number; room?: string }) => rest.send('PATCH', c(centerId, `appointments/${id}`), body),
  setStatus: (centerId: string, id: string, status: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW', reason?: string) => rest.send('POST', c(centerId, `appointments/${id}/status`), { status, ...(reason ? { reason } : {}) }),
  createSeries: (centerId: string, body: SeriesInput) => rest.send<{ id: string; created: number; skipped: Clash[] }>('POST', c(centerId, 'series'), body),
  series: (centerId: string, id: string) => rest.get<Series>(c(centerId, `series/${id}`)),
  updateSeries: (centerId: string, id: string, body: { fromDate: string; startTime?: string; durationMinutes?: number; room?: string; version: number }) => rest.send<{ updated: number }>('PATCH', c(centerId, `series/${id}`), body),
  cancelSeries: (centerId: string, id: string, fromDate: string, reason: string) => rest.send<{ cancelled: number }>('POST', c(centerId, `series/${id}/cancel`), { fromDate, reason }),
  setReminders: (centerId: string, childId: string, reminders: boolean) => rest.send<{ remindersEnabled: boolean }>('POST', c(centerId, 'family/preferences'), { childId, reminders }),
};

// All times are shown and entered in the center's time zone (set from API responses), not the browser's.
let centerTz: string | undefined;
export const setCenterTz = (tz: string | undefined) => {
  // Clearing the previous center on context change must never leave a stale timezone.
  centerTz = tz;
};
export const getCenterTz = () => centerTz;
const wall = (ms: number, tz?: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
};
const offset = (ms: number, tz?: string) => wall(Math.floor(ms / 60000) * 60000, tz) - Math.floor(ms / 60000) * 60000;
// Same rules as the API: repeated times resolve to the later instant, skipped times move forward.
export function zonedToUtc(date: string, time: string, tz = centerTz): Date {
  if (!tz) throw new Error('Center timezone is unavailable. Refresh the workspace before entering appointment times.');
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const o1 = offset(guess, tz);
  const t1 = guess - o1;
  const o2 = offset(t1, tz);
  if (o1 === o2) return new Date(t1);
  const t2 = guess - o2;
  return new Date(offset(t2, tz) === o2 ? t2 : Math.max(t1, t2));
}
/** Format a server timestamp as HTML datetime-local in the specified care center time zone. */
export function formatZonedDateTimeInput(iso: string | null, tz: string, seconds = false): string {
  if (!iso) return '';
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(iso)).map(part => [part.type, part.value]));
  return fields.year + '-' + fields.month + '-' + fields.day + 'T' + fields.hour + ':' + fields.minute + (seconds ? ':' + fields.second : '');
}

/** Convert center wall-clock time to UTC; never use the browser OS timezone. */
export function zonedDateTimeInputToIso(value: string, tz: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) {
    throw new Error('Enter a valid date and time for this center.');
  }
  const seconds = value.length === 19 ? Number(value.slice(17, 19)) : 0;
  if (seconds > 59) throw new Error('Enter a valid time with seconds below 60.');
  const instant = zonedToUtc(value.slice(0, 10), value.slice(11, 16), tz);
  if (!Number.isFinite(instant.valueOf())) throw new Error('Enter a valid date and time for this center.');
  instant.setUTCSeconds(seconds);
  // The calendar may omit a spring-forward hour. Never silently normalize
  // a clinician-entered local time to a different wall-clock value.
  if (formatZonedDateTimeInput(instant.toISOString(), tz, value.length === 19) !== value) {
    throw new Error('This local time does not exist in the center time zone. Select a valid time.');
  }
  return instant.toISOString();
}

/** An unchanged ambiguous fall-back hour must retain its originally recorded offset. */
export function preservedZonedInstant(value: string, originalIso: string | null, tz: string): string | undefined {
  if (!value) return undefined;
  if (originalIso && formatZonedDateTimeInput(originalIso, tz, true) === value) return originalIso;
  return zonedDateTimeInputToIso(value, tz);
}

export const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const isoWeekday = (day: string) => ((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
// Minutes since local midnight in the center's zone.
export const minutesOfDay = (s: string) => {
  const t = zonedParts(s).time.split(':').map(Number);
  return t[0] * 60 + t[1];
};
export const STATUS_LABEL: Record<ApptStatus, string> = { SCHEDULED: 'Scheduled', COMPLETED: 'Attended', CANCELLED: 'Cancelled', NO_SHOW: 'No-show' };
export const zonedParts = (s: string) => {
  const d = new Date(s);
  return { date: d.toLocaleDateString('en-CA', { timeZone: centerTz }), time: d.toLocaleTimeString('en-GB', { timeZone: centerTz, hour: '2-digit', minute: '2-digit' }) };
};
export const dayKey = (s: string | Date) => new Date(s).toLocaleDateString('en-CA', { timeZone: centerTz });

export const timeRange = (startsAt: string, endsAt: string) => {
  const f = (s: string) => new Date(s).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: centerTz });
  return `${f(startsAt)}–${f(endsAt)}`;
};
export const dayLabel = (s: string) => new Date(s).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', timeZone: centerTz });
export const ageFrom = (dob: string) => {
  const d = new Date(`${dob}T00:00:00`);
  const n = new Date();
  const months = (n.getFullYear() - d.getFullYear()) * 12 + n.getMonth() - d.getMonth() - (n.getDate() < d.getDate() ? 1 : 0);
  return months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`;
};
