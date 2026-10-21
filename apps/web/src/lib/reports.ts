import { rest } from './auth';

export type GoalStatus = 'none' | 'insufficient' | 'recorded';
export interface Point { date: string; value: number; note?: string | null }
export interface GoalEvidence { key: string; title: string; measure: string; baseline: number; target: number; points: Point[]; prior: Point | null; status: GoalStatus }
export interface Evidence {
  period: { from: string; to: string };
  assessments: { id: string; assessedOn: string; summary: string }[];
  plan: { id: string; title: string; versionNumber: number; status: string } | null;
  goals: GoalEvidence[];
  sessions: { drafts: number; completedVisits: number };
}
export interface Dashboard {
  synthetic: true; period: { from: string; to: string };
  children: { id: string; name: string; services: string[] }[];
  goals: (GoalEvidence & { childId: string; childName: string; service: string; planTitle: string })[];
  summary: { goals: number; recorded: number; insufficient: number; none: number };
}
export interface ReviewNote { byName: string; at: string; comment: string; kind: 'comment' | 'returned' }
export interface ReportRow { id: string; title: string; service: string; periodStart: string; periodEnd: string; status: 'DRAFT' | 'IN_REVIEW'; versions: number; author: string; mine: boolean; updatedAt: string }
export interface ReportDetail {
  synthetic: true; locked: string; released: false; canEdit: boolean; canReview: boolean; evidence: Evidence;
  report: { id: string; childId: string; childName: string; title: string; service: string; periodStart: string; periodEnd: string; status: 'DRAFT' | 'IN_REVIEW'; sections: Record<string, string>; reviewNotes: ReviewNote[]; version: number; author: string; mine: boolean; updatedAt: string };
  versions: { id: string; number: number; kind: 'CREATED' | 'SAVED' | 'SUBMITTED'; author: string; createdAt: string }[];
}
export interface ReportVersion { id: string; number: number; kind: string; sections: Record<string, string>; evidence: Evidence; author: string; createdAt: string }
export interface FamilyProgress { childName: string; service: string; period: { from: string; to: string }; message: string; goals: { title: string; measure: string; baseline: number; target: number; status: GoalStatus; points: Point[] }[]; sample?: boolean; preview?: boolean; released: false }

export const SECTIONS = [
  ['summary', 'Clinician summary', 'Your own interpretation. Required before review.'],
  ['assessment', 'Assessment summary', 'Started from the recorded assessment summaries.'],
  ['goals', 'Goals and recorded progress', 'Started from recorded observations only.'],
  ['sessions', 'Sessions', 'Started from session drafts and completed visits in the period.'],
  ['recommendations', 'Recommendations', 'Your own recommendations.'],
  ['familySummary', 'Family-friendly summary', 'Shown in the future family format. Not shared with anyone yet.'],
] as const;
export const KIND_LABEL: Record<string, string> = { CREATED: 'Started', SAVED: 'Saved version', SUBMITTED: 'Sent for review' };

const c = (centerId: string, p: string) => `/api/centers/${centerId}/${p}`;
const qs = (q: Record<string, string | undefined>) => new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][]).toString();
export const reportsApi = {
  dashboard: (centerId: string, q: { childId?: string; service?: string; from?: string; to?: string }) => rest.get<Dashboard>(c(centerId, `clinical/progress?${qs(q)}`)),
  list: (centerId: string, childId: string) => rest.get<{ items: ReportRow[] }>(c(centerId, `clinical/children/${childId}/reports`)),
  create: (centerId: string, childId: string, body: { service: string; title: string; periodStart: string; periodEnd: string }) => rest.send<{ id: string }>('POST', c(centerId, `clinical/children/${childId}/reports`), body),
  detail: (centerId: string, id: string) => rest.get<ReportDetail>(c(centerId, `clinical/reports/${id}`)),
  autosave: (centerId: string, id: string, sections: Record<string, string>, version: number) => rest.send<{ version: number; savedAt: string }>('PATCH', c(centerId, `clinical/reports/${id}`), { sections, version }),
  saveVersion: (centerId: string, id: string, version: number) => rest.send<{ number: number; version: number }>('POST', c(centerId, `clinical/reports/${id}/versions`), { version }),
  submit: (centerId: string, id: string, version: number) => rest.send<{ number: number; version: number }>('POST', c(centerId, `clinical/reports/${id}/submit`), { version }),
  comment: (centerId: string, id: string, comment: string) => rest.send('POST', c(centerId, `clinical/reports/${id}/comments`), { comment }),
  giveBack: (centerId: string, id: string, comment: string) => rest.send('POST', c(centerId, `clinical/reports/${id}/return`), { comment }),
  version: (centerId: string, id: string) => rest.get<ReportVersion>(c(centerId, `clinical/report-versions/${id}`)),
  familyPreview: (centerId: string, id: string) => rest.get<FamilyProgress>(c(centerId, `clinical/reports/${id}/family-preview`)),
  familyDemo: (centerId: string) => rest.get<FamilyProgress>(c(centerId, 'family/progress-demo')),
};
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86_400_000));
