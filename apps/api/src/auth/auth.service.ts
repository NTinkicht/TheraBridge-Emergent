import { HttpException, HttpStatus, Inject, Injectable, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CLOCK, Clock } from '../common/clock';
import { hmac, ipPrefix, normalizeEmail, randomToken, sha256 } from '../common/security';
import { AUTH_CONFIG, AuthConfig } from '../config/env';
import { DevMailboxService } from '../dev-mailbox/dev-mailbox.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthState } from './access';
import { ContextService } from './context.service';
import { dummyHash, hashPassword, needsRehash, passwordPolicyError, verifyPassword } from './password';
import { RateLimitStore } from './rate-limit.store';
import { ClientMeta, IDLE_MS, SessionService } from './session.service';

const WINDOW_MS = 15 * 60_000;
export const ACCOUNT_LIMIT = 5;
export const IP_LIMIT = 30;
export const PASSWORD_CHANGE_LIMIT = 5;
const LOCK_MS = 15 * 60_000;
const RESET_TTL_MS = 30 * 60_000;
const GENERIC_LOGIN_ERROR = 'Email or password is incorrect.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly limits: RateLimitStore,
    private readonly audit: AuditService,
    private readonly mailbox: DevMailboxService,
    private readonly contexts: ContextService,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private accountKey(email: string): string {
    return `acct:${hmac(this.cfg.secret, normalizeEmail(email))}`;
  }

  async login(email: string, password: string, meta: ClientMeta): Promise<string> {
    const now = this.clock.now();
    const ipKey = `ip:${meta.ip}`;
    if ((await this.limits.count(ipKey, WINDOW_MS, now)) >= IP_LIMIT) {
      await this.audit.record('auth.rate_limited', { ip: meta.ip });
      throw new HttpException('Too many sign-in attempts. Please wait a few minutes and try again.', HttpStatus.TOO_MANY_REQUESTS);
    }
    // A targeted attacker must not be able to globally lock another user out:
    // enforce the account lockout per origin while the separate IP spray
    // limiter still covers attempts across different account names.
    const originKey = `${this.accountKey(email)}:origin:${hmac(this.cfg.secret, meta.ip)}`;
    const user = await this.prisma.user.findUnique({
      where: { emailNormalized: normalizeEmail(email) },
      include: { identities: { where: { provider: 'local' } } },
    });
    const identity = user?.identities[0];
    const locked = await this.limits.isLocked(originKey, now);
    const valid = await verifyPassword(identity?.passwordHash ?? (await dummyHash()), password);

    if (!user || !identity?.passwordHash || !valid || locked || user.status !== 'ACTIVE') {
      await this.limits.hit(ipKey, WINDOW_MS, now);
      const failures = await this.limits.hit(originKey, WINDOW_MS, now);
      if (failures >= ACCOUNT_LIMIT && !locked) {
        await this.limits.lock(originKey, new Date(now.getTime() + LOCK_MS));
        await this.audit.record('auth.lockout', { subjectUserId: user?.id, ip: meta.ip });
      }
      await this.audit.record('auth.login.failure', { subjectUserId: user?.id, ip: meta.ip, meta: { reason: locked ? 'locked' : 'invalid' } });
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    await this.limits.clear(originKey);
    if (needsRehash(identity.passwordHash)) {
      await this.prisma.authIdentity.update({ where: { id: identity.id }, data: { passwordHash: await hashPassword(password) } });
    }
    const token = await this.sessions.create(user.id, meta);
    await this.contexts.autoSelect(token);
    await this.audit.record('auth.login.success', { actorUserId: user.id, ip: meta.ip });
    return token;
  }

  async describe(token: string): Promise<Record<string, unknown>> {
    const auth = await this.sessions.validate(token);
    if (!auth) throw new UnauthorizedException();
    const { session } = auth;
    return {
      user: { id: session.user.id, email: session.user.email, displayName: session.user.displayName },
      csrfToken: this.sessions.csrfFor(token),
      session: {
        idleExpiresAt: new Date(session.lastSeenAt.getTime() + IDLE_MS).toISOString(),
        absoluteExpiresAt: session.absoluteExpiresAt.toISOString(),
      },
      ...(await this.contexts.describe(auth)),
    };
  }

  async logout(auth: AuthState, meta: ClientMeta): Promise<void> {
    await this.sessions.revoke(auth.session.id, 'logout');
    await this.audit.record('auth.logout', { actorUserId: auth.session.userId, ip: meta.ip });
  }

  async logoutAll(auth: AuthState, meta: ClientMeta): Promise<void> {
    const count = await this.sessions.revokeAllForUser(auth.session.userId, 'logout_all');
    await this.audit.record('auth.logout_all', { actorUserId: auth.session.userId, ip: meta.ip, meta: { sessions: count } });
  }

  async forgot(email: string, meta: ClientMeta): Promise<void> {
    // Rate-limit reset requests by origin, not by target account: an attacker
    // must not be able to lock another user's password-recovery capability.
    // Keep the public 202 response identical for known and unknown accounts.
    const now = this.clock.now();
    const requests = await this.limits.hit(`password-reset-ip:${hmac(this.cfg.secret, meta.ip)}`, WINDOW_MS, now);
    if (requests > 10) {
      // Emit the crossing event once per window, not one append-only audit row
      // per blocked request: otherwise the throttle itself amplifies a flood.
      if (requests === 11) await this.audit.record('auth.password.reset_rate_limited', { ip: meta.ip });
      return;
    }
    const user = await this.prisma.user.findUnique({ where: { emailNormalized: normalizeEmail(email) } });
    await this.audit.record('auth.password.reset_requested', { subjectUserId: user?.id, ip: meta.ip, meta: { known: !!user } });
    if (!user || user.status !== 'ACTIVE') return;
    const token = randomToken();
    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({ where: { userId: user.id, purpose: 'PASSWORD_RESET', usedAt: null }, data: { usedAt: now } }),
      this.prisma.verificationToken.create({
        data: { userId: user.id, purpose: 'PASSWORD_RESET', tokenHash: sha256(token), expiresAt: new Date(now.getTime() + RESET_TTL_MS) },
      }),
    ]);
    this.mailbox.send({
      to: user.email,
      subject: 'Reset your TheraBridge password',
      body: `Use this link within 30 minutes: ${this.cfg.corsOrigins[0]}/reset-password#token=${token}`,
    });
  }

  async reset(token: string, password: string, meta: ClientMeta): Promise<void> {
    const now = this.clock.now();
    const row = await this.prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!row || row.purpose !== 'PASSWORD_RESET' || row.usedAt || row.expiresAt <= now || row.user.status !== 'ACTIVE') {
      throw new UnprocessableEntityException('This reset link is invalid or has expired. Request a new one.');
    }
    const policy = passwordPolicyError(password, row.user.email);
    if (policy) throw new UnprocessableEntityException(policy);
    // Compute the expensive hash before opening a database transaction. The
    // token claim, credential mutation, session revocations, origin-lockout
    // cleanup and audit receipt must either ALL commit or ALL roll back.
    // In particular, a crash after claiming the token must not strand users
    // with an unusable token and the old password still in place.
    const passwordHash = await hashPassword(password);
    const accountKey = this.accountKey(row.user.email);
    const prefix = `${accountKey}:origin:`;
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.verificationToken.updateMany({
        where: { id: row.id, purpose: 'PASSWORD_RESET', usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new UnprocessableEntityException('This reset link is invalid or has expired. Request a new one.');
      const user = await tx.user.findUnique({ where: { id: row.userId }, select: { status: true } });
      if (user?.status !== 'ACTIVE') throw new UnprocessableEntityException('This reset link is invalid or has expired. Request a new one.');
      await tx.authIdentity.update({
        where: { userId_provider: { userId: row.userId, provider: 'local' } },
        data: { passwordHash, passwordChangedAt: now },
      });
      await tx.session.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'password_reset' },
      });
      // Reset all account-specific counters without recording raw user/IP
      // information. The account key and its per-origin suffix are HMACs.
      await tx.rateLimitCounter.deleteMany({ where: { OR: [{ key: accountKey }, { key: { startsWith: prefix } }] } });
      await tx.authLockout.deleteMany({ where: { OR: [{ key: accountKey }, { key: { startsWith: prefix } }] } });
      // A failed audit insert must also roll back the password and token.
      await tx.auditEvent.create({
        data: { type: 'auth.password.reset_completed', subjectUserId: row.userId,
          ipPrefix: ipPrefix(meta.ip), meta: {} },
      });
    });
  }

  async change(auth: AuthState, current: string, next: string, meta: ClientMeta): Promise<string> {
    // Shared PostgreSQL counter: all sessions and API instances for this account
    // consume one budget before the expensive Argon2 current-password check.
    const rateKey = `password-change:${hmac(this.cfg.secret, auth.session.userId)}`;
    const ipRateKey = `password-change-ip:${hmac(this.cfg.secret, meta.ip)}`;
    const now = this.clock.now();
    const [accountAttempts, ipAttempts] = await Promise.all([
      this.limits.hit(rateKey, WINDOW_MS, now),
      this.limits.hit(ipRateKey, WINDOW_MS, now),
    ]);
    if (accountAttempts > PASSWORD_CHANGE_LIMIT || ipAttempts > IP_LIMIT) {
      await this.audit.record('auth.password.change_rate_limited', { actorUserId: auth.session.userId, ip: meta.ip });
      throw new HttpException('Too many password-change attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const identity = await this.prisma.authIdentity.findUnique({ where: { userId_provider: { userId: auth.session.userId, provider: 'local' } } });
    if (!identity?.passwordHash || !(await verifyPassword(identity.passwordHash, current))) {
      throw new UnprocessableEntityException('Your current password is incorrect.');
    }
    const policy = passwordPolicyError(next, auth.session.user.email);
    if (policy) throw new UnprocessableEntityException(policy);
    await this.setPassword(auth.session.userId, next);
    await this.prisma.session.updateMany({
      where: { userId: auth.session.userId, revokedAt: null, NOT: { id: auth.session.id } },
      data: { revokedAt: this.clock.now(), revokedReason: 'password_changed' },
    });
    const token = await this.sessions.rotate(auth.session, 'password_changed');
    await this.audit.record('auth.password.changed', { actorUserId: auth.session.userId, ip: meta.ip });
    return token;
  }

  private async setPassword(userId: string, password: string): Promise<void> {
    await this.prisma.authIdentity.update({
      where: { userId_provider: { userId, provider: 'local' } },
      data: { passwordHash: await hashPassword(password), passwordChangedAt: this.clock.now() },
    });
  }
}
