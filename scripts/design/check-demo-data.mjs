import 'dotenv/config';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
try {
  const center = await db.center.findUniqueOrThrow({ where: { slug: 'childrens-home-demo' } });
  assert.equal(center.name, "Children's Home Centre");
  assert.equal(center.timezone, 'Asia/Dubai');
  assert.deepEqual(center.specialties, ['speech', 'occupational']);
  assert(center.trialEndsAt && center.trialEndsAt > new Date(), 'Demo centre trial must still be writable');
  const child = await db.child.findFirstOrThrow({ where: { centerId: center.id, firstName: 'Yusuf', lastName: 'Ahmed' } });
  const guardians = await db.guardianLink.findMany({ where: { centerId: center.id, childId: child.id, removedAt: null } });
  assert.equal(guardians.length, 1);
  assert.equal(guardians[0].emailNorm, 'mariam.ahmed@childrens-home.therabridge.test');
  const assignments = await db.careAssignment.findMany({ where: { centerId: center.id, childId: child.id, endedAt: null } });
  assert.deepEqual(assignments.map(x => x.service).sort(), ['occupational', 'speech']);
  const appointments = await db.appointment.findMany({ where: { centerId: center.id, childId: child.id } });
  assert.equal(appointments.length, 10);
  assert.equal(appointments.filter(x => x.status === 'COMPLETED').length, 8);
  assert.equal(appointments.filter(x => x.status === 'SCHEDULED').length, 2);
  const sessions = await db.sessionNote.findMany({ where: { centerId: center.id, childId: child.id } });
  assert.equal(sessions.length, 8);
  assert(sessions.every(x => x.status === 'DRAFT' && x.executionStatus === 'COMPLETED' && x.actualEnd && x.activities));
  const plans = await db.therapyPlan.findMany({ where: { centerId: center.id, childId: child.id }, include: { versions: true } });
  assert.equal(plans.length, 2);
  assert(plans.every(x => x.versions.length === 1 && x.versions[0].status === 'DRAFT'));
  const observations = await db.observation.findMany({ where: { centerId: center.id, childId: child.id } });
  assert.equal(observations.length, 16);
  for (const o of observations) {
    assert(sessions.some(s => s.id === o.sessionNoteId && s.service === plans.find(p => p.versions.some(v => v.id === o.planVersionId))?.service));
  }
  const reports = await db.progressReport.findMany({ where: { centerId: center.id, childId: child.id } });
  assert.equal(reports.length, 2);
  assert(reports.every(x => x.status === 'DRAFT'));
  assert.equal(await db.reportRelease.count({ where: { centerId: center.id } }), 0);
  assert.equal(await db.clinicalAuthorizationDecision.count({ where: { centerId: center.id } }), 0);
  assert.equal(await db.recipientRelease.count({ where: { centerId: center.id } }), 0);
  const scopedAccounts = await db.membership.findMany({ where: { centerId: center.id }, include: { user: true, roles: true } });
  assert.equal(scopedAccounts.length, 6);
  const twoTherapists = scopedAccounts.filter(m => m.roles.some(r => r.role === 'THERAPIST'));
  assert.equal(twoTherapists.length, 2);
  assert(twoTherapists.every(m => m.specialties.length === 1));
  assert.equal(await db.child.count({ where: { centerId: center.id } }), 1);
  assert.equal(await db.guardianLink.count({ where: { centerId: center.id } }), 1);
  console.log('PASS: exactly one Ahmed family/child, six scoped memberships, 10 appointments, eight unsigned sessions, 16 evidence points, two draft plans/reports and zero authorizations/releases');
} finally {
  await db.$disconnect();
}
