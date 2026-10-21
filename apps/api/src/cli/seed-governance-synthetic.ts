import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { assertSeedAllowed } from './seed-synthetic';

// Explicit local fixture loader. No consent/authorization workflow and no assignment writes.
export async function seedGovernance(prisma: PrismaClient) {
  assertSeedAllowed(process.env);
  const center = await prisma.center.findUniqueOrThrow({ where: { slug: 'harbor' } });
  const author = await prisma.user.findUniqueOrThrow({ where: { emailNormalized: 'leila.hassan@harbor.therabridge.test' } });
  const membership = await prisma.membership.findUniqueOrThrow({ where: { userId_centerId: { userId: author.id, centerId: center.id } } });
  const assignment = await prisma.careAssignment.findFirstOrThrow({ where: { centerId: center.id, membershipId: membership.id, endedAt: null } });
  const link = await prisma.guardianLink.findFirst({ where: { centerId: center.id, childId: assignment.childId, removedAt: null } });
  const existing = await prisma.consentPolicyDraft.findFirst({ where: { centerId: center.id, purpose: 'Synthetic readiness example', number: 1 } });
  const policy = existing ?? await prisma.consentPolicyDraft.create({ data: { centerId: center.id, purpose: 'Synthetic readiness example', number: 1, restrictions: { proposedScope: 'Undecided — D7', clinicalRelease: false, media: false, ai: false, recording: false }, createdById: author.id } });
  if (link && !await prisma.consentRecordDraft.count({ where: { policyId: policy.id } })) await prisma.consentRecordDraft.create({ data: { centerId: center.id, childId: assignment.childId, guardianLinkId: link.id, policyId: policy.id, restrictions: { proposedPrincipalOnly: true, custodyDecision: 'Awaiting D4', purpose: 'Synthetic readiness example; authorizes nothing' }, createdById: author.id } });
  if (!await prisma.therapyPlan.count({ where: { centerId: center.id, title: 'Governance synthetic review example' } })) await prisma.therapyPlan.create({ data: { centerId: center.id, childId: assignment.childId, service: assignment.service, title: 'Governance synthetic review example', createdById: author.id, createdAt: new Date(), versions: { create: { centerId: center.id, number: 1, authorId: author.id, summary: 'Synthetic draft for internal governance review only.', goals: [{ key: 'sample-goal', title: 'Synthetic demonstration goal', measure: 'count', baseline: 1, target: 5 }], createdAt: new Date(), updatedAt: new Date() } } } });
}
if (require.main === module) {
  const prisma = new PrismaClient();
  seedGovernance(prisma).then(() => console.log('Synthetic, non-authorizing governance fixtures ready.')).catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
