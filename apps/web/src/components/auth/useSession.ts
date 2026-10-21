'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { authApi, type SessionInfo } from '@/lib/auth';

export type SessionState = { status: 'loading' } | { status: 'ready'; data: SessionInfo } | { status: 'error'; message: string };

// Loads the server session; an ended session always sends the user to sign in (never shows stale data).
export function useSession() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({ status: 'ready', data: await authApi.session() });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace('/login?expired=1');
        return;
      }
      setState({ status: 'error', message: (e as Error).message });
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handle = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) router.replace('/login?expired=1');
      else if (e instanceof ApiError && (e.status === 403 || e.status === 404)) router.replace('/access-denied');
      else throw e;
    },
    [router],
  );

  return { state, setState, reload: load, handle };
}
