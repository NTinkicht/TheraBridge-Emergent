import type { SessionInfo } from '@/lib/auth';

/** Remount tenant-scoped guardian views before data from a prior context can render. */
export function guardianScopeKey(session: SessionInfo): string {
  const context = session.activeContext;
  return JSON.stringify([
    session.user.id,
    context?.type ?? null,
    context?.type === 'center' ? context.centerId : null,
    context?.role ?? null,
  ]);
}
