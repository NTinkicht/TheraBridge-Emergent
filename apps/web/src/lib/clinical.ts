import { rest } from './auth';

export interface Goal { key: string; title: string; measure: 'percent' | 'count' | 'level'; baseline: number; target: number }
export interface HomeActivity { templateId: string; frequency: string; note?: string; goalKey?: string; snapshot?: Template & { version: number; capturedAt: string } }
export interface Template { id: string; title: string; service: string; ageBand: string; minutes: number; materials: string[]; steps: string[]; safety: string[]; library?: 'center' | 'synthetic' }
export interface PlanVersion { id: string; number: number; status: 'DRAFT' | 'IN_REVIEW' | 'SUPERSEDED' | 'RETURNED_FOR_REVISION' | 'WITHDRAWN' | 'FROZEN_INTERNAL'; summary: string; goals: Goal[]; homeActivities: HomeActivity[]; reviewNotes: { at: string; comment: string }[]; version: number; mine: boolean; author: string; updatedAt: string }
export interface SessionActivity { id: string; templateId: string; minutes: number; objective: string; planVersionId?: string; goalKey?: string; completion: 'NOT_STARTED' | 'COMPLETED' | 'SKIPPED'; outcome?: 'ACHIEVED' | 'PARTIAL' | 'NOT_ACHIEVED'; assistance?: 'INDEPENDENT' | 'SOME_ASSISTANCE' | 'SUBSTANTIAL_ASSISTANCE'; observation: string; snapshot?: Template; authorId?: string; createdAt?: string }
export interface CareTeamMember { assignmentId: string; displayName: string; service: string; isSpecialtyLead: boolean }
export interface Workspace {
  timezone: string; synthetic: true; locked: string; canEdit: boolean; canReview: boolean;
  careTeam: CareTeamMember[];
  childWideReferent: { displayName: string } | null;
  child: { id: string; name: string; services: string[]; dateOfBirth: string };
  assessments: { id: string; service: string; assessedOn: string; summary: string; areas: { area: string; finding: string }[]; version: number; author: string; mine: boolean; updatedAt: string }[];
  plans: { id: string; service: string; title: string; versions: PlanVersion[] }[];
  notes: { executionStatus: 'IN_PROGRESS' | 'COMPLETED'; actualStart: string | null; actualEnd: string | null; attendance: 'PRESENT' | 'NO_SHOW'; activities: SessionActivity[]; id: string; service: string; sessionDate: string; appointmentId: string | null; sections: Record<string, string>; version: number; author: string; mine: boolean; updatedAt: string }[];
  observations: { id: string; planVersionId: string; goalKey: string; value: number; observedOn: string; note: string | null; author: string }[];
  appointments: { id: string; service: string; startsAt: string; endsAt: string; room: string | null; status: string; hasNote: boolean }[];
  templates: Template[];
}
export interface FamilyActivities { sample: true; released: false; children: { id: string; name: string; activities: Template[] }[] }

const c = (centerId: string, p: string) => `/api/centers/${centerId}/${p}`;
export const clinicalApi = {
  workspace: (centerId: string, childId: string) => rest.get<Workspace>(c(centerId, `clinical/children/${childId}`)),
  assess: (centerId: string, childId: string, body: { service: string; assessedOn: string; summary: string; areas: { area: string; finding: string }[] }) => rest.send('POST', c(centerId, `clinical/children/${childId}/assessments`), body),
  plan: (centerId: string, childId: string, body: { service: string; title: string }) => rest.send('POST', c(centerId, `clinical/children/${childId}/plans`), body),
  saveVersion: (centerId: string, id: string, body: { summary: string; goals: Goal[]; homeActivities: HomeActivity[]; version: number }) => rest.send('PATCH', c(centerId, `clinical/plan-versions/${id}`), body),
  submit: (centerId: string, id: string, version: number) => rest.send('POST', c(centerId, `clinical/plan-versions/${id}/submit`), { version }),
  giveBack: (centerId: string, id: string, comment: string, version: number) => rest.send('POST', c(centerId, `clinical/plan-versions/${id}/return`), { comment, version }),
  newVersion: (centerId: string, planId: string) => rest.send('POST', c(centerId, `clinical/plans/${planId}/versions`)),
  note: (centerId: string, childId: string, body: { service: string; sessionDate: string; appointmentId?: string }) => rest.send('POST', c(centerId, `clinical/children/${childId}/notes`), body),
  startSession: (centerId: string, childId: string, body: { service: string; sessionDate: string; appointmentId?: string; actualStart: string; startKey: string }) => rest.send<{ id: string }>('POST', c(centerId, `clinical/children/${childId}/sessions`), body),
  saveSession: (centerId: string, id: string, body: { version: number; mutationKey: string; sections: Record<string, string>; activities: SessionActivity[]; actualStart: string; actualEnd?: string; attendance: string; executionStatus: string }) => rest.send<{ version: number; updatedAt: string }>('PATCH', c(centerId, `clinical/sessions/${id}`), body),
  saveNote: (centerId: string, id: string, sections: Record<string, string>, version: number) => rest.send('PATCH', c(centerId, `clinical/notes/${id}`), { sections, version }),
  observe: (centerId: string, childId: string, body: { planVersionId: string; goalKey: string; value: number; observedOn: string; note?: string }) => rest.send('POST', c(centerId, `clinical/children/${childId}/observations`), body),
  templates: (centerId: string) => rest.get<{ items: Template[] }>(c(centerId, 'activities')),
  createTemplate: (centerId: string, body: Omit<Template, 'id' | 'library'>) => rest.send('POST', c(centerId, 'activities'), body),
  familyPreview: (centerId: string, id: string) => rest.get<{ notice: string; snapshotId: string; fingerprint: string; activities: (HomeActivity & { template: Template | null })[] }>(c(centerId, `clinical/plan-versions/${id}/family-preview`)),
  family: (centerId: string) => rest.get<FamilyActivities>(c(centerId, 'family/activities')),
};
export const LOCKED_REASON = 'Signing, approval and release stay off until an owner-approved clinical policy exists.';
