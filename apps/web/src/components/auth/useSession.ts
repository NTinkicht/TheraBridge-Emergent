'use client';

import { useSessionController, useSharedSession } from '@/lib/session-context';
export type { SessionState } from '@/lib/session-context';

/** Inside /app, reuse its persistent session provider; outside /app load independently. */
export function useSession() {
  const shared = useSharedSession();
  // Always invoke the same hooks in the same order. The fallback is dormant under /app.
  const fallback = useSessionController(shared === null);
  return shared ?? fallback;
}
