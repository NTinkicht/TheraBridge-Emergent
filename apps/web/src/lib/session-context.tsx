'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { authApi, onUnauthorized, type SessionInfo } from '@/lib/auth';
import { setCenterTz } from '@/lib/operations';

export type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; data: SessionInfo }
  | { status: 'error'; message: string };
export interface SessionController {
  state: SessionState;
  setState: (state: SessionState) => void;
  reload: () => Promise<void>;
  handle: (error: unknown) => void;
}

const Context = createContext<SessionController | null>(null);

/** The single session/controller is stable throughout navigation within /app. */
export function useSessionController(enabled: boolean): SessionController {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const latest = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const revision = ++latest.current;
    setState({ status: 'loading' });
    // A prior center's zone must never be reused for the new context.
    setCenterTz(undefined);
    try {
      const session = await authApi.session();
      if (session.activeContext?.type === 'center' && session.permissions.includes('center.summary.read')) {
        const summary = await authApi.centerSummary(session.activeContext.centerId);
        if (revision !== latest.current) return;
        setCenterTz(summary.center.timezone);
      }
      if (revision === latest.current) setState({ status: 'ready', data: session });
    } catch (e) {
      if (revision !== latest.current) return;
      if (e instanceof ApiError && e.status === 401) {
        router.replace('/login?expired=1');
        return;
      }
      setState({ status: 'error', message: (e as Error).message });
    }
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled) return;
    return onUnauthorized(() => {
      ++latest.current;
      setCenterTz(undefined);
      setState({ status: 'loading' });
      router.replace('/login?expired=1');
    });
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
    return () => { ++latest.current; };
  }, [enabled, reload]);

  const handle = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      setCenterTz(undefined);
      router.replace('/login?expired=1');
    } else if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
      router.replace('/access-denied');
    } else throw e;
  }, [router]);

  return { state, setState, reload, handle };
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionController(true);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useSharedSession = () => useContext(Context);
