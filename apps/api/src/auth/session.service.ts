import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, Session } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CLOCK, Clock } from '../common/clock';
import { cookie } from '../common/cookies';
import { hmac, ipPrefix, randomToken, sha256 } from '../common/security';
import { AUTH_CONFIG, AuthConfig } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthState } from './access';

export const IDLE_MS = 30 * 60_000;
export const ABSOLUTE_MS = 12 * 3_600_000;
const TOUCH_MS = 60_000;

export interface ClientMeta {
  ip: string;
  userAgent?: string;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Session-bound CSRF token: derived from the raw session token, so it changes on every rotation.
  csrfFor(token: string): string {
    return hmac(this.cfg.secret, `csrf:${token}`);
  }

  cookieFor(token: string): string {
    return cookie(this.cfg.sessionCookie, token, { maxAgeSec: ABSOLUTE_MS / 1000, secure: this.cfg.cookieSecure });
  }

  async create(userId: string, meta: ClientMeta): Promise<string> {
    const token = randomToken();
    const now = this.clock.now();
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        createdAt: now,
        lastSeenAt: now,
        absoluteExpiresAt: new Date(now.getTime() + ABSOLUTE_MS),
        ipPrefix: ipPrefix(meta.ip),
        userAgent: meta.userAgent?.slice(0, 256),
      },
    });
    return token;
  }

  async validate(token: string): Promise<AuthState | null> {
    const session = await this.prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    const now = this.clock.now().getTime();
    if (!session || session.revokedAt || session.user.status !== 'ACTIVE') return null;
    if (session.absoluteExpiresAt.getTime() <= now || session.lastSeenAt.getTime() + IDLE_MS <= now) return null;
    if (now - session.lastSeenAt.getTime() > TOUCH_MS) {
      session.lastSeenAt = new Date(now);
      await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: session.lastSeenAt } });
    }
    return { token, session };
  }

  // New row and token; old row revoked; context carried over; absolute expiry never extended.
  async rotate(old: Session, reason: string, overrides: Record<string, unknown> = {}): Promise<string> {
    const { id, tokenHash, createdAt, lastSeenAt, revokedAt, revokedReason, rotatedFromId, user, ...rest } = old as Session & { user?: unknown };
    void [tokenHash, createdAt, lastSeenAt, revokedAt, revokedReason, rotatedFromId, user];
    const token = randomToken();
    const now = this.clock.now();
    await this.prisma.$transaction([
      this.prisma.session.update({ where: { id }, data: { revokedAt: now, revokedReason: 'rotated' } }),
      this.prisma.session.create({
        data: { ...(rest as Prisma.SessionUncheckedCreateInput), ...overrides, tokenHash: sha256(token), createdAt: now, lastSeenAt: now, rotatedFromId: id },
      }),
    ]);
    await this.audit.record('auth.session.rotated', { actorUserId: old.userId, meta: { reason } });
    return token;
  }

  async revoke(id: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: this.clock.now(), revokedReason: reason } });
  }

  async revokeAllForUser(userId: string, reason: string): Promise<number> {
    const r = await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: this.clock.now(), revokedReason: reason } });
    return r.count;
  }
}
