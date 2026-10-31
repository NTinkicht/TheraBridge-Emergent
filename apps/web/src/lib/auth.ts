import { ApiError } from './api';

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

export type ApplicationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export const SPECIALTY_OPTIONS = [
  { value: 'speech', label: 'Speech & language' },
  { value: 'occupational', label: 'Occupational therapy' },
  { value: 'physical', label: 'Physical therapy' },
  { value: 'behavioral', label: 'Behavioral therapy' },
  { value: 'feeding', label: 'Feeding therapy' },
  { value: 'developmental', label: 'Developmental therapy' },
] as const;

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: 'Application pending',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export interface ApplicationInput {
  organizationName: string;
  country: string;
  city: string;
  timezone: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  specialties: string[];
  therapistEstimate: number;
  childEstimate: number;
  message?: string;
  syntheticDataAcknowledged: boolean;
}

export interface ApplicationSummary {
  id: string;
  reference: string;
  organizationName: string;
  city: string;
  country: string;
  contactName: string;
  status: ApplicationStatus;
  submittedAt: string;
  decidedAt: string | null;
  specialties: string[];
}

export interface ApplicationList {
  total: number;
  page: number;
  pageSize: number;
  items: ApplicationSummary[];
  counts: Partial<Record<ApplicationStatus, number>>;
}

export interface ApplicationDetail extends ApplicationSummary, Omit<ApplicationInput, 'syntheticDataAcknowledged'> {
  version: number;
  reviewStartedAt: string | null;
  reviewStartedBy: string | null;
  decidedBy: string | null;
  decisionRationale: string | null;
  provisioning: { status: 'AWAITING_PROVISIONING' | 'PROVISIONED'; center: { id: string; name: string; slug: string } | null } | null;
  events: { id: number; type: string; fromStatus: ApplicationStatus | null; toStatus: ApplicationStatus; note: string | null; createdAt: string; actor: string | null }[];
}

let csrf: string | null = null;
let unauthorizedListener: (() => void) | null = null;
/** The authenticated app installs one listener so all feature calls handle expired sessions. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListener = listener;
  return () => { if (unauthorizedListener === listener) unauthorizedListener = null; };
}


async function call<T>(path: string, opts: { method?: string; body?: unknown; csrf?: string | null } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.csrf ? { 'X-CSRF-Token': opts.csrf } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'We could not reach TheraBridge. Check your connection and try again.');
  }
  if (res.status === 401) {
    csrf = null; // The previous session's token is invalid, even if no logout call was made.
    if (path !== '/api/auth/login' && path !== '/api/auth/csrf') unauthorizedListener?.();
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(' ') : msg || `Request failed (${res.status})`, body ?? undefined);
  }
  return body as T;
}

const remember = (s: SessionInfo): SessionInfo => {
  csrf = s.csrfToken;
  return s;
};

// Concurrent callers share one in-flight request, because each GET /api/auth/csrf rotates the pre-auth cookie.
let preTokenInFlight: Promise<string> | null = null;
const preToken = () => {
  preTokenInFlight ??= call<{ csrfToken: string }>('/api/auth/csrf').then((r) => r.csrfToken).finally(() => {
    preTokenInFlight = null;
  });
  return preTokenInFlight;
};

// Generic authenticated requests for feature modules; CSRF is attached automatically for writes.
export const rest = {
  get: <T>(path: string) => call<T>(path),
  send: <T>(method: 'POST' | 'PATCH', path: string, body: unknown = {}) => call<T>(path, { method, body, csrf }),
  publicPost: async <T>(path: string, body: unknown) => call<T>(path, { method: 'POST', body, csrf: await preToken() }),
  remember,
};

export const authApi = {
  login: async (email: string, password: string) =>
    remember(await call<SessionInfo>('/api/auth/login', { method: 'POST', body: { email, password }, csrf: await preToken() })),
  session: async () => remember(await call<SessionInfo>('/api/auth/session')),
  selectContext: async (choice: { platform: true } | { membershipId: string; role: Role }) =>
    remember(await call<SessionInfo>('/api/auth/context', { method: 'POST', body: choice, csrf })),
  logout: async () => { await call<void>('/api/auth/logout', { method: 'POST', csrf }); csrf = null; },
  logoutAll: async () => { await call<void>('/api/auth/logout-all', { method: 'POST', csrf }); csrf = null; },
  changePassword: async (currentPassword: string, newPassword: string) =>
    remember(await call<SessionInfo>('/api/auth/password/change', { method: 'POST', body: { currentPassword, newPassword }, csrf })),
  forgot: async (email: string) => call<{ message: string }>('/api/auth/password/forgot', { method: 'POST', body: { email }, csrf: await preToken() }),
  reset: async (token: string, password: string) => call<void>('/api/auth/password/reset', { method: 'POST', body: { token, password }, csrf: await preToken() }),
  platformSummary: () => call<{ centers: number; activeCenters: number; pendingApplications: number }>('/api/platform/summary'),
  submitApplication: async (body: ApplicationInput) =>
    call<{ reference: string; status: string; submittedAt: string }>('/api/center-applications', { method: 'POST', body, csrf: await preToken() }),
  listApplications: (params: { status?: string; q?: string; page?: number }) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
    return call<ApplicationList>(`/api/platform/applications?${qs}`);
  },
  application: (id: string) => call<ApplicationDetail>(`/api/platform/applications/${id}`),
  startReview: (id: string, version: number) => call<ApplicationDetail>(`/api/platform/applications/${id}/start-review`, { method: 'POST', body: { version }, csrf }),
  decide: (id: string, decision: 'APPROVED' | 'REJECTED', rationale: string, version: number) =>
    call<ApplicationDetail>(`/api/platform/applications/${id}/decision`, { method: 'POST', body: { decision, rationale, version }, csrf }),
  centerSummary: (centerId: string) =>
    call<{ center: { id: string; name: string; slug: string; timezone: string }; activeMembers: number }>(`/api/centers/${centerId}/summary`),
};
