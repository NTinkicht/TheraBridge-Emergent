import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Tx, logCenterEvent } from '../centers/history';
import { addDays, asDate, daysBetween, fromDate, isoWeekday, localDate, zonedToUtc } from '../common/zoned';
import { PrismaService } from '../prisma/prisma.service';
import type { Viewer } from './children.service';
import { NoticesService } from './notices.service';
import type { SeriesCancelDto, SeriesDto, SeriesUpdateDto } from './operations.dto';
import { ScheduleService } from './schedule.service';
import { TrialService } from './trial.service';

const MAX_DAYS = 182;
const MAX_VISITS = 60;

// Dates in [start, until] on the chosen ISO weekdays, every `interval` weeks counted from the week of `start`.
export function expand(start: string, until: string, weekdays: number[], interval: number, count?: number): string[] {
  const monday = addDays(start, 1 - isoWeekday(start));
  const out: string[] = [];
  for (let d = start; daysBetween(d, until) >= 0 && out.length < (count ?? MAX_VISITS + 1); d = addDays(d, 1)) {
    if (Math.floor(daysBetween(monday, d) / 7) % interval === 0 && weekdays.includes(isoWeekday(d))) out.push(d);
  }
  return out;
}

const clashError = (message: string, conflicts: { date: string; reason: string }[]) =>
  new ConflictException({ statusCode: 409, error: 'Conflict', message, conflicts });

