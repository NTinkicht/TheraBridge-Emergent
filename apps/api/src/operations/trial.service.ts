import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Center } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CLOCK, Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';
import { Tx, logCenterEvent } from '../centers/history';

// TB-EM-005: every V1 center is a free 30-day trial. No billing or plans exist.
export const TRIAL = { days: 30, therapistSeats: 3, children: 1 } as const;
const DAY = 86_400_000;
export const TRIAL_ENDED = 'This center’s 30-day trial has ended. Everything stays visible, but changes are paused until TheraBridge extends the trial.';

// Center identifiers are immutable. This lock still serializes center-wide
// operations but does not block FK KEY SHARE checks for unrelated inserts.
export const lockCenter = (tx: Tx, centerId: string) => tx.$queryRaw`SELECT id FROM "center" WHERE id = ${centerId}::uuid FOR NO KEY UPDATE`;
export const trialExpired = (c: Pick<Center, 'trialEndsAt'>, now: Date) => !!c.trialEndsAt && c.trialEndsAt <= now;

@Injectable()
export class TrialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  now() {
    return this.clock.now();
  }

  // Locks the center row so seat/child counts cannot race, then refuses writes after expiry.
  async assertWritable(tx: Tx, centerId: string, now: Date) {
    await lockCenter(tx, centerId);
    const c = await tx.center.findUnique({ where: { id: centerId } });
    if (!c) throw new NotFoundException('Center not found');
    if (trialExpired(c, now)) throw new ForbiddenException(TRIAL_ENDED);
    return c;
  }

  private seatsUsed(db: Tx, centerId: string, now: Date, excludeMembershipId?: string) {
    return Promise.all([
      db.membership.count({ where: { centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } }, ...(excludeMembershipId ? { id: { not: excludeMembershipId } } : {}) } }),
      db.invitation.count({ where: { centerId, kind: 'STAFF', status: 'PENDING', expiresAt: { gt: now }, roles: { has: 'THERAPIST' } } }),
    ]).then(([a, b]) => a + b);
  }

  async assertTherapistSeat(tx: Tx, centerId: string, now: Date, excludeMembershipId?: string) {
    const c = await this.assertWritable(tx, centerId, now);
    if (c.trialEndsAt && (await this.seatsUsed(tx, centerId, now, excludeMembershipId)) >= TRIAL.therapistSeats) {
      throw new ConflictException(`All ${TRIAL.therapistSeats} therapist seats in the trial are in use, including pending invitations. Revoke an invitation or remove a therapist first.`);
    }
  }

  async assertChildCapacity(tx: Tx, centerId: string, now: Date) {
    const c = await this.assertWritable(tx, centerId, now);
    if (c.trialEndsAt && (await tx.child.count({ where: { centerId, status: 'ACTIVE' } })) >= TRIAL.children) {
      throw new ConflictException(`The trial includes ${TRIAL.children} active child. Archive the current child record to register another.`);
    }
  }

  async status(centerId: string) {
    const now = this.clock.now();
    const c = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId } });
    const [seats, children] = await Promise.all([this.seatsUsed(this.prisma, centerId, now), this.prisma.child.count({ where: { centerId, status: 'ACTIVE' } })]);
    return {
      onTrial: !!c.trialEndsAt, endsAt: c.trialEndsAt, expired: trialExpired(c, now),
      daysLeft: c.trialEndsAt ? Math.max(0, Math.ceil((c.trialEndsAt.getTime() - now.getTime()) / DAY)) : null,
      therapistSeats: { used: seats, limit: TRIAL.therapistSeats }, children: { used: children, limit: TRIAL.children },
    };
  }

  async extend(centerId: string, actorUserId: string, days: number, reason: string) {
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      await lockCenter(tx, centerId);
      const c = await tx.center.findUnique({ where: { id: centerId } });
      if (!c) throw new NotFoundException('Center not found');
      const base = c.trialEndsAt && c.trialEndsAt > now ? c.trialEndsAt : now;
      const trialEndsAt = new Date(base.getTime() + days * DAY);
      await tx.center.update({ where: { id: centerId }, data: { trialEndsAt } });
      await logCenterEvent(tx, centerId, 'trial.extended', now, { actorUserId, meta: { days, reason, from: c.trialEndsAt?.toISOString() ?? null, to: trialEndsAt.toISOString() } });
    });
    await this.audit.record('trial.extended', { actorUserId, meta: { centerId, days } });
    return this.status(centerId);
  }
}
