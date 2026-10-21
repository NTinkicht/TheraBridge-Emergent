import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { Tx, logCenterEvent, uniq } from '../centers/history';
import { PrismaService } from '../prisma/prisma.service';
import { Viewer, childScope } from './children.service';
import { NoticesService } from './notices.service';
import type { AppointmentDto, AppointmentStatusDto, FamilyPreferenceDto, RangeQuery, RescheduleDto } from './operations.dto';
import { TrialService } from './trial.service';

const DAY = 86_400_000;
const offset = (d: Date, tz: string) => new Date(d.toLocaleString('en-US', { timeZone: tz })).getTime() - new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
export function dayStart(now: Date, tz: string): Date {
  const local = new Date(now.getTime() + offset(now, tz));
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnight - offset(new Date(midnight), tz));
}
const isManager = (v: Viewer) => v.role === 'CENTER_ADMIN' || v.role === 'COORDINATOR';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trial: TrialService,
    private readonly audit: AuditService,
    private readonly notices: NoticesService,
  ) {}

  async view(rows: Prisma.AppointmentGetPayload<{ include: { child: true; notices: true } }>[]) {
    const team = await this.prisma.membership.findMany({ where: { id: { in: uniq(rows.map((r) => r.membershipId)) } }, select: { id: true, user: { select: { displayName: true } } } });
    return rows.map((a) => ({
      id: a.id, childId: a.childId, child: a.child.preferredName ?? a.child.firstName, childFull: `${a.child.firstName} ${a.child.lastName}`, membershipId: a.membershipId,
      therapist: team.find((t) => t.id === a.membershipId)?.user.displayName ?? '', service: a.service, startsAt: a.startsAt, endsAt: a.endsAt,
      room: a.room, status: a.status, statusReason: a.statusReason, version: a.version, seriesId: a.seriesId, isException: a.isException,
      reminderSentAt: a.notices.find((n) => n.kind === 'reminder_24h' && n.startsAt.getTime() === a.startsAt.getTime())?.sentAt ?? null,
    }));
  }

  async list(centerId: string, v: Viewer, q: RangeQuery) {
    const from = new Date(q.from);
    const to = new Date(q.to);
    if (!(to > from) || to.getTime() - from.getTime() > 42 * DAY) throw new UnprocessableEntityException('Choose a range of up to 6 weeks.');
    const rows = await this.prisma.appointment.findMany({
      where: {
        centerId, startsAt: { gte: from, lt: to },
        ...(v.role === 'THERAPIST' ? { membershipId: v.membershipId } : q.membershipId ? { membershipId: q.membershipId } : {}),
        ...(q.childId ? { childId: q.childId } : {}),
      },
      include: { child: true, notices: true }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: 500,
    });
    const center = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId }, select: { timezone: true } });
    return { items: await this.view(rows), timezone: center.timezone };
  }

  // Double-booking is checked under the center row lock taken by assertWritable.
  async clash(tx: Tx, a: { childId: string; membershipId: string; startsAt: Date; endsAt: Date }, excludeIds: string[] = []): Promise<string | null> {
    const overlap = { status: 'SCHEDULED' as const, startsAt: { lt: a.endsAt }, endsAt: { gt: a.startsAt }, ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}) };
    if (await tx.appointment.findFirst({ where: { ...overlap, membershipId: a.membershipId } })) return 'The therapist already has an appointment at this time.';
    if (await tx.appointment.findFirst({ where: { ...overlap, childId: a.childId } })) return 'The child already has an appointment at this time.';
    return null;
  }

  private async assertFree(tx: Tx, a: { childId: string; membershipId: string; startsAt: Date; endsAt: Date }, excludeId?: string) {
    const reason = await this.clash(tx, a, excludeId ? [excludeId] : []);
    if (reason) throw new ConflictException(reason);
  }

  async assertAssigned(tx: Tx, centerId: string, childId: string, membershipId: string, service: string) {
    const child = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
    if (!child) throw new NotFoundException('Child not found');
    const a = await tx.careAssignment.findFirst({ where: { childId, membershipId, service, endedAt: null, child: { centerId } } });
    if (!a) throw new UnprocessableEntityException('Assign this therapist to the child for this service before booking.');
    const m = await tx.membership.findFirst({ where: { id: membershipId, centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } } } });
    if (!m) throw new UnprocessableEntityException('This therapist is not active at the center.');
  }

  private checkTimes(startsAt: Date, endsAt: Date, now: Date) {
    if (!(endsAt > startsAt)) throw new UnprocessableEntityException('The end time must be after the start time.');
    if (endsAt.getTime() - startsAt.getTime() > 8 * 3_600_000) throw new UnprocessableEntityException('Appointments can last at most 8 hours.');
    if (startsAt.getTime() < now.getTime() - 60_000) throw new UnprocessableEntityException('Appointments cannot start in the past.');
  }

  async create(centerId: string, actorUserId: string, dto: AppointmentDto) {
    const now = this.trial.now();
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.checkTimes(startsAt, endsAt, now);
    const a = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      await this.assertAssigned(tx, centerId, dto.childId, dto.membershipId, dto.service);
      await this.assertFree(tx, { childId: dto.childId, membershipId: dto.membershipId, startsAt, endsAt });
      const a = await tx.appointment.create({ data: { centerId, childId: dto.childId, membershipId: dto.membershipId, service: dto.service, startsAt, endsAt, room: dto.room || null, createdById: actorUserId, createdAt: now } });
      await logCenterEvent(tx, centerId, 'appointment.scheduled', now, { actorUserId, membershipId: dto.membershipId, meta: { childId: dto.childId, appointmentId: a.id, startsAt: startsAt.toISOString() } });
      return a;
    });
    await this.audit.record('appointment.scheduled', { actorUserId, meta: { centerId, appointmentId: a.id } });
    return { id: a.id };
  }

  async reschedule(centerId: string, actorUserId: string, id: string, dto: RescheduleDto) {
    const now = this.trial.now();
    const before = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const cur = await tx.appointment.findFirst({ where: { id, centerId } });
      if (!cur) throw new NotFoundException('Appointment not found');
      if (cur.status !== 'SCHEDULED') throw new ConflictException('Only scheduled appointments can be changed.');
      if (cur.startsAt <= now) throw new UnprocessableEntityException('Appointments that have started cannot be moved.');
      if (cur.version !== dto.version) throw new ConflictException('This appointment changed since you opened it. Reload to see the latest version.');
      const next = { membershipId: dto.membershipId ?? cur.membershipId, startsAt: dto.startsAt ? new Date(dto.startsAt) : cur.startsAt, endsAt: dto.endsAt ? new Date(dto.endsAt) : cur.endsAt };
      this.checkTimes(next.startsAt, next.endsAt, now);
      await this.assertAssigned(tx, centerId, cur.childId, next.membershipId, cur.service);
      await this.assertFree(tx, { childId: cur.childId, ...next }, id);
      await tx.appointment.update({ where: { id }, data: { ...next, ...(dto.room !== undefined ? { room: dto.room || null } : {}), isException: !!cur.seriesId, version: { increment: 1 } } });
      await logCenterEvent(tx, centerId, 'appointment.rescheduled', now, { actorUserId, membershipId: next.membershipId, meta: { childId: cur.childId, appointmentId: id, startsAt: next.startsAt.toISOString(), ...(cur.seriesId ? { seriesId: cur.seriesId } : {}) } });
      return cur.startsAt;
    });
    await this.notices.changed([{ id, before }], 'rescheduled');
  }

  async setStatus(centerId: string, v: Viewer, id: string, dto: AppointmentStatusDto) {
    const now = this.trial.now();
    if (dto.status !== 'COMPLETED' && !dto.reason) throw new UnprocessableEntityException('Give a reason of at least 3 characters.');
    const cancelled = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const cur = await tx.appointment.findFirst({ where: { id, centerId } });
      if (!cur) throw new NotFoundException('Appointment not found');
      if (!isManager(v) && (cur.membershipId !== v.membershipId || dto.status === 'CANCELLED')) throw new ForbiddenException('Therapists can record attendance only for their own appointments.');
      if (cur.status !== 'SCHEDULED') throw new ConflictException('This appointment is already closed.');
      if (dto.status !== 'CANCELLED' && cur.startsAt > now) throw new UnprocessableEntityException('Attendance can be recorded once the appointment has started.');
      await tx.appointment.update({ where: { id }, data: { status: dto.status, statusReason: dto.reason ?? null, ...(dto.status === 'CANCELLED' && cur.seriesId ? { isException: true } : {}), version: { increment: 1 } } });
      await logCenterEvent(tx, centerId, `appointment.${dto.status.toLowerCase()}`, now, { actorUserId: v.userId, membershipId: cur.membershipId, meta: { childId: cur.childId, appointmentId: id, ...(dto.reason ? { reason: dto.reason } : {}) } });
      return dto.status === 'CANCELLED';
    });
    if (cancelled) await this.notices.changed([{ id }], 'cancelled');
  }

  async dashboard(centerId: string, v: Viewer) {
    const now = this.trial.now();
    const center = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId } });
    const start = dayStart(now, center.timezone);
    const end = new Date(start.getTime() + DAY);
    const mine = v.role === 'THERAPIST' ? { membershipId: v.membershipId } : {};
    const children: Prisma.ChildWhereInput = { centerId, status: 'ACTIVE', ...childScope(v) };
    const [today, week, activeChildren, unassigned, noGuardian, therapists, pendingInvites, trial] = await Promise.all([
      this.prisma.appointment.findMany({ where: { centerId, ...mine, startsAt: { gte: start, lt: end } }, include: { child: true, notices: true }, orderBy: { startsAt: 'asc' } }),
      this.prisma.appointment.count({ where: { centerId, ...mine, status: 'SCHEDULED', startsAt: { gte: now, lt: new Date(start.getTime() + 7 * DAY) } } }),
      this.prisma.child.count({ where: children }),
      this.prisma.child.count({ where: { ...children, assignments: { none: { endedAt: null } } } }),
      this.prisma.child.count({ where: { ...children, guardians: { none: { removedAt: null } } } }),
      this.prisma.membership.count({ where: { centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } } } }),
      this.prisma.invitation.count({ where: { centerId, status: 'PENDING', expiresAt: { gt: now } } }),
      this.trial.status(centerId),
    ]);
    return { dayStart: start, timezone: center.timezone, today: await this.view(today), counts: { activeChildren, unassigned, noGuardian, therapists, pendingInvites, upcomingWeek: week }, trial };
  }

  // Guardians see only children linked to their own account, the care team's names and upcoming appointments.
  async family(centerId: string, v: Viewer) {
    const now = this.trial.now();
    const links = await this.prisma.guardianLink.findMany({
      where: { centerId, userId: v.userId, removedAt: null, child: { status: 'ACTIVE' } },
      include: {
        child: {
          include: {
            assignments: { where: { endedAt: null } },
            appointments: { where: { startsAt: { gte: new Date(now.getTime() - 120 * DAY), lt: new Date(now.getTime() + 60 * DAY) } }, orderBy: { startsAt: 'asc' }, take: 300 },
          },
        },
      },
    });
    const ids = uniq(links.flatMap((l) => [...l.child.assignments.map((a) => a.membershipId), ...l.child.appointments.map((a) => a.membershipId)]));
    const team = await this.prisma.membership.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, user: { select: { displayName: true } } } });
    const who = (id: string) => team.find((t) => t.id === id);
    const center = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId } });
    return {
      center: { name: center.name, timezone: center.timezone },
      children: links.map((l) => {
        const visit = (a: (typeof l.child.appointments)[number]) => ({
          id: a.id, startsAt: a.startsAt, endsAt: a.endsAt, service: a.service, room: a.status === 'CANCELLED' ? null : a.room, therapist: who(a.membershipId)?.user.displayName ?? '',
          status: a.status, changed: a.status === 'SCHEDULED' && a.version > 1, recurring: !!a.seriesId,
        });
        const past = l.child.appointments.filter((a) => a.startsAt < now);
        return {
          id: l.child.id, name: l.child.preferredName ?? l.child.firstName, fullName: `${l.child.firstName} ${l.child.lastName}`, relationship: l.relationship, remindersEnabled: l.remindersEnabled,
          team: l.child.assignments.map((a) => ({ name: who(a.membershipId)?.user.displayName ?? '', title: who(a.membershipId)?.title ?? null, service: a.service, isLead: a.isLead })),
          upcoming: l.child.appointments.filter((a) => a.startsAt >= now && a.status !== 'COMPLETED' && a.status !== 'NO_SHOW').slice(0, 40).map(visit),
          history: past.reverse().slice(0, 40).map(visit),
          attendance: { attended: past.filter((a) => a.status === 'COMPLETED').length, noShow: past.filter((a) => a.status === 'NO_SHOW').length, cancelled: past.filter((a) => a.status === 'CANCELLED').length, days: 120 },
        };
      }),
    };
  }

  // A guardian can switch appointment emails on or off for their own link only.
  async setPreference(centerId: string, v: Viewer, dto: FamilyPreferenceDto) {
    const now = this.trial.now();
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.guardianLink.updateMany({ where: { centerId, childId: dto.childId, userId: v.userId, removedAt: null }, data: { remindersEnabled: dto.reminders } });
      if (r.count !== 1) throw new NotFoundException('Child not found');
      await logCenterEvent(tx, centerId, dto.reminders ? 'guardian.reminders_on' : 'guardian.reminders_off', now, { actorUserId: v.userId, meta: { childId: dto.childId } });
    });
    return { childId: dto.childId, remindersEnabled: dto.reminders };
  }
}
