import type { Role } from '@prisma/client';

export const ROLES: Role[] = ['PLATFORM_ADMIN', 'CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR', 'GUARDIAN'];
export const CENTER_ROLES: Role[] = ROLES.filter((r) => r !== 'PLATFORM_ADMIN');

// Deny by default: a role has a permission only if it is listed here. Mirrored in docs/emergent/security/PERMISSIONS_MATRIX.md.
export const PERMISSIONS: Record<string, readonly Role[]> = {
  'platform.summary.read': ['PLATFORM_ADMIN'],
  'center.summary.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST'],
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

export function can(role: Role, permission: string): boolean {
  if ((CLINICAL_CAPABILITIES as readonly string[]).includes(permission)) return false;
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export const permissionsFor = (role: Role): string[] => Object.keys(PERMISSIONS).filter((p) => can(role, p));
