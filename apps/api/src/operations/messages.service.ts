import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { logCenterEvent, uniq } from '../centers/history';
import { PrismaService } from '../prisma/prisma.service';
import type { Viewer } from './children.service';
import type { MessageDto, ThreadDto, ThreadListQuery } from './operations.dto';
import { TrialService } from './trial.service';

const isManager = (v: Viewer) => v.role === 'CENTER_ADMIN' || v.role === 'COORDINATOR';

// Who may see a thread, re-checked on every request so removing a guardian or ending an assignment revokes access at once.
// Guardians: threads about children currently linked to their own account. Therapists: children they are assigned to. Managers: the center.
export const threadScope = (centerId: string, v: Viewer): Prisma.MessageThreadWhereInput => ({
  centerId,
  ...(v.role === 'GUARDIAN' ? { child: { status: 'ACTIVE', guardians: { some: { userId: v.userId, removedAt: null } } } }
    : v.role === 'THERAPIST' ? { child: { assignments: { some: { membershipId: v.membershipId, endedAt: null } } } }
      : isManager(v) ? {} : { id: { in: [] } }),
});

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService, private readonly audit: AuditService) {}

  async list(centerId: string, v: Viewer, q: ThreadListQuery) {
    const rows = await this.prisma.messageThread.findMany({
      where: { ...threadScope(centerId, v), ...(q.status ? { status: q.status } : {}), ...(q.childId ? { childId: q.childId } : {}) },
      include: { child: true, messages: { orderBy: { createdAt: 'desc' }, take: 1 }, reads: { where: { userId: v.userId } } },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'asc' }], take: 200,
    });
    const items = rows.map((t) => {
      const last = t.messages[0];
      const read = t.reads[0]?.lastReadAt;
      return {
        id: t.id, childId: t.childId, child: `${t.child.preferredName ?? t.child.firstName} ${t.child.lastName}`, subject: t.subject, category: t.category, status: t.status,
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
    const now = this.trial.now();
    const t = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      await this.assertChild(tx, centerId, v, dto.childId);
      const t = await tx.messageThread.create({ data: { centerId, childId: dto.childId, subject: dto.subject, category: dto.category, createdById: v.userId, createdAt: now, lastMessageAt: now } });
      await tx.message.create({ data: { threadId: t.id, centerId, authorUserId: v.userId, authorKind: v.role === 'GUARDIAN' ? 'FAMILY' : 'STAFF', body: dto.body, createdAt: now } });
      await this.markRead(tx, t.id, v.userId, now);
      await logCenterEvent(tx, centerId, 'message.thread_opened', now, { actorUserId: v.userId, meta: { childId: dto.childId, threadId: t.id, category: dto.category } });
      return t;
    });
    await this.audit.record('message.thread_opened', { actorUserId: v.userId, meta: { centerId, threadId: t.id } });
    return { id: t.id };
  }

  async detail(centerId: string, v: Viewer, id: string) {
    const now = this.trial.now();
    const t = await this.prisma.messageThread.findFirst({ where: { id, ...threadScope(centerId, v) }, include: { child: true, messages: { orderBy: { createdAt: 'asc' }, take: 500 } } });
    if (!t) throw new NotFoundException('Conversation not found');
    const users = await this.prisma.user.findMany({ where: { id: { in: uniq(t.messages.map((m) => m.authorUserId)) } }, select: { id: true, displayName: true } });
    await this.markRead(this.prisma, t.id, v.userId, now);
    return {
      id: t.id, childId: t.childId, child: `${t.child.preferredName ?? t.child.firstName} ${t.child.lastName}`, subject: t.subject, category: t.category, status: t.status, createdAt: t.createdAt, closedAt: t.closedAt,
      canManage: isManager(v),
      messages: t.messages.map((m) => ({ id: m.id, body: m.body, authorKind: m.authorKind, author: users.find((u) => u.id === m.authorUserId)?.displayName ?? 'Former member', mine: m.authorUserId === v.userId, createdAt: m.createdAt })),
    };
  }

  async reply(centerId: string, v: Viewer, id: string, dto: MessageDto) {
    const now = this.trial.now();
    await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const t = await tx.messageThread.findFirst({ where: { id, ...threadScope(centerId, v) } });
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
