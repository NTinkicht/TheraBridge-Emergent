import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { logCenterEvent } from '../centers/history';
import type { Viewer } from '../operations/children.service';
import { TrialService, trialExpired, TRIAL_ENDED } from '../operations/trial.service';
import type { HomePlanRequestDto, HomePlanRequestResponseDto } from './clinical.dto';

// This is NOT a care-plan release, advice channel, signed plan or messaging route.
// Both mutation methods are fail-closed in staging/production even if a variable leaks.
export const homePlanRequestsEnabled = () =>
  process.env.HOME_PLAN_REQUESTS_DEMO === 'true' &&
  !['production', 'staging'].includes(process.env.DEPLOYMENT_ENV ?? '');

const view = (r: {
  id: string; childId: string; service: string; status: string;
  createdAt: Date; respondedAt: Date | null;
}) => ({
  id: r.id, childId: r.childId, service: r.service,
  status: r.status, createdAt: r.createdAt, respondedAt: r.respondedAt,
  synthetic: true as const, released: false as const, clinicalAuthorization: false as const,
});

@Injectable()
export class HomePlanRequestsService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService) {}

  private assertDemo() {
    if (!homePlanRequestsEnabled()) throw new ForbiddenException('Synthetic home-plan requests are disabled.');
  }

  private async activeActor(
    db: Pick<PrismaService, 'membership'>, centerId: string, v: Viewer,
  ) {
    const m = await db.membership.findFirst({
      where: { id: v.membershipId, centerId, userId: v.userId, status: 'ACTIVE',
        roles: { some: { role: v.role } } },
    });
    if (!m) throw new ForbiddenException('Active center membership required.');
    return m;
  }

  private async assigned(
    db: Pick<PrismaService, 'careAssignment' | 'membership'>,
    centerId: string, childId: string, service: string, membershipId?: string,
  ) {
    const assignments = await db.careAssignment.findMany({
      where: { centerId, childId, service, endedAt: null,
        ...(membershipId ? { membershipId } : {}) },
      select: { membershipId: true },
    });
    if (!assignments.length) return false;
    return !!(await db.membership.findFirst({
      where: { centerId, id: { in: assignments.map(a => a.membershipId) },
        status: 'ACTIVE', specialties: { has: service }, roles: { some: { role: 'THERAPIST' } } },
      select: { id: true },
    }));
  }

  async guardianList(centerId: string, v: Viewer) {
    if (v.role !== 'GUARDIAN') throw new ForbiddenException();
    const enabled = homePlanRequestsEnabled();
    if (!enabled) return { synthetic: true, released: false, enabled, children: [], items: [] };
    await this.activeActor(this.prisma, centerId, v);
    const links = await this.prisma.guardianLink.findMany({
      where: { centerId, userId: v.userId, removedAt: null, child: { centerId, status: 'ACTIVE' } },
      include: { child: { select: { id: true, firstName: true, preferredName: true, services: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const owned = { centerId, guardianLinkId: { in: links.map(l => l.id) } };
    // Do not let bounded completed history hide an old pending request.
    const [pending, recent] = await Promise.all([
      this.prisma.homePlanRequest.findMany({ where: { ...owned, status: 'PENDING' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.prisma.homePlanRequest.findMany({ where: { ...owned, status: { not: 'PENDING' } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }),
    ]);
    const rows = [...pending, ...recent];
    return {
      synthetic: true, released: false, enabled,
      children: links.map(l => ({ id: l.child.id, name: l.child.preferredName ?? l.child.firstName, services: l.child.services })),
      items: rows.map(view),
    };
  }

  async create(centerId: string, v: Viewer, dto: HomePlanRequestDto) {
    if (v.role !== 'GUARDIAN') throw new ForbiddenException();
    this.assertDemo();
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      // Center then guardian link: serialize against guardian revocation.
      // NO KEY UPDATE permits concurrent center_event FK KEY SHARE lookups.
      await tx.$queryRaw`SELECT id FROM center WHERE id = ${centerId}::uuid FOR NO KEY UPDATE`;
      const center = await tx.center.findUnique({ where: { id: centerId } });
      if (!center || center.status !== 'ACTIVE') throw new NotFoundException('Center not found');
      if (trialExpired(center, now)) throw new ForbiddenException(TRIAL_ENDED);
      await this.activeActor(tx, centerId, v);
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM guardian_link WHERE center_id = ${centerId}::uuid
          AND child_id = ${dto.childId}::uuid AND user_id = ${v.userId}::uuid
          AND removed_at IS NULL FOR UPDATE
      `;
      const link = locked[0] && await tx.guardianLink.findFirst({
        where: { id: locked[0].id, centerId, childId: dto.childId, userId: v.userId, removedAt: null,
          child: { centerId, status: 'ACTIVE' } },
        include: { child: true },
      });
      if (!link) throw new NotFoundException('Child not found');
      if (!link.child.services.includes(dto.service)) throw new UnprocessableEntityException('Service is not assigned to this child.');
      if (!await this.assigned(tx, centerId, dto.childId, dto.service))
        throw new UnprocessableEntityException('No currently assigned therapist for this service.');

      const reused = await tx.homePlanRequest.findUnique({ where: { requestKey: dto.requestKey } });
      if (reused) {
        if (reused.centerId !== centerId || reused.guardianLinkId !== link.id ||
            reused.childId !== dto.childId || reused.service !== dto.service)
          throw new ConflictException('This request key was used for a different request.');
        return { ...view(reused), replayed: true };
      }
      const inserted = await tx.homePlanRequest.createMany({
        data: [{ centerId, childId: dto.childId, guardianLinkId: link.id,
          service: dto.service, requestKey: dto.requestKey, createdAt: now }],
        skipDuplicates: true,
      });
      if (!inserted.count) {
        const sameKey = await tx.homePlanRequest.findUnique({ where: { requestKey: dto.requestKey } });
        if (sameKey && sameKey.guardianLinkId === link.id && sameKey.childId === dto.childId && sameKey.service === dto.service)
          return { ...view(sameKey), replayed: true };
        if (sameKey) throw new ConflictException('This request key was used for a different request.');
        const pending = await tx.homePlanRequest.findFirst({
          where: { guardianLinkId: link.id, service: dto.service, status: 'PENDING' },
        });
        if (!pending) throw new ConflictException('Please refresh the current request status.');
        // A different request key has not been accepted. Returning success here
        // would violate idempotency if its retry arrives after pending closes.
        throw new ConflictException('A request for this service is already pending. Refresh its status before submitting again.');
      }
      const created = await tx.homePlanRequest.findUniqueOrThrow({ where: { requestKey: dto.requestKey } });
      await logCenterEvent(tx, centerId, 'family.home_plan_requested', now, {
        actorUserId: v.userId, meta: { childId: dto.childId, requestId: created.id, service: dto.service, synthetic: true },
      });
      return { ...view(created), replayed: false };
    });
  }

  async clinicianList(centerId: string, v: Viewer) {
    if (v.role !== 'THERAPIST') throw new ForbiddenException();
    const enabled = homePlanRequestsEnabled();
    if (!enabled) return { synthetic: true, released: false, enabled, items: [] };
    const m = await this.activeActor(this.prisma, centerId, v);
    const pairs = await this.prisma.careAssignment.findMany({
      where: { centerId, membershipId: v.membershipId, endedAt: null },
      select: { childId: true, service: true },
    });
    const scope = pairs.filter(p => m.specialties.includes(p.service));
    const where = { centerId, child: { centerId, status: 'ACTIVE' as const },
      guardianLink: { centerId, removedAt: null },
      OR: scope.length ? scope.map(p => ({ childId: p.childId, service: p.service })) :
        [{ id: '00000000-0000-0000-0000-000000000000' }] };
    const include = { child: { select: { firstName: true, preferredName: true } } } as const;
    // Pending work is never truncated by historical status records. The 100
    // newest responses remain visible without hiding outstanding obligations.
    const [pending, recent] = await Promise.all([
      this.prisma.homePlanRequest.findMany({ where: { ...where, status: 'PENDING' },
        include, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
      this.prisma.homePlanRequest.findMany({ where: { ...where, status: { not: 'PENDING' } },
        include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }),
    ]);
    const rows = [...pending, ...recent];
    return { synthetic: true, released: false, enabled,
      items: rows.map(r => ({ ...view(r), childName: r.child.preferredName ?? r.child.firstName })) };
  }

  async respond(centerId: string, v: Viewer, id: string, dto: HomePlanRequestResponseDto) {
    if (v.role !== 'THERAPIST') throw new ForbiddenException();
    this.assertDemo();
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM center WHERE id = ${centerId}::uuid FOR NO KEY UPDATE`;
      const center = await tx.center.findUnique({ where: { id: centerId } });
      if (!center || center.status !== 'ACTIVE') throw new NotFoundException('Center not found');
      if (trialExpired(center, now)) throw new ForbiddenException(TRIAL_ENDED);
      await this.activeActor(tx, centerId, v);
      const record = await tx.homePlanRequest.findFirst({
        where: { id, centerId, child: { centerId, status: 'ACTIVE' },
          guardianLink: { centerId, removedAt: null } },
      });
      if (!record || !await this.assigned(tx, centerId, record.childId, record.service, v.membershipId))
        throw new NotFoundException('Request not found');
      // Removal does not lock the center, so serialize directly on the guardian
      // link row, then revalidate. READ COMMITTED sees a completed removal after
      // waiting. No response may commit against a revoked guardian link.
      const validLink = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM guardian_link WHERE id = ${record.guardianLinkId}::uuid
          AND center_id = ${centerId}::uuid AND removed_at IS NULL FOR UPDATE
      `;
      if (!validLink.length) throw new NotFoundException('Request not found');
      if (record.status !== 'PENDING') throw new ConflictException('This request has already been answered.');
      const updated = await tx.homePlanRequest.updateMany({
        where: { id, centerId, status: 'PENDING' },
        data: { status: dto.status, respondedAt: now, respondedById: v.membershipId },
      });
      if (!updated.count) throw new ConflictException('The request changed; refresh the inbox.');
      await logCenterEvent(tx, centerId, 'clinical.home_plan_request_answered', now, {
        actorUserId: v.userId, meta: { childId: record.childId, requestId: id, status: dto.status, synthetic: true },
      });
      return view(await tx.homePlanRequest.findUniqueOrThrow({ where: { id } }));
    });
  }
}
