import { ConflictException, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { RateLimitStore } from '../auth/rate-limit.store';
import { CLOCK, Clock } from '../common/clock';
import { normalizeEmail } from '../common/security';
import { PrismaService } from '../prisma/prisma.service';
import type { DecisionDto, ListApplicationsQuery, SubmitApplicationDto } from './applications.dto';

const SUBMIT_LIMIT = 5;
const SUBMIT_WINDOW_MS = 60 * 60_000;
const PAGE_SIZE = 20;
const OPEN: ApplicationStatus[] = ['SUBMITTED', 'UNDER_REVIEW'];
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const newReference = () => `APP-${[...randomBytes(6)].map((b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('')}`;
const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limits: RateLimitStore,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async submit(dto: SubmitApplicationDto, ip: string) {
    const now = this.clock.now();
    const key = `apply:${ip}`;
    if ((await this.limits.count(key, SUBMIT_WINDOW_MS, now)) >= SUBMIT_LIMIT) {
      throw new HttpException('Too many applications from this network. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.limits.hit(key, SUBMIT_WINDOW_MS, now);
    const emailNorm = normalizeEmail(dto.contactEmail);
    try {
      const app = await this.prisma.$transaction(async (tx) => {
        const created = await tx.centerApplication.create({
          data: {
            reference: newReference(),
            organizationName: clean(dto.organizationName),
            country: clean(dto.country),
            city: clean(dto.city),
            timezone: dto.timezone,
            contactName: clean(dto.contactName),
            contactEmail: dto.contactEmail.trim(),
            contactEmailNorm: emailNorm,
            contactPhone: dto.contactPhone?.trim() || null,
            specialties: [...new Set(dto.specialties)],
            therapistEstimate: dto.therapistEstimate,
            childEstimate: dto.childEstimate,
            message: dto.message?.trim() || null,
            submittedAt: now,
          },
        });
        await tx.applicationEvent.create({ data: { applicationId: created.id, type: 'submitted', toStatus: 'SUBMITTED', createdAt: now } });
        return created;
      });
      await this.audit.record('application.submitted', { ip, meta: { applicationId: app.id, reference: app.reference } });
      return { reference: app.reference, status: app.status, submittedAt: app.submittedAt };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('An application with this contact email is already being reviewed. We will reply to that email.');
      }
      throw e;
    }
  }

  async list(q: ListApplicationsQuery) {
    const where: Prisma.CenterApplicationWhereInput = {
      ...(q.status === 'OPEN' ? { status: { in: OPEN } } : q.status ? { status: q.status as ApplicationStatus } : {}),
      ...(q.q
        ? { OR: [
            { organizationName: { contains: q.q, mode: 'insensitive' } },
            { contactEmail: { contains: q.q, mode: 'insensitive' } },
            { reference: { contains: q.q.toUpperCase() } },
          ] }
        : {}),
    };
    const page = q.page ?? 1;
    const [total, items, counts] = await Promise.all([
      this.prisma.centerApplication.count({ where }),
      this.prisma.centerApplication.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, reference: true, organizationName: true, city: true, country: true, contactName: true, status: true, submittedAt: true, decidedAt: true, specialties: true },
      }),
      this.prisma.centerApplication.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    return { total, page, pageSize: PAGE_SIZE, items, counts: byStatus };
  }

  async detail(id: string) {
    const app = await this.prisma.centerApplication.findUnique({ where: { id }, include: { events: { orderBy: { id: 'asc' } } } });
    if (!app) throw new NotFoundException('Application not found');
    const actorIds = [...new Set([app.decidedById, app.reviewStartedById, ...app.events.map((e) => e.actorUserId)].filter(Boolean) as string[])];
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true } });
    const name = (id: string | null) => actors.find((a) => a.id === id)?.displayName ?? null;
    const { contactEmailNorm, events, ...rest } = app;
    void contactEmailNorm;
    return {
      ...rest,
      reviewStartedBy: name(app.reviewStartedById),
      decidedBy: name(app.decidedById),
      provisioning: app.status === 'APPROVED' ? { status: 'AWAITING_PROVISIONING', workUnit: 'TB-EM-003' } : null,
      events: events.map((e) => ({ id: Number(e.id), type: e.type, fromStatus: e.fromStatus, toStatus: e.toStatus, note: e.note, createdAt: e.createdAt, actor: name(e.actorUserId) })),
    };
  }

  // Optimistic concurrency: the caller's version must match, so two reviewers cannot both decide.
  private async transition(id: string, actorUserId: string, version: number, from: ApplicationStatus[], data: Prisma.CenterApplicationUpdateManyMutationInput, event: { type: string; to: ApplicationStatus; note?: string }) {
    const now = this.clock.now();
    const current = await this.prisma.centerApplication.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Application not found');
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.centerApplication.updateMany({
        where: { id, version, status: { in: from } },
        data: { ...data, status: event.to, version: { increment: 1 } },
      });
      if (r.count !== 1) throw new ConflictException('This application changed since you opened it. Reload to see the latest status.');
      await tx.applicationEvent.create({ data: { applicationId: id, type: event.type, actorUserId, fromStatus: current.status, toStatus: event.to, note: event.note ?? null, createdAt: now } });
    });
    await this.audit.record(`application.${event.type}` as 'application.review_started', { actorUserId, meta: { applicationId: id, to: event.to } });
    return this.detail(id);
  }

  startReview(id: string, actorUserId: string, version: number) {
    return this.transition(id, actorUserId, version, ['SUBMITTED'], { reviewStartedAt: this.clock.now(), reviewStartedById: actorUserId }, { type: 'review_started', to: 'UNDER_REVIEW' });
  }

  decide(id: string, actorUserId: string, dto: DecisionDto) {
    const rationale = dto.rationale.trim();
    return this.transition(id, actorUserId, dto.version, OPEN, { decidedAt: this.clock.now(), decidedById: actorUserId, decisionRationale: rationale }, {
      type: dto.decision === 'APPROVED' ? 'approved' : 'rejected',
      to: dto.decision,
      note: rationale,
    });
  }

  pendingCount() {
    return this.prisma.centerApplication.count({ where: { status: { in: OPEN } } });
  }
}
