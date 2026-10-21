import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { MembershipStatus, Prisma, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CLOCK, Clock } from '../common/clock';
import { TrialService } from '../operations/trial.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ListStaffQuery, UpdateCenterDto, UpdateProfileDto, UpdateStaffDto } from './centers.dto';
import { DIRECTORY_ROLES, SETUP_STEPS, STAFF_ROLES, SetupKey, Tx, clean, completeSetupStep, describeEvents, logCenterEvent, uniq } from './history';

const PAGE_SIZE = 25;
const MANUAL_STEPS: SetupKey[] = ['review_permissions'];
type StatusAction = 'suspend' | 'reactivate' | 'revoke';
const TRANSITIONS: Record<StatusAction, { from: MembershipStatus[]; to: MembershipStatus; event: string }> = {
  suspend: { from: ['ACTIVE'], to: 'SUSPENDED', event: 'member.suspended' },
  reactivate: { from: ['SUSPENDED'], to: 'ACTIVE', event: 'member.reactivated' },
  revoke: { from: ['ACTIVE', 'SUSPENDED'], to: 'REVOKED', event: 'member.revoked' },
};
const staffRole = (r: Role) => (STAFF_ROLES as readonly string[]).includes(r);
const profileData = (dto: { title?: string; phone?: string; specialties?: string[]; responsibilities?: string[] }) => ({
  ...(dto.title !== undefined ? { title: dto.title || null } : {}),
  ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
  ...(dto.specialties !== undefined ? { specialties: uniq(dto.specialties) } : {}),
  ...(dto.responsibilities !== undefined ? { responsibilities: uniq(dto.responsibilities) } : {}),
});

