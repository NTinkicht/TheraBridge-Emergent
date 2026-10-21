import 'dotenv/config';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { randomToken } from '../common/security';

// Synthetic accounts only (owner correction R1). Never add a real person's email here.
export const SEED_CENTERS = [
  { slug: 'harbor', name: 'Harbor Child Development Center', timezone: 'America/New_York' },
  { slug: 'cedar', name: 'Cedar Grove Therapy Collective', timezone: 'America/Chicago' },
] as const;

type Slug = (typeof SEED_CENTERS)[number]['slug'];

export const SEED_ACCOUNTS: { email: string; displayName: string; platform?: boolean; memberships: { center: Slug; roles: Role[]; status?: 'ACTIVE' | 'SUSPENDED' }[] }[] = [
  { email: 'platform.ops@therabridge.test', displayName: 'Platform Operations (synthetic)', platform: true, memberships: [] },
  { email: 'admin@harbor.therabridge.test', displayName: 'Maya Brooks', memberships: [{ center: 'harbor', roles: ['CENTER_ADMIN'] }] },
  { email: 'admin@cedar.therabridge.test', displayName: 'Daniel Okafor', memberships: [{ center: 'cedar', roles: ['CENTER_ADMIN'] }] },
  { email: 'coordinator@harbor.therabridge.test', displayName: 'Priya Natarajan', memberships: [{ center: 'harbor', roles: ['COORDINATOR'] }] },
  { email: 'leila.hassan@harbor.therabridge.test', displayName: 'Leila Hassan', memberships: [{ center: 'harbor', roles: ['THERAPIST'] }] },
  { email: 'supervisor@harbor.therabridge.test', displayName: 'Grace Lindqvist', memberships: [{ center: 'harbor', roles: ['CLINICAL_SUPERVISOR'] }] },
  { email: 'multi@therabridge.test', displayName: 'Jordan Reyes', memberships: [{ center: 'harbor', roles: ['THERAPIST'] }, { center: 'cedar', roles: ['CENTER_ADMIN'] }] },
  { email: 'sara.morgan@family.therabridge.test', displayName: 'Sara Morgan', memberships: [{ center: 'harbor', roles: ['GUARDIAN'] }] },
  { email: 'norole@harbor.therabridge.test', displayName: 'No Role (synthetic)', memberships: [{ center: 'harbor', roles: [] }] },
  { email: 'suspended@harbor.therabridge.test', displayName: 'Suspended Member (synthetic)', memberships: [{ center: 'harbor', roles: ['THERAPIST'], status: 'SUSPENDED' }] },
];

export const CREDENTIALS_FILE = resolve(__dirname, '../../../../.workspace/local-credentials/synthetic-accounts.json');

export function assertSeedAllowed(env: Record<string, string | undefined>): void {
  const d = env.DEPLOYMENT_ENV;
  if (!d || d === 'production' || d === 'staging') throw new Error(`seed:synthetic refuses to run when DEPLOYMENT_ENV=${d ?? '(unset)'}`);
}

// Idempotent. Every run issues fresh random passwords and revokes the accounts' sessions, so credentials are disposable.
export async function runSeed(prisma: PrismaClient, outFile = CREDENTIALS_FILE): Promise<{ email: string; password: string }[]> {
  const centers: Record<string, string> = {};
  for (const c of SEED_CENTERS) {
    centers[c.slug] = (await prisma.center.upsert({ where: { slug: c.slug }, create: c, update: { name: c.name, timezone: c.timezone, status: 'ACTIVE' } })).id;
  }
  const out: { email: string; password: string }[] = [];
  for (const a of SEED_ACCOUNTS) {
    const password = `tb-${randomToken(18)}`;
    const email = a.email.toLowerCase();
    const user = await prisma.user.upsert({
      where: { emailNormalized: email },
      create: { email, emailNormalized: email, displayName: a.displayName },
      update: { displayName: a.displayName, status: 'ACTIVE' },
    });
    const passwordHash = await hashPassword(password);
    await prisma.authIdentity.upsert({
      where: { userId_provider: { userId: user.id, provider: 'local' } },
      create: { userId: user.id, provider: 'local', subject: email, passwordHash },
      update: { passwordHash, passwordChangedAt: new Date() },
    });
    await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: 'seed_rotated' } });
    if (a.platform && !(await prisma.platformRoleAssignment.count({ where: { userId: user.id, revokedAt: null } }))) {
      await prisma.platformRoleAssignment.create({ data: { userId: user.id, source: 'synthetic_seed', reason: 'Synthetic platform administrator for development' } });
    }
    for (const m of a.memberships) {
      const membership = await prisma.membership.upsert({
        where: { userId_centerId: { userId: user.id, centerId: centers[m.center] } },
        create: { userId: user.id, centerId: centers[m.center], status: m.status ?? 'ACTIVE' },
        update: { status: m.status ?? 'ACTIVE' },
      });
      for (const role of m.roles) {
        await prisma.roleAssignment.upsert({
          where: { membershipId_role: { membershipId: membership.id, role } },
          create: { membershipId: membership.id, role },
          update: {},
        });
      }
    }
    out.push({ email, password });
  }
  await prisma.auditEvent.create({ data: { type: 'seed.synthetic', meta: { accounts: out.length } } });
  mkdirSync(dirname(outFile), { recursive: true, mode: 0o700 });
  writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), note: 'Synthetic, disposable. Never commit.', accounts: out }, null, 2), { mode: 0o600 });
  chmodSync(outFile, 0o600);
  return out;
}

if (require.main === module) {
  assertSeedAllowed(process.env);
  const prisma = new PrismaClient();
  runSeed(prisma)
    .then((a) => console.log(`Seeded ${a.length} synthetic accounts. Passwords written only to ${CREDENTIALS_FILE}`))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
