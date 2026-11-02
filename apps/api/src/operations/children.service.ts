import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { assertActor } from '../clinical/governance-core';
import type { Viewer } from '../common/viewer';
export type { Viewer } from '../common/viewer';
import { describeEvents, invitationView, logCenterEvent, uniq, withUniqueGuard } from '../centers/history';
import { InvitationsService } from '../centers/invitations.service';
import { terminateTherapistCare } from '../centers/therapist-lifecycle';
import { normalizeEmail } from '../common/security';
import { PrismaService } from '../prisma/prisma.service';
import type { AssignmentDto, ChildDto, GuardianDto, ListChildrenQuery, UpdateChildDto, ReferentDto } from './operations.dto';
import { lockCenter, TrialService } from './trial.service';
import { NoticesService } from './notices.service';

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
// Therapists see only children they are actively assigned to; other center roles see the whole center.
export const childScope = (v: Viewer): Prisma.ChildWhereInput =>
  v.role === 'THERAPIST' ? { assignments: { some: { membershipId: v.membershipId, endedAt: null } } } : {};
const dob = (s: string) => new Date(`${s}T00:00:00Z`);

@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trial: TrialService,
    private readonly invitations: InvitationsService,
    private readonly audit: AuditService,
    private readonly notices: NoticesService,
  ) {}

  private checkDob(s: string, now: Date) {
    if (dob(s) > now) throw new UnprocessableEntityException('Date of birth cannot be in the future.');
  }

  private names(ids: string[]) {
    return this.prisma.membership.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, user: { select: { displayName: true } } } });
  }

  async list(centerId: string, v: Viewer, q: ListChildrenQuery) {
    const now = this.trial.now();
    const rows = await this.prisma.child.findMany({
      where: {
        centerId, status: q.status ?? 'ACTIVE', ...childScope(v),
        ...(q.q ? { OR: [{ firstName: { contains: q.q, mode: 'insensitive' } }, { lastName: { contains: q.q, mode: 'insensitive' } }, { preferredName: { contains: q.q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }], take: 200,
      include: {
        guardians: { where: { removedAt: null }, select: { id: true } },
        assignments: { where: { endedAt: null }, select: { membershipId: true, service: true } },
        appointments: { where: { status: 'SCHEDULED', startsAt: { gte: now } }, orderBy: { startsAt: 'asc' }, take: 1, select: { startsAt: true } },
      },
    });
    const team = await this.names(uniq(rows.flatMap((r) => r.assignments.map((a) => a.membershipId))));
    return {
      items: rows.map((c) => ({
        id: c.id, firstName: c.firstName, lastName: c.lastName, preferredName: c.preferredName, dateOfBirth: c.dateOfBirth.toISOString().slice(0, 10),
        services: c.services, status: c.status, guardians: c.guardians.length, nextAppointment: c.appointments[0]?.startsAt ?? null,
        team: c.assignments.map((a) => ({ service: a.service, name: team.find((t) => t.id === a.membershipId)?.user.displayName ?? '' })),
      })),
    };
  }

  async create(centerId: string, actorUserId: string, dto: ChildDto) {
    const now = this.trial.now();
    this.checkDob(dto.dateOfBirth, now);
    const child = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertChildCapacity(tx, centerId, now);
      const c = await tx.child.create({
        data: { centerId, firstName: clean(dto.firstName), lastName: clean(dto.lastName), preferredName: dto.preferredName ? clean(dto.preferredName) : null, dateOfBirth: dob(dto.dateOfBirth), services: uniq(dto.services), createdById: actorUserId, createdAt: now },
      });
      await logCenterEvent(tx, centerId, 'child.registered', now, { actorUserId, meta: { childId: c.id } });
      return c;
    });
    await this.audit.record('child.registered', { actorUserId, meta: { centerId, childId: child.id } });
    return { id: child.id };
  }

  async child(centerId: string, id: string, v?: Viewer) {
    const c = await this.prisma.child.findFirst({ where: { id, centerId, ...(v ? childScope(v) : {}) } });
    if (!c) throw new NotFoundException('Child not found');
    return c;
  }

  async detail(centerId: string, v: Viewer, id: string) {
    const now = this.trial.now();
    const c = await this.prisma.child.findFirst({
      where: { id, centerId, ...childScope(v) },
      include: {
        guardians: { where: { removedAt: null }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        assignments: { orderBy: [{ endedAt: { sort: 'desc', nulls: 'first' } }, { startedAt: 'desc' }] },
        appointments: { where: { startsAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } }, orderBy: { startsAt: 'asc' }, take: 50 },
      },
    });
    if (!c) throw new NotFoundException('Child not found');
    const team = await this.names(uniq([...c.assignments.map((a) => a.membershipId), ...c.appointments.map((a) => a.membershipId)]));
    const name = (m: string) => team.find((t) => t.id === m)?.user.displayName ?? '';
    const invites = await this.prisma.invitation.findMany({ where: { centerId, kind: 'GUARDIAN', guardianLinkId: { in: c.guardians.map((g) => g.id) } }, orderBy: { createdAt: 'desc' } });
    const events = await this.prisma.centerEvent.findMany({ where: { centerId, meta: { path: ['childId'], equals: id } }, orderBy: { id: 'desc' }, take: 50 });
    const manager = v.role === 'CENTER_ADMIN' || v.role === 'COORDINATOR';
    const { timezone } = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId }, select: { timezone: true } });
    const designated = c.referentMembershipId && c.status === 'ACTIVE'
      ? await this.prisma.membership.findFirst({ where: {
        id: c.referentMembershipId, centerId, status: 'ACTIVE',
        user: { status: 'ACTIVE' }, roles: { some: { role: 'THERAPIST' } },
      }, select: { id: true, specialties: true, user: { select: { displayName: true } } } })
      : null;
    const currentReferent = designated && c.assignments.some(a =>
      a.membershipId === designated.id && a.endedAt === null && designated.specialties.includes(a.service))
      ? { membershipId: designated.id, displayName: designated.user.displayName } : null;
    return {
      timezone,
      id: c.id, firstName: c.firstName, lastName: c.lastName, preferredName: c.preferredName, dateOfBirth: c.dateOfBirth.toISOString().slice(0, 10),
      services: c.services, status: c.status, version: c.version, createdAt: c.createdAt,
      referent: currentReferent, referentRevision: c.referentRevision,
      referentStatus: !c.referentMembershipId ? 'NOT_DESIGNATED' : currentReferent ? 'ACTIVE' : 'UNAVAILABLE',
      guardians: c.guardians.map((g) => {
        const inv = invites.find((i) => i.guardianLinkId === g.id);
        return {
          id: g.id, displayName: g.displayName, relationship: g.relationship, isPrimary: g.isPrimary, portalStatus: g.userId ? 'CONNECTED' : inv ? invitationView(inv, now).status : 'NOT_INVITED',
          ...(manager ? { email: g.email, invitationId: inv?.id ?? null } : {}),
        };
      }),
      assignments: c.assignments.map((a) => ({ id: a.id, membershipId: a.membershipId, therapist: name(a.membershipId), title: team.find((t) => t.id === a.membershipId)?.title ?? null, service: a.service, isLead: a.isLead, startedAt: a.startedAt, endedAt: a.endedAt })),
      appointments: c.appointments.map((a) => ({ id: a.id, startsAt: a.startsAt, endsAt: a.endsAt, service: a.service, status: a.status, room: a.room, therapist: name(a.membershipId), membershipId: a.membershipId, version: a.version })),
      events: await describeEvents(this.prisma, events),
    };
  }

  async update(centerId: string, actorUserId: string, id: string, dto: UpdateChildDto) {
    const now = this.trial.now();
    if (dto.dateOfBirth) this.checkDob(dto.dateOfBirth, now);
    const data = {
      ...(dto.firstName ? { firstName: clean(dto.firstName) } : {}), ...(dto.lastName ? { lastName: clean(dto.lastName) } : {}),
      ...(dto.preferredName !== undefined ? { preferredName: dto.preferredName ? clean(dto.preferredName) : null } : {}),
      ...(dto.dateOfBirth ? { dateOfBirth: dob(dto.dateOfBirth) } : {}), ...(dto.services ? { services: uniq(dto.services) } : {}),
    };
    await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const r = await tx.child.updateMany({ where: { id, centerId, version: dto.version }, data: { ...data, version: { increment: 1 } } });
      if (r.count !== 1) {
        if (!(await tx.child.findFirst({ where: { id, centerId } }))) throw new NotFoundException('Child not found');
        throw new ConflictException('This record changed since you opened it. Reload to see the latest version.');
      }
      await logCenterEvent(tx, centerId, 'child.updated', now, { actorUserId, meta: { childId: id, fields: Object.keys(data) } });
    });
  }

  async setStatus(centerId: string, actorUserId: string, id: string, status: 'ACTIVE' | 'ARCHIVED', reason?: string) {
    const now = this.trial.now();
    const affected = await this.prisma.$transaction(async (tx) => {
      // Global lock order: centre (trial/capacity) -> child -> assignment -> history.
      // Reading referent/revision before the child lock can orphan a new
      // concurrent designation when this transaction archives the child.
      if (status === 'ACTIVE') await this.trial.assertChildCapacity(tx, centerId, now);
      else await this.trial.assertWritable(tx, centerId, now);
      await tx.$queryRaw`SELECT id FROM child WHERE id=${id}::uuid AND center_id=${centerId}::uuid FOR UPDATE`;
      const c = await tx.child.findFirst({ where: { id, centerId } });
      if (!c) throw new NotFoundException('Child not found');
      if (c.status === status) throw new ConflictException(status === 'ACTIVE' ? 'This child is already active.' : 'This child is already archived.');
      await tx.child.update({ where: { id }, data: { status, version: { increment: 1 } } });
      let near: { id: string; before: Date }[] = [];
      if (status === 'ARCHIVED') {
        if (c.referentMembershipId) {
          await tx.child.update({ where: { id }, data: {
            referentMembershipId: null, referentRevision: { increment: 1 }, version: { increment: 1 },
          } });
          await tx.childReferentHistory.create({ data: {
            centerId, childId: id, actorUserId, previousMembershipId: c.referentMembershipId,
            nextMembershipId: null, reason: 'Child archived', revision: c.referentRevision + 1, createdAt: now,
          } });
        }
        near = (await tx.appointment.findMany({ where: { centerId, childId: id, status: 'SCHEDULED', startsAt: { gte: now, lte: new Date(now.getTime() + 14 * 86_400_000) } }, select: { id: true, startsAt: true } })).map((a) => ({ id: a.id, before: a.startsAt }));
        await tx.appointment.updateMany({ where: { centerId, childId: id, status: 'SCHEDULED', startsAt: { gte: now } }, data: { status: 'CANCELLED', statusReason: 'Child record archived', version: { increment: 1 } } });
        await tx.appointmentSeries.updateMany({ where: { centerId, childId: id, status: 'ACTIVE' }, data: { status: 'ENDED', version: { increment: 1 } } });
        await tx.careAssignment.updateMany({ where: { centerId, childId: id, endedAt: null }, data: { endedAt: now, isLead: false } });
      }
      await logCenterEvent(tx, centerId, status === 'ACTIVE' ? 'child.restored' : 'child.archived', now, { actorUserId, meta: { childId: id, ...(reason ? { reason } : {}) } });
      return near;
    });
    await this.notices.changed(affected, 'cancelled');
  }

  private async invite(tx: Prisma.TransactionClient, centerId: string, link: { id: string; email: string; displayName: string }, actorUserId: string, now: Date) {
    return this.invitations.createInTx(tx, { centerId, kind: 'GUARDIAN', email: link.email, displayName: link.displayName, roles: ['GUARDIAN'], guardianLinkId: link.id, invitedById: actorUserId }, now);
  }

  async addGuardian(centerId: string, actorUserId: string, childId: string, dto: GuardianDto) {
    const now = this.trial.now();
    const emailNorm = normalizeEmail(dto.email);
    const result = await withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      const center = await this.trial.assertWritable(tx, centerId, now);
      const child = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
      if (!child) throw new NotFoundException('Child not found');
      if (dto.isPrimary) await tx.guardianLink.updateMany({ where: { centerId, childId, removedAt: null, isPrimary: true }, data: { isPrimary: false } });
      // Every guardian, even one already connected at this center, must accept an invitation before seeing this child.
      const link = await tx.guardianLink.create({
        data: { centerId, childId, displayName: clean(dto.displayName), email: dto.email.trim(), emailNorm, relationship: dto.relationship, isPrimary: !!dto.isPrimary, userId: null, createdAt: now },
      });
      await logCenterEvent(tx, centerId, 'guardian.added', now, { actorUserId, meta: { childId, guardianLinkId: link.id, invitee: link.displayName } });
      const sent = dto.invite ? await this.invite(tx, centerId, link, actorUserId, now) : null;
      return { link, sent, centerName: center.name };
    }), 'This guardian is already linked to the child, or a pending invitation already exists for this email.');
    if (result.sent) this.invitations.deliver(result.sent.invitation, result.centerName, result.sent.token);
    return { id: result.link.id, connected: !!result.link.userId, invited: !!result.sent };
  }

  async sendGuardianInvite(centerId: string, actorUserId: string, childId: string, linkId: string) {
    const link = await this.prisma.guardianLink.findFirst({ where: { id: linkId, childId, centerId, removedAt: null } });
    if (!link) throw new NotFoundException('Guardian not found');
    if (link.userId) throw new ConflictException('This guardian is already connected to the family portal.');
    const pending = await this.prisma.invitation.findFirst({ where: { centerId, guardianLinkId: linkId, status: 'PENDING' } });
    if (pending) {
      await this.prisma.$transaction((tx) => this.trial.assertWritable(tx, centerId, this.trial.now()));
      return this.invitations.resend(centerId, pending.id, actorUserId, 'GUARDIAN');
    }
    const now = this.trial.now();
    const r = await withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      const center = await this.trial.assertWritable(tx, centerId, now);
      return { ...(await this.invite(tx, centerId, link, actorUserId, now)), centerName: center.name };
    }), 'A pending invitation already exists for this email.');
    this.invitations.deliver(r.invitation, r.centerName, r.token);
    return invitationView(r.invitation, now);
  }

  async removeGuardian(centerId: string, actorUserId: string, childId: string, linkId: string, reason: string) {
    const now = this.trial.now();
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.guardianLink.updateMany({ where: { id: linkId, childId, centerId, removedAt: null }, data: { removedAt: now, isPrimary: false } });
      if (r.count !== 1) throw new NotFoundException('Guardian not found');
      await tx.invitation.updateMany({ where: { centerId, guardianLinkId: linkId, status: 'PENDING' }, data: { status: 'REVOKED', revokedAt: now, revokedById: actorUserId } });
      await logCenterEvent(tx, centerId, 'guardian.removed', now, { actorUserId, meta: { childId, guardianLinkId: linkId, reason } });
    });
  }

  // Non-authorizing child-wide coordination designation. Unlike per-service
  // isLead, this may only be set explicitly by an active centre administrator.
  async setReferent(centerId: string, v: Viewer, childId: string, dto: ReferentDto) {
    if (dto.membershipId === undefined) throw new UnprocessableEntityException('Explicitly choose a therapist or clear the designation.');
    const now = this.trial.now();
    return this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      await assertActor(tx, centerId, v, ['CENTER_ADMIN']);
      await tx.$queryRaw`SELECT id FROM child WHERE id=${childId}::uuid AND center_id=${centerId}::uuid FOR UPDATE`;
      const child = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
      if (!child) throw new NotFoundException('Active child not found.');
      if (child.version !== dto.version) throw new ConflictException('This child changed. Reload before reassigning the referent.');
      const next = dto.membershipId ?? null;
      if (child.referentMembershipId === next) throw new ConflictException('This referent designation is already current.');
      if (next) {
        const member = await tx.membership.findFirst({
          where: { id: next, centerId, status: 'ACTIVE', user: { status: 'ACTIVE' },
            roles: { some: { role: 'THERAPIST' } } },
          select: { id: true, specialties: true },
        });
        const assigned = member && await tx.careAssignment.findFirst({
          where: { centerId, childId, membershipId: next, endedAt: null, service: { in: member.specialties } },
          select: { id: true },
        });
        if (!assigned) throw new UnprocessableEntityException('Choose an active therapist assigned to this child.');
      }
      const updated = await tx.child.updateMany({
        where: { id: childId, centerId, version: dto.version },
        data: { referentMembershipId: next, referentRevision: { increment: 1 }, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException('This child changed before the designation could be saved.');
      const revision = child.referentRevision + 1;
      await tx.childReferentHistory.create({ data: {
        centerId, childId, actorUserId: v.userId,
        previousMembershipId: child.referentMembershipId, nextMembershipId: next,
        reason: dto.reason.trim(), revision, createdAt: now,
      } });
      await logCenterEvent(tx, centerId, 'child.referent_changed', now, {
        actorUserId: v.userId, meta: { childId, previousMembershipId: child.referentMembershipId,
          nextMembershipId: next, revision, reason: dto.reason.trim() },
      });
      return { referentMembershipId: next, referentRevision: revision, version: dto.version + 1 };
    });
  }

  async assign(centerId: string, actorUserId: string, childId: string, dto: AssignmentDto) {
    const now = this.trial.now();
    return withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const child = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
      if (!child) throw new NotFoundException('Child not found');
      const m = await tx.membership.findFirst({ where: { id: dto.membershipId, centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } } }, include: { user: true } });
      if (!m) throw new UnprocessableEntityException('Choose an active therapist from this center.');
      if (!m.specialties.includes(dto.service)) throw new UnprocessableEntityException('This therapist’s profile does not list that specialty. Update their specialties in Team first.');
      if (!child.services.includes(dto.service)) throw new UnprocessableEntityException('Add this service to the child’s profile before assigning a therapist for it.');
      if (dto.isLead) await tx.careAssignment.updateMany({ where: { centerId, childId, service: dto.service, endedAt: null, isLead: true }, data: { isLead: false } });
      const a = await tx.careAssignment.create({ data: { centerId, childId, membershipId: m.id, service: dto.service, isLead: !!dto.isLead, startedAt: now } });
      await logCenterEvent(tx, centerId, 'assignment.started', now, { actorUserId, subjectUserId: m.userId, membershipId: m.id, meta: { childId, service: dto.service } });
      return { id: a.id };
    }), 'This therapist is already assigned to this child for that service.');
  }

  async endAssignment(centerId: string, actorUserId: string, childId: string, assignmentId: string) {
    const now = this.trial.now();
    const cascade = await this.prisma.$transaction(async (tx) => {
      // Match clinical.write/setReferent: the centre must be locked first.
      // Do not add a new trial-expiry permission gate to assignment ending.
      await lockCenter(tx, centerId);
      await tx.$queryRaw`SELECT id FROM child WHERE id=${childId}::uuid AND center_id=${centerId}::uuid FOR UPDATE`;
      const child = await tx.child.findFirst({ where: { id: childId, centerId } });
      if (!child) throw new NotFoundException('Child not found');
      const a = await tx.careAssignment.findFirst({ where: { id: assignmentId, childId, centerId, endedAt: null } });
      if (!a) throw new NotFoundException('Active assignment not found');
      const result = await terminateTherapistCare(tx, centerId, a.membershipId, actorUserId, now, 'Therapist assignment ended', { childId, service: a.service });
      await logCenterEvent(tx, centerId, 'assignment.ended', now, { actorUserId, membershipId: a.membershipId, meta: { childId, service: a.service, cancelledAppointments: result.cancelledAppointments, endedSeries: result.endedSeries } });
      return result;
    });
    await this.notices.changed(cascade.noticeAppointments, 'cancelled');
  }

  async therapists(centerId: string, options: { offset?: number; limit?: number; service?: string; search?: string; ids?: string[] } = {}) {
    const offset = options.offset ?? 0, limit = options.limit ?? 100;
    const batch = await this.prisma.membership.findMany({ where: {
      centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } },
      ...(options.service ? { specialties: { has: options.service } } : {}),
      ...(options.search ? { user: { displayName: { contains: options.search, mode: 'insensitive' } } } : {}),
      ...(options.ids ? { id: { in: options.ids } } : {}),
    }, include: { user: { select: { displayName: true } } },
    orderBy: [{ user: { displayName: 'asc' } }, { id: 'asc' }], skip: offset, take: limit + 1 });
    const hasMore = batch.length > limit;
    return { items: batch.slice(0, limit).map((m) => ({ membershipId: m.id, displayName: m.user.displayName,
      title: m.title, specialties: m.specialties })), hasMore, nextOffset: hasMore ? offset + limit : null };
  }
}
