import type { Role } from '@prisma/client';

export const ROLES: Role[] = ['PLATFORM_ADMIN', 'CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR', 'GUARDIAN'];
export const CENTER_ROLES: Role[] = ROLES.filter((r) => r !== 'PLATFORM_ADMIN');

// Deny by default: a role has a permission only if it is listed here. Mirrored in docs/emergent/security/PERMISSIONS_MATRIX.md.
export const PERMISSIONS: Record<string, readonly Role[]> = {
  'platform.summary.read': ['PLATFORM_ADMIN'],
  'platform.applications.read': ['PLATFORM_ADMIN'],
  'platform.applications.decide': ['PLATFORM_ADMIN'],
  'platform.centers.read': ['PLATFORM_ADMIN'],
  'platform.centers.create': ['PLATFORM_ADMIN'],
  'platform.centers.invite_admin': ['PLATFORM_ADMIN'],
  'platform.centers.trial': ['PLATFORM_ADMIN'],
  'center.summary.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
  'center.settings.read': ['CENTER_ADMIN'],
  'center.settings.update': ['CENTER_ADMIN'],
  'center.setup.manage': ['CENTER_ADMIN'],
  'center.staff.read': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.staff.invite': ['CENTER_ADMIN'],
  'center.staff.manage': ['CENTER_ADMIN'],
  'center.profile.self': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
  'center.children.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
  'center.children.manage': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.families.manage': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.assignments.manage': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.handover.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST'],
  'center.handover.propose': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.handover.acknowledge': ['THERAPIST'],
  'center.handover.cancel': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.handover.syntheticApprove': ['CLINICAL_SUPERVISOR'],
  'center.handover.syntheticCommit': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.schedule.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
  'center.schedule.manage': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.appointments.status': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST'],
  'family.portal.read': ['GUARDIAN'],
  'family.preferences.update': ['GUARDIAN'],
  // D-NEW-5 UNSIGNED: these roles apply only to isolated Jest fixtures.
  // Even an explicit FAMILY_MESSAGING_DEMO flag cannot enable production/demo traffic.
  'center.messages.use': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'GUARDIAN'],
  'center.messages.manage': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST'],
  'platform.reminders.run': ['PLATFORM_ADMIN'],
  // TB-EM-008 synthetic clinical drafts. Row scope (assigned children, own drafts) is enforced in ClinicalService.
  'center.governance.read': ['CENTER_ADMIN', 'COORDINATOR'],
  'center.clinical.read': ['THERAPIST', 'CLINICAL_SUPERVISOR'],
  'center.clinical.draft': ['THERAPIST'],
  'center.clinical.review': ['CLINICAL_SUPERVISOR'],
  'center.activities.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
  'center.activities.manage': ['THERAPIST', 'CLINICAL_SUPERVISOR'],
  'family.activities.read': ['GUARDIAN'],
  // TB-EM-009: guardians only ever see a fixed synthetic progress example, never clinician drafts.
  'family.progress.demo': ['GUARDIAN'],
  // TB-EM-010: synthetic family practice outcomes. Guardians record fixed choices; therapists read and acknowledge.
  'center.practice.read': ['THERAPIST', 'CLINICAL_SUPERVISOR'],
  'center.practice.acknowledge': ['THERAPIST'],
  'family.practice.read': ['GUARDIAN'],
  'family.practice.record': ['GUARDIAN'],
  // TB-EM-048: structured request/response ONLY; never clinical release or free-text messaging.
  'family.home_plan_request.read': ['GUARDIAN'],
  'family.home_plan_request.create': ['GUARDIAN'],
  'center.home_plan_request.read': ['THERAPIST'],
  'center.home_plan_request.respond': ['THERAPIST'],
};

// No clinical capability can be granted to anyone until an owner-approved clinical policy exists.
export const CLINICAL_CAPABILITIES = [
  'clinical.note.sign',
  'clinical.note.cosign',
  'clinical.plan.approve',
  'clinical.report.release',
  'safeguarding.lead',
  'session.recording',
] as const;

// D-NEW-5 is unsigned: no deployment flag can activate free-text messaging.
// An isolated Jest/CI fixture may still verify historical scope and revocation rules.
// Real environments (including local dev and hosted synthetic preview) always deny.
export const syntheticMessagesTestFixtureOnly = (): boolean =>
  process.env.NODE_ENV === 'test' &&
  process.env.DEPLOYMENT_ENV === 'ci' &&
  !!process.env.JEST_WORKER_ID &&
  process.env.FAMILY_MESSAGING_DEMO === 'true';

export function can(role: Role, permission: string): boolean {
  if (permission === 'center.messages.use' || permission === 'center.messages.manage') {
    if (!syntheticMessagesTestFixtureOnly()) return false;
  }
  if ((CLINICAL_CAPABILITIES as readonly string[]).includes(permission)) return false;
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export const permissionsFor = (role: Role): string[] => Object.keys(PERMISSIONS).filter((p) => can(role, p));