@Injectable()
export class SeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trial: TrialService,
    private readonly schedule: ScheduleService,
    private readonly notices: NoticesService,
    private readonly audit: AuditService,
  ) {}

  private tz(tx: Tx, centerId: string) {
    return tx.center.findUniqueOrThrow({ where: { id: centerId }, select: { timezone: true } }).then((c) => c.timezone);
  }

  async create(centerId: string, actorUserId: string, dto: SeriesDto) {
    const now = this.trial.now();
    if (!dto.untilDate && !dto.count) throw new UnprocessableEntityException('Choose an end date or a number of visits.');
    const until = dto.untilDate ?? addDays(dto.startDate, MAX_DAYS);
    if (daysBetween(dto.startDate, until) < 0) throw new UnprocessableEntityException('The end date must be on or after the start date.');
    if (daysBetween(dto.startDate, until) > MAX_DAYS) throw new UnprocessableEntityException('A repeating series can cover at most 26 weeks.');
    const r = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const tz = await this.tz(tx, centerId);
      if (daysBetween(localDate(now, tz), dto.startDate) < 0) throw new UnprocessableEntityException('The series cannot start in the past.');
      const dates = expand(dto.startDate, until, uniqDays(dto.weekdays), dto.intervalWeeks, dto.count).filter((d) => zonedToUtc(d, dto.startTime, tz) >= now);
      if (!dates.length) throw new UnprocessableEntityException('No visits fall on the chosen days between these dates.');
      if (dates.length > MAX_VISITS) throw new UnprocessableEntityException(`A repeating series can include at most ${MAX_VISITS} visits.`);
      await this.schedule.assertAssigned(tx, centerId, dto.childId, dto.membershipId, dto.service);
      const slots = dates.map((date) => {
        const startsAt = zonedToUtc(date, dto.startTime, tz);
        return { date, startsAt, endsAt: new Date(startsAt.getTime() + dto.durationMinutes * 60_000) };
      });
      const reasons = await this.schedule.clashesForSlots(tx, slots.map((s) => ({ childId: dto.childId, membershipId: dto.membershipId, startsAt: s.startsAt, endsAt: s.endsAt })));
      const conflicts: { date: string; reason: string }[] = slots.flatMap((s, i) => reasons[i] ? [{ date: s.date, reason: reasons[i]! }] : []);
      if (conflicts.length && (!dto.skipConflicts || conflicts.length === slots.length)) {
        throw clashError(`${conflicts.length} of ${slots.length} visits clash with existing appointments.`, conflicts);
      }
      const free = slots.filter((s) => !conflicts.some((c) => c.date === s.date));
      const series = await tx.appointmentSeries.create({
        data: {
          centerId, childId: dto.childId, membershipId: dto.membershipId, service: dto.service, room: dto.room || null, startTime: dto.startTime, durationMin: dto.durationMinutes,
          weekdays: uniqDays(dto.weekdays), intervalWeeks: dto.intervalWeeks, startDate: asDate(dto.startDate), untilDate: asDate(dates[dates.length - 1]), createdById: actorUserId, createdAt: now,
        },
      });
      await tx.appointment.createMany({
        data: free.map((s) => ({ centerId, childId: dto.childId, membershipId: dto.membershipId, service: dto.service, startsAt: s.startsAt, endsAt: s.endsAt, room: dto.room || null, createdById: actorUserId, createdAt: now, seriesId: series.id, occurrenceDate: asDate(s.date) })),
      });
      await logCenterEvent(tx, centerId, 'series.scheduled', now, { actorUserId, membershipId: dto.membershipId, meta: { childId: dto.childId, seriesId: series.id, visits: free.length, skipped: conflicts.map((c) => c.date) } });
      return { id: series.id, created: free.length, skipped: conflicts };
    });
    await this.audit.record('series.scheduled', { actorUserId, meta: { centerId, seriesId: r.id } });
    return r;
  }

  async detail(centerId: string, v: Viewer, id: string) {
    const s = await this.prisma.appointmentSeries.findFirst({ where: { id, centerId, ...(v.role === 'THERAPIST' ? { membershipId: v.membershipId } : {}) } });
    if (!s) throw new NotFoundException('Series not found');
    const rows = await this.prisma.appointment.findMany({ where: { seriesId: id }, include: { child: true, notices: true }, orderBy: { startsAt: 'asc' } });
    return {
      id: s.id, childId: s.childId, membershipId: s.membershipId, service: s.service, room: s.room, startTime: s.startTime, durationMinutes: s.durationMin, weekdays: s.weekdays,
      intervalWeeks: s.intervalWeeks, startDate: fromDate(s.startDate), untilDate: fromDate(s.untilDate), status: s.status, version: s.version, occurrences: await this.schedule.view(rows),
    };
  }

  // "This and following": moves every untouched future visit from `fromDate`, keeping each visit's date.
  async update(centerId: string, actorUserId: string, id: string, dto: SeriesUpdateDto) {
    const now = this.trial.now();
    const moved = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const s = await tx.appointmentSeries.findFirst({ where: { id, centerId } });
      if (!s) throw new NotFoundException('Series not found');
      if (s.status !== 'ACTIVE') throw new ConflictException('This series has ended.');
      if (s.version !== dto.version) throw new ConflictException('This series changed since you opened it. Reload to see the latest version.');
      const tz = await this.tz(tx, centerId);
      const next = { membershipId: dto.membershipId ?? s.membershipId, startTime: dto.startTime ?? s.startTime, durationMin: dto.durationMinutes ?? s.durationMin };
      await this.schedule.assertAssigned(tx, centerId, s.childId, next.membershipId, s.service);
      const occ = await tx.appointment.findMany({ where: { seriesId: id, status: 'SCHEDULED', isException: false, occurrenceDate: { gte: asDate(dto.fromDate) }, startsAt: { gt: now } }, orderBy: { startsAt: 'asc' } });
      if (!occ.length) throw new UnprocessableEntityException('There are no upcoming visits in this series from that date.');
      const plan = occ.map((o) => {
        const startsAt = zonedToUtc(fromDate(o.occurrenceDate!), next.startTime, tz);
        return { o, startsAt, endsAt: new Date(startsAt.getTime() + next.durationMin * 60_000) };
      });
      if (plan.some((p) => p.startsAt < now)) throw new UnprocessableEntityException('Visits cannot be moved into the past.');
      const reasons = await this.schedule.clashesForSlots(tx, plan.map((p) => ({ childId: s.childId, membershipId: next.membershipId, startsAt: p.startsAt, endsAt: p.endsAt })), plan.map((x) => x.o.id));
      const conflicts: { date: string; reason: string }[] = plan.flatMap((p, i) => reasons[i] ? [{ date: fromDate(p.o.occurrenceDate!), reason: reasons[i]! }] : []);
      if (conflicts.length) throw clashError(`${conflicts.length} of ${plan.length} visits would clash. Nothing was changed.`, conflicts);
      for (const p of plan) {
        await tx.appointment.update({ where: { id: p.o.id }, data: { membershipId: next.membershipId, startsAt: p.startsAt, endsAt: p.endsAt, ...(dto.room !== undefined ? { room: dto.room || null } : {}), version: { increment: 1 } } });
      }
      await tx.appointmentSeries.update({ where: { id }, data: { ...next, ...(dto.room !== undefined ? { room: dto.room || null } : {}), version: { increment: 1 } } });
      await logCenterEvent(tx, centerId, 'series.updated', now, { actorUserId, membershipId: next.membershipId, meta: { childId: s.childId, seriesId: id, fromDate: dto.fromDate, visits: plan.length } });
      return plan.map((p) => ({ id: p.o.id, before: p.o.startsAt }));
    });
    await this.notices.changed(moved, 'rescheduled');
    return { updated: moved.length };
  }

  async cancel(centerId: string, actorUserId: string, id: string, dto: SeriesCancelDto) {
    const now = this.trial.now();
    const cancelled = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const s = await tx.appointmentSeries.findFirst({ where: { id, centerId } });
      if (!s) throw new NotFoundException('Series not found');
      if (s.status !== 'ACTIVE') throw new ConflictException('This series has already ended.');
      const occ = await tx.appointment.findMany({ where: { seriesId: id, status: 'SCHEDULED', occurrenceDate: { gte: asDate(dto.fromDate) }, startsAt: { gt: now } }, select: { id: true, startsAt: true } });
      if (!occ.length) throw new UnprocessableEntityException('There are no upcoming visits in this series from that date.');
      await tx.appointment.updateMany({ where: { centerId, id: { in: occ.map((o) => o.id) } }, data: { status: 'CANCELLED', statusReason: dto.reason, version: { increment: 1 } } });
      const remaining = await tx.appointment.count({ where: { seriesId: id, status: 'SCHEDULED', startsAt: { gt: now } } });
      await tx.appointmentSeries.update({ where: { id }, data: { untilDate: asDate(addDays(dto.fromDate, -1)) < s.startDate ? s.startDate : asDate(addDays(dto.fromDate, -1)), ...(remaining ? {} : { status: 'ENDED' }), version: { increment: 1 } } });
      await logCenterEvent(tx, centerId, 'series.cancelled', now, { actorUserId, membershipId: s.membershipId, meta: { childId: s.childId, seriesId: id, fromDate: dto.fromDate, visits: occ.length, reason: dto.reason } });
      return occ.map((o) => ({ id: o.id, before: o.startsAt }));
    });
    await this.notices.changed(cancelled, 'cancelled');
    return { cancelled: cancelled.length };
  }
}

const uniqDays = (d: number[]) => [...new Set(d)].sort((a, b) => a - b);
