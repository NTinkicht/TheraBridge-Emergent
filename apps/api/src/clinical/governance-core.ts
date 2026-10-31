import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Tx } from '../centers/history';
import type { Viewer } from '../common/viewer';
import { canonicalJson, canonicalFingerprint } from '../common/fingerprints';

export const INTERNAL_NOTICE = 'Internal preview — not approved, signed or released.';
export const EDITABLE = ['DRAFT', 'RETURNED_FOR_REVISION'];
// Backwards-compatible exports for existing clinical consumers.
export const canonical = canonicalJson;
export const fingerprint = canonicalFingerprint;
export const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

// Shared by existing and governance entry points. Locks prevent role/assignment revocation racing a write.
export async function assertActor(tx: Tx, centerId: string, v: Viewer, roles: string[]) {
  if (!roles.includes(v.role)) throw new ForbiddenException('This action is not available to your role.');
  await tx.$queryRaw`SELECT id FROM membership WHERE id=${v.membershipId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT membership_id FROM role_assignment WHERE membership_id=${v.membershipId}::uuid FOR SHARE`;
  const m = await tx.membership.findFirst({ where: { id: v.membershipId, userId: v.userId, centerId, status: 'ACTIVE', user: { status: 'ACTIVE' }, center: { status: 'ACTIVE' }, roles: { some: { role: v.role } } } });
  if (!m) throw new ForbiddenException('Your workspace access has changed.');
}
export async function snapshot(tx: Tx, input: { centerId: string; childId: string; kind: 'PLAN' | 'REPORT'; documentId: string; sourceVersion: number; content: unknown; evidence: unknown; authorId: string }, actorId: string, now: Date) {
  const envelope = { ...input, content: json(input.content), evidence: json(input.evidence) };
  return tx.governanceSnapshot.create({ data: { ...envelope, fingerprint: fingerprint(envelope), generatedById: actorId, createdAt: now } });
}
export async function transitionHistory(tx: Tx, s: Awaited<ReturnType<typeof snapshot>>, fromStatus: string, toStatus: string, reason: string, actorId: string, now: Date) {
  return tx.governanceHistory.create({ data: { centerId: s.centerId, childId: s.childId, kind: s.kind, documentId: s.documentId, sourceVersion: s.sourceVersion, snapshotId: s.id, fromStatus, toStatus, reason, actorId, createdAt: now } });
}
