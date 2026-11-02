import { rest } from './auth';

export type Choice = 'COMPLETED' | 'NEEDED_HELP' | 'NOT_COMPLETED' | 'SKIPPED';
export type SlotStatus = Choice | 'PENDING' | 'UPCOMING';
export interface Slot { date: string; status: SlotStatus; outcomeId: string | null; recordable: boolean }
export interface PracticeActivity { id: string; title: string; service: string; ageBand: string; minutes: number; materials: string[]; steps: string[]; safety: string[]; frequency: string; slots: Slot[] }
export interface PracticeWeek {
  sample: true; released: false; today: string; week: { start: string; days: string[] }; choices: Choice[];
  gates: { practiceDemo: boolean; clinicalPlanRelease: false; freeText: false; media: false; consentDependent: false };
  children: { id: string; name: string; activities: PracticeActivity[] }[];
}
export interface Outcome { id: string; choice: Choice; practiceDate: string; recordedAt: string; replayed?: boolean; synthetic: true }
export interface HistoryItem { id: string; childId: string; childName: string; activity: string; practiceDate: string; choice: Choice; recordedAt: string; seenByCareTeam: boolean }
export interface FeedbackItem { id: string; childId: string; childName: string; activity: string; templateId: string; service: string; practiceDate: string; choice: Choice; recordedAt: string; guardian: string; relationship: string; guardianAccessRemoved: boolean; acknowledgedAt: string | null; acknowledgedBy: string | null }
export interface Feedback { synthetic: true; notClinical: true; canAcknowledge: boolean; children: { id: string; name: string }[]; activities: { id: string; title: string }[]; counts: { total: number; new: number }; items: FeedbackItem[] }

export type HomePlanRequestStatus = 'PENDING' | 'ACKNOWLEDGED' | 'CLOSED_UNAVAILABLE';
export interface HomePlanRequestView {
  id: string; childId: string; service: string; status: HomePlanRequestStatus;
  createdAt: string; respondedAt: string | null;
  synthetic: true; released: false; clinicalAuthorization: false;
  replayed?: boolean; childName?: string;
}
export interface GuardianPlanRequests {
  synthetic: true; released: false; enabled: boolean;
  children: { id: string; name: string; services: string[] }[];
  items: HomePlanRequestView[];
}
export interface ClinicianPlanRequests {
  synthetic: true; released: false; enabled: boolean;
  items: HomePlanRequestView[];
}
export const HOME_REQUEST_STATUS: Record<HomePlanRequestStatus, string> = {
  PENDING: 'Awaiting care-team acknowledgement',
  ACKNOWLEDGED: 'Received by care team (no plan shared)',
  CLOSED_UNAVAILABLE: 'Closed — plan not available',
};

export const CHOICE_LABEL: Record<SlotStatus, string> = { COMPLETED: 'Completed', NEEDED_HELP: 'Needed help', NOT_COMPLETED: 'Not completed', SKIPPED: 'Skipped', PENDING: 'Not recorded yet', UPCOMING: 'Coming up' };
export const CHOICE_TONE: Record<SlotStatus, 'success' | 'info' | 'caution' | 'neutral'> = { COMPLETED: 'success', NEEDED_HELP: 'info', NOT_COMPLETED: 'caution', SKIPPED: 'neutral', PENDING: 'caution', UPCOMING: 'neutral' };

const c = (centerId: string, p: string) => `/api/centers/${centerId}/${p}`;
const qs = (q: Record<string, string | undefined>) => new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString();
export const practiceApi = {
  guardianPlanRequests: (centerId: string) => rest.get<GuardianPlanRequests>(c(centerId,'family/home-plan-requests')),
  requestHomePlan: (centerId: string, body: { childId: string; service: string; requestKey: string }) =>
    rest.send<HomePlanRequestView>('POST',c(centerId,'family/home-plan-requests'),body),
  clinicianPlanRequests: (centerId: string) => rest.get<ClinicianPlanRequests>(c(centerId,'clinical/home-plan-requests')),
  respondHomePlan: (centerId: string, id: string, status: 'ACKNOWLEDGED' | 'CLOSED_UNAVAILABLE') =>
    rest.send<HomePlanRequestView>('POST',c(centerId,`clinical/home-plan-requests/${id}/respond`),{status}),
  week: (centerId: string, week?: string) => rest.get<PracticeWeek>(c(centerId, `family/practice${week ? `?week=${week}` : ''}`)),
  history: (centerId: string, childId?: string) => rest.get<{ items: HistoryItem[] }>(c(centerId, `family/practice/history${childId ? `?childId=${childId}` : ''}`)),
  record: (centerId: string, body: { childId: string; templateId: string; practiceDate: string; choice: Choice; idempotencyKey: string }) => rest.send<Outcome>('POST', c(centerId, 'family/practice/outcomes'), body),
  byKey: (centerId: string, key: string) => rest.get<Outcome>(c(centerId, `family/practice/outcomes/${key}`)),
  inbox: (centerId: string, q: { childId?: string; templateId?: string; choice?: string; status?: string; from?: string; to?: string }) => rest.get<Feedback>(c(centerId, `clinical/practice-feedback?${qs(q)}`)),
  acknowledge: (centerId: string, id: string) => rest.send<{ id: string; acknowledgedAt: string; already: boolean }>('POST', c(centerId, `clinical/practice-feedback/${id}/acknowledge`)),
};
export const dayName = (d: string, style: 'short' | 'long' = 'short') => new Date(`${d}T12:00:00Z`).toLocaleDateString([], { weekday: style, day: 'numeric', month: 'short', timeZone: 'UTC' });
