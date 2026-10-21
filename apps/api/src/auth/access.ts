import { SetMetadata } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Session, User } from '@prisma/client';

export const ACCESS_KEY = 'tb:access';

export type Access =
  | { kind: 'public'; preAuth: boolean }
  | { kind: 'authenticated' }
  | { kind: 'permission'; permission: string };

// Every route must carry exactly one of these; RouteAccessVerifier fails boot otherwise (deny by default).
export const Public = (opts: { preAuth?: boolean } = {}) =>
  SetMetadata(ACCESS_KEY, { kind: 'public', preAuth: opts.preAuth ?? false } satisfies Access);
export const Authenticated = () => SetMetadata(ACCESS_KEY, { kind: 'authenticated' } satisfies Access);
export const RequirePermission = (permission: string) => SetMetadata(ACCESS_KEY, { kind: 'permission', permission } satisfies Access);

export interface AuthState {
  token: string;
  session: Session & { user: User };
}

export type TbRequest = FastifyRequest & { clientIp: string; auth?: AuthState };

export const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
