import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { logCenterEvent, uniq } from '../centers/history';
import { PrismaService } from '../prisma/prisma.service';
import type { Viewer } from './children.service';
import type { MessageDto, ThreadDto, ThreadListQuery } from './operations.dto';
import { TrialService } from './trial.service';

const isManager = (v: Viewer) => v.role === 'CENTER_ADMIN' || v.role === 'COORDINATOR';

// Explicit audiences: guardian-recipient, general care-team coordination, and restricted specialty.
// Guardian visibility is always bound to the exact active recipient link.
// Specialty visibility re-checks an active (child, service, membership) assignment in each query.
export const threadScope = (
  centerId: string, v: Viewer, assignments: Array<{ childId: string; service: string }> = [],
): Prisma.MessageThreadWhereInput => {
  if (v.role === 'GUARDIAN') return { centerId, audience: 'GUARDIAN', child: { status: 'ACTIVE' }, guardianLink: { userId: v.userId, removedAt: null } };
  if (v.role === 'THERAPIST') return {
    centerId,
    // Never emit an empty nested Prisma OR: each specialty branch requires its exact live assignment.
    OR: [
      { audience: { in: ['GUARDIAN', 'CARE_TEAM'] }, child: { status: 'ACTIVE', assignments: { some: { membershipId: v.membershipId, endedAt: null } } } },
      ...assignments.map(({ childId, service }) => ({
        audience: 'SPECIALTY' as const, childId, service,
        child: { status: 'ACTIVE' as const, assignments: { some: { membershipId: v.membershipId, service, endedAt: null } } },
      })),
    ],
  };
  return isManager(v) || v.role === 'CLINICAL_SUPERVISOR' ? { centerId } : { centerId, id: { in: [] } };
};

