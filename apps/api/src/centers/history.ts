import { ConflictException } from '@nestjs/common';
import { Prisma, type CenterEvent, type Invitation, type Role } from '@prisma/client';

export type Tx = Prisma.TransactionClient;
type Reader = Pick<Tx, 'user'>;

export const STAFF_ROLES = ['COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'] as const;
export const DIRECTORY_ROLES: Role[] = ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'];
export const RESPONSIBILITIES = ['intake', 'scheduling', 'family_liaison', 'supervision', 'training', 'quality'] as const;
export const SETUP_STEPS = ['center_details', 'your_profile', 'invite_team', 'review_permissions'] as const;
export type SetupKey = (typeof SETUP_STEPS)[number];

export const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
export const uniq = <T>(xs: T[] | undefined) => [...new Set(xs ?? [])];

export interface EventInput {
  actorUserId?: string | null;
  subjectUserId?: string | null;
  membershipId?: string | null;
  invitationId?: string | null;
  meta?: Prisma.InputJsonObject;
}

export const logCenterEvent = (tx: Tx, centerId: string, type: string, at: Date, e: EventInput = {}) =>
  tx.centerEvent.create({
    data: {
      centerId, type, createdAt: at,
      actorUserId: e.actorUserId ?? null, subjectUserId: e.subjectUserId ?? null,
      membershipId: e.membershipId ?? null, invitationId: e.invitationId ?? null, meta: e.meta ?? {},
    },
  });

export const completeSetupStep = (tx: Tx, centerId: string, key: SetupKey, userId: string, at: Date) =>
  tx.centerSetupStep.createMany({ data: [{ centerId, key, completedById: userId, completedAt: at }], skipDuplicates: true });

export async function describeEvents(db: Reader, events: CenterEvent[]) {
  const ids = [...new Set(events.flatMap((e) => [e.actorUserId, e.subjectUserId]).filter(Boolean) as string[])];
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } });
  const name = (id: string | null) => users.find((u) => u.id === id)?.displayName ?? null;
  return events.map((e) => ({ id: Number(e.id), type: e.type, actor: name(e.actorUserId), subject: name(e.subjectUserId), meta: e.meta, createdAt: e.createdAt }));
}

// Never includes tokenHash: invitation secrets leave the server only inside the delivered link.
export const invitationView = (i: Invitation, now: Date) => ({
  id: i.id, kind: i.kind, email: i.email, displayName: i.displayName, roles: i.roles,
  specialties: i.specialties, responsibilities: i.responsibilities, title: i.title,
  status: i.status === 'PENDING' && i.expiresAt <= now ? 'EXPIRED' : i.status,
  expiresAt: i.expiresAt, sendCount: i.sendCount, lastSentAt: i.lastSentAt, createdAt: i.createdAt,
  acceptedAt: i.acceptedAt, revokedAt: i.revokedAt, replacedById: i.replacedById,
});

export async function withUniqueGuard<T>(run: () => Promise<T>, message: string): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(message);
    throw e;
  }
}
