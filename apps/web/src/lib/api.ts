const base = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!base) throw new ApiError(0, 'NEXT_PUBLIC_API_BASE_URL is not configured');
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Network error: the API could not be reached');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join('; ') : msg || `Request failed (${res.status})`, body ?? undefined);
  }
  return body as T;
}

export interface HealthResponse {
  status: string;
  framework: string;
  database: { status: string; engine: string; version: string; latencyMs: number };
  migrations: { applied: number; latest: string | null };
  time: string;
}