// Family free-text messaging is a synthetic-only demonstration until safeguarding decision D-NEW-5 (issue #35).
export const familyMessagingEnabled = () => process.env.FAMILY_MESSAGING_DEMO === 'true' && !['production', 'staging'].includes(process.env.DEPLOYMENT_ENV ?? '');
const DEMO_OFF = 'Family messaging is a synthetic demonstration and is switched off here until the safeguarding and consent decisions are approved.';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService, private readonly audit: AuditService) {}

  private async scope(db: PrismaService | Prisma.TransactionClient, centerId: string, v: Viewer): Promise<Prisma.MessageThreadWhereInput> {
    if (v.role !== 'THERAPIST') return threadScope(centerId, v);
    const assignments = await db.careAssignment.findMany({
      where: { centerId, membershipId: v.membershipId, endedAt: null },
      select: { childId: true, service: true },
    });
    return threadScope(centerId, v, assignments);
  }

  async list(centerId: string, v: Viewer, q: ThreadListQuery) {
    if (!familyMessagingEnabled()) throw new ForbiddenException(DEMO_OFF);
    const scope = await this.scope(this.prisma, centerId, v);
    const rows = await this.prisma.messageThread.findMany({
      where: { ...scope, ...(q.status ? { status: q.status } : {}), ...(q.childId ? { childId: q.childId } : {}) },
      include: { child: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 }, reads: { where: { userId: v.userId } } },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'asc' }], take: 200,
    });
    const items = rows.map((t) => {
      const last = t.messages[0];
      const read = t.reads[0]?.lastReadAt;
      return {
        id: t.id, childId: t.childId, audience: t.audience, service: t.service, child: `${t.child.preferredName ?? t.child.firstName} ${t.child.lastName}`, subject: t.subject, category: t.category, status: t.status,
        lastMessageAt: t.lastMessageAt, preview: last ? last.body.slice(0, 140) : '', lastFrom: last?.authorKind ?? null,
        unread: !!last && last.authorUserId !== v.userId && (!read || read < last.createdAt),
      };
    });
    return { items, unread: items.filter((i) => i.unread).length };
  }

  private async assertChild(tx: Prisma.TransactionClient, centerId: string, v: Viewer, childId: string) {
    const where: Prisma.ChildWhereInput = v.role === 'GUARDIAN' ? { guardians: { some: { userId: v.userId, removedAt: null } } }
      : v.role === 'THERAPIST' ? { assignments: { some: { membershipId: v.membershipId, endedAt: null } } } : {};
    if (!(await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE', ...where } }))) throw new NotFoundException('Child not found');
  }

  private markRead(tx: Prisma.TransactionClient, threadId: string, userId: string, at: Date) {
    return tx.threadRead.upsert({ where: { threadId_userId: { threadId, userId } }, create: { threadId, userId, lastReadAt: at }, update: { lastReadAt: at } });
  }

  async create(centerId: string, v: Viewer, dto: ThreadDto) {
    if (!familyMessagingEnabled()) throw new ForbiddenException(DEMO_OFF);
    const audience = dto.audience ?? 'GUARDIAN'; // Existing recipient-specific API requests remain compatible.
    if (v.role === 'GUARDIAN' && audience !== 'GUARDIAN') throw new ForbiddenException('Families cannot open internal staff conversations.');
    if (audience === 'SPECIALTY' && !dto.service) throw new UnprocessableEntityException('Choose a specialty for a restricted conversation.');
    if (audience !== 'SPECIALTY' && dto.service) throw new UnprocessableEntityException('Only specialty conversations can specify a service.');
    if (audience !== 'GUARDIAN' && dto.guardianLinkId) throw new UnprocessableEntityException('Staff conversations cannot have a guardian recipient.');

    const now = this.trial.now();
    const t = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      await this.assertChild(tx, centerId, v, dto.childId);
      if (audience === 'SPECIALTY') {
        const child = await tx.child.findFirst({
          where: {
            id: dto.childId, centerId, status: 'ACTIVE', services: { has: dto.service! },
            ...(v.role === 'THERAPIST'
              ? { assignments: { some: { membershipId: v.membershipId, service: dto.service!, endedAt: null } } }
              : {}),
          },
          select: { id: true },
        });
        if (!child) throw new NotFoundException('Child or specialty assignment not found');
      }

      const link = audience === 'GUARDIAN'
        ? await tx.guardianLink.findFirst({
            where: {
              centerId, childId: dto.childId, removedAt: null,
              ...(v.role === 'GUARDIAN'
                ? { userId: v.userId }
                : { userId: { not: null }, id: dto.guardianLinkId ?? '00000000-0000-0000-0000-000000000000' }),
            },
          })
        : null;
      if (audience === 'GUARDIAN' && !link) throw new UnprocessableEntityException(
        v.role === 'GUARDIAN' ? 'Child not found' : 'Choose a connected guardian of this child as the recipient.',
      );
      const t = await tx.messageThread.create({
        data: {
          centerId, childId: dto.childId, guardianLinkId: link?.id ?? null,
          audience, service: audience === 'SPECIALTY' ? dto.service! : null,
          subject: dto.subject, category: dto.category, createdById: v.userId,
          createdAt: now, lastMessageAt: now,
        },
      });
      await tx.message.create({ data: { threadId: t.id, centerId, authorUserId: v.userId, authorKind: v.role === 'GUARDIAN' ? 'FAMILY' : 'STAFF', body: dto.body, createdAt: now } });
      await this.markRead(tx, t.id, v.userId, now);
      await logCenterEvent(tx, centerId, 'message.thread_opened', now, {
        actorUserId: v.userId, meta: { childId: dto.childId, threadId: t.id, category: dto.category, audience, service: t.service },
      });
      return t;
    });
    await this.audit.record('message.thread_opened', { actorUserId: v.userId, meta: { centerId, threadId: t.id } });
    return { id: t.id };
  }

  async detail(centerId: string, v: Viewer, id: string) {
    if (!familyMessagingEnabled()) throw new ForbiddenException(DEMO_OFF);
    const now = this.trial.now();
    const scope = await this.scope(this.prisma, centerId, v);
    const t = await this.prisma.messageThread.findFirst({ where: { id, ...scope }, include: { child: true, guardianLink: true, messages: { orderBy: { createdAt: 'asc' }, take: 500 } } });
    if (!t) throw new NotFoundException('Conversation not found');
    const users = await this.prisma.user.findMany({ where: { id: { in: uniq(t.messages.map((m) => m.authorUserId)) } }, select: { id: true, displayName: true } });
    await this.markRead(this.prisma, t.id, v.userId, now);
    return {
      id: t.id, childId: t.childId, audience: t.audience, service: t.service, child: `${t.child.preferredName ?? t.child.firstName} ${t.child.lastName}`, subject: t.subject, category: t.category, status: t.status, createdAt: t.createdAt, closedAt: t.closedAt,
      canManage: isManager(v), recipient: t.guardianLink?.displayName ?? null, demo: true,
      messages: t.messages.map((m) => ({ id: m.id, body: m.body, authorKind: m.authorKind, author: users.find((u) => u.id === m.authorUserId)?.displayName ?? 'Former member', mine: m.authorUserId === v.userId, createdAt: m.createdAt })),
    };
  }

  async reply(centerId: string, v: Viewer, id: string, dto: MessageDto) {
    if (!familyMessagingEnabled()) throw new ForbiddenException(DEMO_OFF);
    const now = this.trial.now();
    await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      // Serialize specialty revocation against an in-flight reply, as clinical.write does.
      // Re-check the exact live assignment after acquiring row locks; a revoked assignment
      // must not grant a reply while another transaction is ending it.
      if (v.role === 'THERAPIST' || v.role === 'GUARDIAN') {
        const target = await tx.messageThread.findFirst({
          where: { id, centerId },
          select: { childId: true, guardianLinkId: true, audience: true },
        });
        if (!target) throw new NotFoundException('Conversation not found');
        if (v.role === 'THERAPIST') {
          await tx.$queryRaw`SELECT id FROM child WHERE id=${target.childId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
          await tx.$queryRaw`SELECT id FROM care_assignment WHERE center_id=${centerId}::uuid AND child_id=${target.childId}::uuid AND membership_id=${v.membershipId}::uuid AND ended_at IS NULL FOR SHARE`;
        } else {
          // Lock the exact guardian recipient before the final scoped read.
          // A concurrent guardian-removal UPDATE conflicts with this lock; a removed
          // link cannot authorize a reply after its removal commits.
          if (target.audience !== 'GUARDIAN' || !target.guardianLinkId) throw new NotFoundException('Conversation not found');
          const links = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM guardian_link
            WHERE id=${target.guardianLinkId}::uuid
              AND center_id=${centerId}::uuid
              AND child_id=${target.childId}::uuid
              AND user_id=${v.userId}::uuid
              AND removed_at IS NULL
            FOR UPDATE`;
          if (links.length !== 1) throw new NotFoundException('Conversation not found');
        }
      }
      const scope = await this.scope(tx, centerId, v);
      const t = await tx.messageThread.findFirst({ where: { id, ...scope } });
      if (!t) throw new NotFoundException('Conversation not found');
      if (t.status !== 'OPEN') throw new ConflictException('This conversation is closed. Start a new one if you need to.');
      await tx.message.create({ data: { threadId: id, centerId, authorUserId: v.userId, authorKind: v.role === 'GUARDIAN' ? 'FAMILY' : 'STAFF', body: dto.body, createdAt: now } });
      await tx.messageThread.update({ where: { id }, data: { lastMessageAt: now } });
      await this.markRead(tx, id, v.userId, now);
      await logCenterEvent(tx, centerId, 'message.sent', now, { actorUserId: v.userId, meta: { childId: t.childId, threadId: id } });
    });
    return this.detail(centerId, v, id);
  }

  async setStatus(centerId: string, v: Viewer, id: string, status: 'OPEN' | 'CLOSED') {
    if (!familyMessagingEnabled()) throw new ForbiddenException(DEMO_OFF);
    if (!isManager(v)) throw new ForbiddenException('Only center administrators and coordinators can close conversations.');
    const now = this.trial.now();
    await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const t = await tx.messageThread.findFirst({ where: { id, centerId } });
      if (!t) throw new NotFoundException('Conversation not found');
      if (t.status === status) throw new ConflictException(status === 'OPEN' ? 'This conversation is already open.' : 'This conversation is already closed.');
      await tx.messageThread.update({ where: { id }, data: { status, closedAt: status === 'CLOSED' ? now : null } });
      await logCenterEvent(tx, centerId, status === 'CLOSED' ? 'message.thread_closed' : 'message.thread_reopened', now, { actorUserId: v.userId, meta: { childId: t.childId, threadId: id } });
    });
    return this.detail(centerId, v, id);
  }
}
