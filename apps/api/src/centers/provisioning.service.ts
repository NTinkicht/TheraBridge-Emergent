import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CLOCK, Clock } from '../common/clock';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCenterDto, ListCentersQuery } from './centers.dto';
import { SETUP_STEPS, clean, describeEvents, invitationView, logCenterEvent, uniq, withUniqueGuard } from './history';
import { InvitationsService } from './invitations.service';

const PAGE_SIZE = 20;

export function slugify(name: string): string {
  const s = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
  return s.length >= 3 ? s : `center-${s || 'new'}`;
}

@Injectable()
export class ProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private async freeSlug(base: string): Promise<string> {
    const taken = new Set((await this.prisma.center.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map((c) => c.slug));
    for (let i = 1; i < 1000; i++) {
      const candidate = i === 1 ? base : `${base}-${i}`;
      if (!taken.has(candidate)) return candidate;
    }
    throw new ConflictException('Choose a center address manually.');
  }

  async create(actorUserId: string, dto: CreateCenterDto) {
    const now = this.clock.now();
    const name = clean(dto.name);
    if (dto.applicationId) {
      const app = await this.prisma.centerApplication.findUnique({ where: { id: dto.applicationId }, include: { center: true } });
      if (!app) throw new NotFoundException('Application not found');
      if (app.status !== 'APPROVED') throw new ConflictException('Only approved applications can be provisioned.');
      if (app.center) throw new ConflictException('This application has already been provisioned.');
    }
    if (await this.prisma.center.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) {
      throw new ConflictException('A center with this name already exists. Use a distinct name.');
    }
    if (dto.slug && (await this.prisma.center.findUnique({ where: { slug: dto.slug } }))) {
      throw new ConflictException('This center address is already in use. Choose another.');
    }
    const slug = dto.slug ?? (await this.freeSlug(slugify(name)));
    const source = dto.applicationId ? 'APPLICATION' : 'DIRECT';
    const { center, invitation, token } = await withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      const center = await tx.center.create({
        data: { slug, name, timezone: dto.timezone, country: clean(dto.country), city: clean(dto.city), specialties: uniq(dto.specialties), source, applicationId: dto.applicationId ?? null, createdById: actorUserId },
      });
      if (dto.applicationId) {
        await tx.applicationEvent.create({ data: { applicationId: dto.applicationId, type: 'provisioned', actorUserId, fromStatus: 'APPROVED', toStatus: 'APPROVED', note: `Center created: ${name} (${slug})`, createdAt: now } });
      }
      await logCenterEvent(tx, center.id, 'center.created', now, { actorUserId, meta: { source, slug, applicationId: dto.applicationId ?? null } });
      const inv = await this.invitations.createInTx(tx, { centerId: center.id, kind: 'FIRST_ADMIN', email: dto.firstAdmin.email, displayName: dto.firstAdmin.displayName, roles: ['CENTER_ADMIN'], invitedById: actorUserId }, now);
      return { center, ...inv };
    }), 'This center or application was just provisioned, or its address is taken. Reload and try again.');
    this.invitations.deliver(invitation, center.name, token);
    await this.audit.record('center.provisioned', { actorUserId, meta: { centerId: center.id, source, applicationId: dto.applicationId ?? null } });
    return this.detail(center.id);
  }

  async list(q: ListCentersQuery) {
    const now = this.clock.now();
    const where: Prisma.CenterWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { slug: { contains: q.q.toLowerCase() } }, { city: { contains: q.q, mode: 'insensitive' } }] } : {}),
    };
    const page = q.page ?? 1;
    const [total, rows] = await Promise.all([
      this.prisma.center.count({ where }),
      this.prisma.center.findMany({
        where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        include: {
          _count: { select: { memberships: { where: { status: 'ACTIVE' } }, setupSteps: true } },
          memberships: { where: { status: 'ACTIVE', roles: { some: { role: 'CENTER_ADMIN' } } }, select: { id: true } },
          invitations: { where: { kind: 'FIRST_ADMIN', status: 'PENDING' }, select: { expiresAt: true } },
        },
      }),
    ]);
    const items = rows.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, city: c.city, country: c.country, status: c.status, source: c.source, createdAt: c.createdAt,
      activeMembers: c._count.memberships,
      setup: { done: c._count.setupSteps, total: SETUP_STEPS.length },
      adminStatus: c.memberships.length ? 'ACTIVE' : c.invitations.length ? (c.invitations[0].expiresAt > now ? 'INVITED' : 'EXPIRED') : 'NONE',
    }));
    return { total, page, pageSize: PAGE_SIZE, items };
  }

  async detail(centerId: string) {
    const now = this.clock.now();
    const c = await this.prisma.center.findUnique({
      where: { id: centerId },
      include: {
        application: { select: { id: true, reference: true } },
        setupSteps: true,
        invitations: { where: { kind: 'FIRST_ADMIN' }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] },
        memberships: { where: { roles: { some: { role: 'CENTER_ADMIN' } } }, include: { user: { select: { displayName: true, email: true } } } },
        events: { orderBy: { id: 'desc' }, take: 100 },
      },
    });
    if (!c) throw new NotFoundException('Center not found');
    const [activeStaff, pendingStaffInvites] = await Promise.all([
      this.prisma.membership.count({ where: { centerId, status: 'ACTIVE' } }),
      this.prisma.invitation.count({ where: { centerId, kind: 'STAFF', status: 'PENDING', expiresAt: { gt: now } } }),
    ]);
    return {
      id: c.id, name: c.name, slug: c.slug, status: c.status, timezone: c.timezone, country: c.country, city: c.city, specialties: c.specialties,
      source: c.source, application: c.application, createdAt: c.createdAt, version: c.version,
      admins: c.memberships.map((m) => ({ membershipId: m.id, displayName: m.user.displayName, email: m.user.email, status: m.status, joinedAt: m.createdAt })),
      adminInvitations: c.invitations.map((i) => invitationView(i, now)),
      stats: { activeMembers: activeStaff, pendingStaffInvites },
      setup: SETUP_STEPS.map((key) => ({ key, completedAt: c.setupSteps.find((s) => s.key === key)?.completedAt ?? null })),
      events: await describeEvents(this.prisma, c.events),
    };
  }
}
