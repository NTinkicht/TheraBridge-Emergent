import { ApiError } from './api';

const base = process.env.NEXT_PUBLIC_API_BASE_URL;

export type Role = 'PLATFORM_ADMIN' | 'CENTER_ADMIN' | 'COORDINATOR' | 'THERAPIST' | 'CLINICAL_SUPERVISOR' | 'GUARDIAN';

export type ContextOption =
  | { type: 'platform'; role: 'PLATFORM_ADMIN' }
  | { type: 'center'; membershipId: string; centerId: string; centerName: string; centerSlug: string; role: Role };

export interface SessionInfo {
  user: { id: string; email: string; displayName: string };
  csrfToken: string;
  session: { idleExpiresAt: string; absoluteExpiresAt: string };
  contexts: ContextOption[];
  activeContext: ContextOption | null;
  permissions: string[];
}

export const ROLE_LABELS: Record<Role, string> = {
  PLATFORM_ADMIN: 'Platform administrator',
  CENTER_ADMIN: 'Center administrator',
  COORDINATOR: 'Coordinator',
  THERAPIST: 'Therapist',
  CLINICAL_SUPERVISOR: 'Clinical supervisor',
  GUARDIAN: 'Parent / guardian',
};

export const contextLabel = (c: ContextOption): string => (c.type === 'platform' ? 'TheraBridge platform' : c.centerName);

export const PASSWORD_HINT = 'At least 12 characters. A short phrase is easier to remember than symbols.';

let csrf: string | null = null;

async function call<T>(path: string, opts: { method?: string; body?: unknown; csrf?: string | null } = {}): Promise<T> {
  if (!base) throw new ApiError(0, 'NEXT_PUBLIC_API_BASE_URL is not configured');
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.csrf ? { 'X-CSRF-Token': opts.csrf } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'We could not reach TheraBridge. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(' ') : msg || `Request failed (${res.status})`);
  }
  return body as T;
}

const remember = (s: SessionInfo): SessionInfo => {
  csrf = s.csrfToken;
  return s;
};

const preToken = async () => (await call<{ csrfToken: string }>('/api/auth/csrf')).csrfToken;

export const authApi = {
  login: async (email: string, password: string) =>
    remember(await call<SessionInfo>('/api/auth/login', { method: 'POST', body: { email, password }, csrf: await preToken() })),
  session: async () => remember(await call<SessionInfo>('/api/auth/session')),
  selectContext: async (choice: { platform: true } | { membershipId: string; role: Role }) =>
    remember(await call<SessionInfo>('/api/auth/context', { method: 'POST', body: choice, csrf })),
  logout: () => call<void>('/api/auth/logout', { method: 'POST', csrf }),
  logoutAll: () => call<void>('/api/auth/logout-all', { method: 'POST', csrf }),
  changePassword: async (currentPassword: string, newPassword: string) =>
    remember(await call<SessionInfo>('/api/auth/password/change', { method: 'POST', body: { currentPassword, newPassword }, csrf })),
  forgot: async (email: string) => call<{ message: string }>('/api/auth/password/forgot', { method: 'POST', body: { email }, csrf: await preToken() }),
  reset: async (token: string, password: string) => call<void>('/api/auth/password/reset', { method: 'POST', body: { token, password }, csrf: await preToken() }),
  platformSummary: () => call<{ centers: number; activeCenters: number }>('/api/platform/summary'),
  centerSummary: (centerId: string) =>
    call<{ center: { id: string; name: string; slug: string; timezone: string }; activeMembers: number }>(`/api/centers/${centerId}/summary`),
};
