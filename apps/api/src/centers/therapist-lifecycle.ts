import type { Prisma } from '@prisma/client';

// Call while holding the center-wide NO KEY UPDATE lock. Every way to
// remove therapist access (role, specialty, suspension, revocation or a
// child assignment) must terminate all downstream operational access in
// the SAME transaction, even if the child has no active assignments left.
export async function terminateTherapistCare(
  tx: Prisma.TransactionClient,
  centerId: string,
  membershipId: string,
  actorUserId: string,
  now: Date,
  reason: string,
  scope: { childId?: string; service?: string } = {},
) {
  const where = { centerId, membershipId, ...scope };
  const assignments = await tx.careAssignment.findMany({ where: { ...where, endedAt: null }, select: { childId: true } });
  const referents = await tx.child.findMany({
    where: { centerId, referentMembershipId: membershipId, ...(scope.childId ? { id: scope.childId } : {}) },
    select: { id: true },
  });
  const childIds = [...new Set([...assignments.map((a) => a.childId), ...referents.map((c) => c.id)])].sort();
  // Serialize with setReferent/endAssignment. Center -> sorted child -> rows.
  for (const childId of childIds) {
    await tx.$queryRaw`SELECT id FROM "child" WHERE id = ${childId}::uuid AND center_id = ${centerId}::uuid FOR UPDATE`;
  }
  const ended = await tx.careAssignment.updateMany({ where: { ...where, endedAt: null }, data: { endedAt: now, isLead: false } });
  const series = await tx.appointmentSeries.updateMany({ where: { ...where, status: 'ACTIVE' }, data: { status: 'ENDED', version: { increment: 1 } } });
  const scheduled = { ...where, status: 'SCHEDULED' as const, startsAt: { gte: now } };
  const near = await tx.appointment.findMany({
    where: { ...scheduled, startsAt: { gte: now, lte: new Date(now.getTime() + 14 * 86_400_000) } },
    select: { id: true, startsAt: true }, orderBy: { startsAt: 'asc' },
  });
  const cancelled = await tx.appointment.updateMany({ where: scheduled, data: { status: 'CANCELLED', statusReason: reason, version: { increment: 1 } } });

  for (const childId of childIds) {
    const child = await tx.child.findFirst({ where: { id: childId, centerId, referentMembershipId: membershipId }, select: { referentRevision: true } });
    if (!child) continue;
    const remaining = await tx.careAssignment.findFirst({ where: { centerId, childId, membershipId, endedAt: null }, select: { id: true } });
    if (remaining) continue;
    await tx.child.update({ where: { id: childId }, data: { referentMembershipId: null, referentRevision: { increment: 1 }, version: { increment: 1 } } });
    await tx.childReferentHistory.create({ data: {
      centerId, childId, actorUserId, previousMembershipId: membershipId, nextMembershipId: null,
      reason, revision: child.referentRevision + 1, createdAt: now,
    } });
  }
  return { endedAssignments: ended.count, endedSeries: series.count, cancelledAppointments: cancelled.count, noticeAppointments: near.map((a) => ({ id: a.id, before: a.startsAt })) };
}
