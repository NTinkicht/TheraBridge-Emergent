import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { describeLocal } from '../common/zoned';
import { DevMailboxService } from '../dev-mailbox/dev-mailbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrialService } from './trial.service';

const HOUR = 3_600_000;
export const SERVICE_LABEL: Record<string, string> = {
  speech: 'Speech therapy', occupational: 'Occupational therapy', physical: 'Physical therapy',
  behavioral: 'Behavioral therapy', feeding: 'Feeding therapy', developmental: 'Developmental therapy',
};
type Kind = 'reminder_24h' | 'rescheduled' | 'cancelled';
const SUBJECT: Record<Kind, string> = { reminder_24h: 'Reminder: appointment tomorrow', rescheduled: 'Appointment moved', cancelled: 'Appointment cancelled' };

// Operational notices to connected guardians who keep reminders on. Delivered only to the restricted synthetic outbox.
@Injectable()
export class NoticesService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService, private readonly mail: DevMailboxService, private readonly trial: TrialService) {}

  onModuleInit() {
    const s = Number(process.env.REMINDER_SWEEP_SECONDS);
    if (s > 0) {
      this.timer = setInterval(() => void this.runDue().catch(() => undefined), s * 1000);
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private async send(ids: string[], kind: Kind, now: Date) {
    if (!ids.length) return 0;
    const appts = await this.prisma.appointment.findMany({ where: { id: { in: ids } }, include: { center: true, child: { include: { guardians: { where: { removedAt: null, userId: { not: null }, remindersEnabled: true } } } } } });
    const users = await this.prisma.user.findMany({ where: { id: { in: appts.flatMap((a) => a.child.guardians.map((g) => g.userId!)) }, status: 'ACTIVE' }, select: { id: true, email: true } });
    const team = await this.prisma.membership.findMany({ where: { id: { in: appts.map((a) => a.membershipId) } }, select: { id: true, user: { select: { displayName: true } } } });
    const permitted = new Set(users.map((u) => u.id));
    // Atomically reserve reminder deliveries across workers; no repeated
    // P2002 exceptions and no emails for duplicates that lost the race.
    const reservations = await this.prisma.appointmentNotice.createManyAndReturn({
      data: appts.flatMap((a) => a.child.guardians.filter((g) => g.userId && permitted.has(g.userId)).map((g) => ({
        centerId: a.centerId, appointmentId: a.id, guardianLinkId: g.id, kind, startsAt: a.startsAt, sentAt: now,
      }))),
      skipDuplicates: true,
      select: { id: true, appointmentId: true, guardianLinkId: true, startsAt: true },
    });
    const allowed = new Map(reservations.map((r) => [`${r.appointmentId}:${r.guardianLinkId}:${r.startsAt.toISOString()}`, r.id]));
    // A filesystem/outbox failure must not strand unsent reservations. Keep
    // successfully delivered rows, and release only our unattempted/failed
    // reservations so a later sweep can safely retry them.
    const pending = new Set(reservations.map((r) => r.id));
    let sent = 0;
    try {
      for (const a of appts) {
        for (const g of a.child.guardians) {
          const to = users.find((u) => u.id === g.userId)?.email;
          const id = allowed.get(`${a.id}:${g.id}:${a.startsAt.toISOString()}`);
          if (!to || !id) continue;
          const who = `${a.child.preferredName ?? a.child.firstName}’s ${SERVICE_LABEL[a.service] ?? a.service} with ${team.find((t) => t.id === a.membershipId)?.user.displayName ?? 'the care team'}`;
          const when = `${describeLocal(a.startsAt, a.center.timezone)} (${a.center.timezone.replace('_', ' ')} time)`;
          const lead = kind === 'reminder_24h' ? `This is a reminder of ${who} on ${when}.` : kind === 'rescheduled' ? `${who} has moved to ${when}.` : `${who} on ${when} has been cancelled.`;
          this.mail.send({
            to, subject: `${SUBJECT[kind]} · ${a.center.name}`,
            body: `Hello ${g.displayName},\n\n${lead}${a.room && kind !== 'cancelled' ? ` Room: ${a.room}.` : ''}\n\nYou can see your family’s schedule and message the center in TheraBridge. You can turn these emails off on your family home page.\n\n${a.center.name}`,
          });
          pending.delete(id);
          sent++;
        }
      }
    } finally {
      if (pending.size) await this.prisma.appointmentNotice.deleteMany({ where: { id: { in: [...pending] } } });
    }
    return sent;
  }

  // Idempotent: each guardian gets one reminder per appointment start time.
  async runDue(now = this.trial.now()) {
    const due = await this.prisma.appointment.findMany({ where: { status: 'SCHEDULED', startsAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR) }, child: { status: 'ACTIVE' } }, select: { id: true }, orderBy: { startsAt: 'asc' }, take: 1000 });
    return { sent: await this.send(due.map((a) => a.id), 'reminder_24h', now) };
  }

  // Change notices only for visits in the next 14 days; later changes show up in the family schedule.
  async changed(items: { id: string; before?: Date }[], kind: 'rescheduled' | 'cancelled') {
    const now = this.trial.now();
    const soon = new Date(now.getTime() + 14 * 24 * HOUR);
    const rows = await this.prisma.appointment.findMany({ where: { id: { in: items.map((i) => i.id) } }, select: { id: true, startsAt: true } });
    const near = rows.filter((r) => [r.startsAt, items.find((i) => i.id === r.id)?.before].some((t) => t && t > now && t < soon)).map((r) => r.id);
    return this.send(near, kind, now).catch(() => 0);
  }
}