type MemberRow = Prisma.MembershipGetPayload<{ include: { user: { select: { id: true; displayName: true; email: true } }; roles: { select: { role: true } } } }>;
const memberView = (m: MemberRow) => ({
  id: m.id, userId: m.userId, displayName: m.user.displayName, email: m.user.email, status: m.status,
  roles: m.roles.map((r) => r.role).sort(), title: m.title, phone: m.phone, specialties: m.specialties, responsibilities: m.responsibilities,
  statusReason: m.statusReason, statusChangedAt: m.statusChangedAt, joinedAt: m.createdAt,
});
const MEMBER_INCLUDE = { user: { select: { id: true, displayName: true, email: true } }, roles: { select: { role: true } } } as const;

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly trial: TrialService,
  ) {}

  async settings(centerId: string) {
    const c = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId } });
    return { id: c.id, name: c.name, slug: c.slug, timezone: c.timezone, country: c.country, city: c.city, specialties: c.specialties, status: c.status, version: c.version, createdAt: c.createdAt };
  }

  async updateSettings(centerId: string, actorUserId: string, dto: UpdateCenterDto) {
    const now = this.clock.now();
    const data = {
      ...(dto.name ? { name: clean(dto.name) } : {}), ...(dto.timezone ? { timezone: dto.timezone } : {}),
      ...(dto.country ? { country: clean(dto.country) } : {}), ...(dto.city ? { city: clean(dto.city) } : {}),
      ...(dto.specialties ? { specialties: uniq(dto.specialties) } : {}),
    };
    if (data.name && (await this.prisma.center.findFirst({ where: { id: { not: centerId }, name: { equals: data.name, mode: 'insensitive' } } }))) {
      throw new ConflictException('Another center already uses this name.');
    }
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.center.updateMany({ where: { id: centerId, version: dto.version }, data: { ...data, version: { increment: 1 } } });
      if (r.count !== 1) throw new ConflictException('These settings changed since you opened them. Reload to see the latest version.');
      await logCenterEvent(tx, centerId, 'center.updated', now, { actorUserId, meta: { fields: Object.keys(data) } });
      await completeSetupStep(tx, centerId, 'center_details', actorUserId, now);
    });
    await this.audit.record('center.updated', { actorUserId, meta: { centerId, fields: Object.keys(data) } });
    return this.settings(centerId);
  }

  async setup(centerId: string) {
    const [steps, staff, invites] = await Promise.all([
      this.prisma.centerSetupStep.findMany({ where: { centerId } }),
      this.prisma.membership.count({ where: { centerId, status: 'ACTIVE' } }),
      this.prisma.invitation.count({ where: { centerId, kind: 'STAFF' } }),
    ]);
    const users = await this.prisma.user.findMany({ where: { id: { in: steps.map((s) => s.completedById) } }, select: { id: true, displayName: true } });
    const items = SETUP_STEPS.map((key) => {
      const s = steps.find((x) => x.key === key);
      return { key, manual: MANUAL_STEPS.includes(key), completedAt: s?.completedAt ?? null, completedBy: users.find((u) => u.id === s?.completedById)?.displayName ?? null };
    });
    return { steps: items, done: items.filter((i) => i.completedAt).length, total: items.length, activeMembers: staff, invitationsSent: invites };
  }

  async completeStep(centerId: string, key: string, actorUserId: string) {
    if (!(SETUP_STEPS as readonly string[]).includes(key)) throw new NotFoundException('Unknown setup step');
    if (!MANUAL_STEPS.includes(key as SetupKey)) throw new UnprocessableEntityException('This step completes automatically when you finish the related task.');
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      const r = await completeSetupStep(tx, centerId, key as SetupKey, actorUserId, now);
      if (r.count) await logCenterEvent(tx, centerId, 'setup.step_completed', now, { actorUserId, meta: { key } });
    });
    return this.setup(centerId);
  }

  async staff(centerId: string, q: ListStaffQuery) {
    const scope: Prisma.MembershipWhereInput = { centerId, roles: { some: { role: { in: DIRECTORY_ROLES } } } };
    const where: Prisma.MembershipWhereInput = {
      ...scope,
      ...(q.role ? { AND: [{ roles: { some: { role: q.role as Role } } }] } : {}),
      status: q.status ? q.status : { in: ['ACTIVE', 'SUSPENDED'] },
      ...(q.specialty ? { specialties: { has: q.specialty } } : {}),
      ...(q.q ? { user: { OR: [{ displayName: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] } } : {}),
    };
    const page = q.page ?? 1;
    const [total, rows, counts] = await Promise.all([
      this.prisma.membership.count({ where }),
      this.prisma.membership.findMany({ where, include: MEMBER_INCLUDE, orderBy: [{ user: { displayName: 'asc' } }, { id: 'asc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      this.prisma.membership.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
    ]);
    return { total, page, pageSize: PAGE_SIZE, items: rows.map(memberView), counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) };
  }

  private async member(centerId: string, id: string, db: Tx | PrismaService = this.prisma) {
    const m = await db.membership.findFirst({ where: { id, centerId, roles: { some: { role: { in: DIRECTORY_ROLES } } } }, include: MEMBER_INCLUDE });
    if (!m) throw new NotFoundException('Team member not found');
    return m;
  }

  async memberDetail(centerId: string, id: string) {
    const m = await this.member(centerId, id);
    const events = await this.prisma.centerEvent.findMany({ where: { centerId, OR: [{ membershipId: id }, { subjectUserId: m.userId }] }, orderBy: { id: 'desc' }, take: 50 });
    return { ...memberView(m), events: await describeEvents(this.prisma, events) };
  }

  async updateMember(centerId: string, id: string, actorUserId: string, dto: UpdateStaffDto) {
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      const m = await this.member(centerId, id, tx);
      if (m.status === 'REVOKED') throw new ConflictException('Access was revoked. Send a new invitation to restore it.');
      const current = m.roles.map((r) => r.role);
      const next = dto.roles ? uniq([...current.filter((r) => !staffRole(r)), ...(dto.roles as Role[])]) : current;
      if (!next.some((r) => DIRECTORY_ROLES.includes(r))) throw new UnprocessableEntityException('Keep at least one role. To remove access, revoke it instead.');
      const added = next.filter((r) => !current.includes(r));
      if (added.includes('THERAPIST') && m.status === 'ACTIVE') await this.trial.assertTherapistSeat(tx, centerId, now, id);
      const removed = current.filter((r) => !next.includes(r));
      if (removed.length) await tx.roleAssignment.deleteMany({ where: { membershipId: id, role: { in: removed } } });
      if (added.length) await tx.roleAssignment.createMany({ data: added.map((role) => ({ membershipId: id, role })) });
      const profile = profileData(dto);
      await tx.membership.update({ where: { id }, data: profile });
      await logCenterEvent(tx, centerId, 'member.updated', now, { actorUserId, subjectUserId: m.userId, membershipId: id, meta: { added, removed, fields: Object.keys(profile) } });
    });
    await this.audit.record('member.updated', { actorUserId, meta: { centerId, membershipId: id } });
    return this.memberDetail(centerId, id);
  }

  async changeStatus(centerId: string, id: string, actor: { userId: string; membershipId: string }, action: StatusAction, reason?: string) {
    if (id === actor.membershipId) throw new UnprocessableEntityException('You cannot change your own access. Ask another administrator.');
    const t = TRANSITIONS[action];
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      // Serialise status changes per center so two administrators cannot remove each other at the same time.
      await tx.$queryRaw`SELECT id FROM "center" WHERE id = ${centerId}::uuid FOR UPDATE`;
      const m = await this.member(centerId, id, tx);
      if (!t.from.includes(m.status)) throw new ConflictException(`This member is ${m.status.toLowerCase()}, so that change is not available.`);
      if (action === 'reactivate' && m.roles.some((r) => r.role === 'THERAPIST')) await this.trial.assertTherapistSeat(tx, centerId, now, id);
      if (action !== 'reactivate' && m.status === 'ACTIVE' && m.roles.some((r) => r.role === 'CENTER_ADMIN')) {
        const others = await tx.membership.count({ where: { centerId, status: 'ACTIVE', id: { not: id }, roles: { some: { role: 'CENTER_ADMIN' } } } });
        if (!others) throw new ConflictException('This is the only active administrator. Ask the TheraBridge platform team to invite another administrator first.');
      }
      await tx.membership.update({ where: { id }, data: { status: t.to, statusReason: action === 'reactivate' ? null : reason ?? null, statusChangedAt: now } });
      if (t.to !== 'ACTIVE') {
        await tx.session.updateMany({ where: { activeMembershipId: id, revokedAt: null }, data: { revokedAt: now, revokedReason: `membership_${action}` } });
      }
      await logCenterEvent(tx, centerId, t.event, now, { actorUserId: actor.userId, subjectUserId: m.userId, membershipId: id, meta: reason ? { reason } : {} });
    });
    await this.audit.record(t.event as 'member.suspended', { actorUserId: actor.userId, meta: { centerId, membershipId: id } });
    return this.memberDetail(centerId, id);
  }

  async me(centerId: string, membershipId: string) {
    const m = await this.prisma.membership.findFirstOrThrow({ where: { id: membershipId, centerId }, include: MEMBER_INCLUDE });
    return memberView(m);
  }

  async updateMe(centerId: string, membershipId: string, actor: { userId: string; role: Role }, dto: UpdateProfileDto) {
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      if (dto.displayName) await tx.user.update({ where: { id: actor.userId }, data: { displayName: clean(dto.displayName) } });
      const profile = profileData(dto);
      await tx.membership.update({ where: { id: membershipId }, data: profile });
      const fields = [...Object.keys(profile), ...(dto.displayName ? ['displayName'] : [])];
      await logCenterEvent(tx, centerId, 'member.profile_updated', now, { actorUserId: actor.userId, subjectUserId: actor.userId, membershipId, meta: { fields } });
      if (actor.role === 'CENTER_ADMIN') await completeSetupStep(tx, centerId, 'your_profile', actor.userId, now);
    });
    await this.audit.record('member.profile_updated', { actorUserId: actor.userId, meta: { centerId, membershipId } });
    return this.me(centerId, membershipId);
  }
}
