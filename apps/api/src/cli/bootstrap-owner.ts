import 'dotenv/config';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { PrismaClient } from '@prisma/client';
import { hashPassword, passwordPolicyError } from '../auth/password';
import { normalizeEmail } from '../common/security';

// Operator-only creation of the first real platform administrator (owner correction R1). No HTTP route exists for this.
const ALLOWED_ENVS = ['local', 'staging', 'production'];
const PASSWORD_ENV_NAMES = ['BOOTSTRAP_PASSWORD', 'OWNER_PASSWORD', 'BOOTSTRAP_OWNER_PASSWORD'];

export function bootstrapPreconditionError(env: Record<string, string | undefined>, argv: string[], isTTY: boolean): string | null {
  if (!env.DEPLOYMENT_ENV || !ALLOWED_ENVS.includes(env.DEPLOYMENT_ENV)) {
    return `bootstrap:owner refuses to run when DEPLOYMENT_ENV=${env.DEPLOYMENT_ENV ?? '(unset)'} (allowed: ${ALLOWED_ENVS.join(', ')})`;
  }
  if (env.BOOTSTRAP_OWNER_ALLOWED !== 'true') return 'bootstrap:owner requires BOOTSTRAP_OWNER_ALLOWED=true';
  if (argv.some((a) => a.startsWith('--password'))) return 'Passwords are never accepted as arguments; you will be prompted';
  if (PASSWORD_ENV_NAMES.some((n) => env[n] !== undefined)) return 'Passwords are never accepted from environment variables; you will be prompted';
  if (!isTTY) return 'bootstrap:owner must be run in an interactive terminal';
  const i = argv.indexOf('--email');
  if (i < 0 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(argv[i + 1] ?? '')) return 'Usage: bootstrap:owner --email <email>';
  return null;
}

function promptHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({ write: (chunk, _enc, cb) => (muted ? cb() : process.stdout.write(chunk, cb)) });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main(): Promise<void> {
  const problem = bootstrapPreconditionError(process.env, process.argv.slice(2), !!process.stdin.isTTY);
  if (problem) throw new Error(problem);
  const argv = process.argv.slice(2);
  const email = argv[argv.indexOf('--email') + 1];
  const prisma = new PrismaClient();
  try {
    if (await prisma.platformRoleAssignment.count({ where: { revokedAt: null } })) {
      throw new Error('A platform administrator already exists. Further administrators need an approved grant workflow.');
    }
    const password = await promptHidden('New owner password (12-128 characters): ');
    if ((await promptHidden('Repeat password: ')) !== password) throw new Error('Passwords do not match');
    const policy = passwordPolicyError(password, email);
    if (policy) throw new Error(policy);
    const normalized = normalizeEmail(email);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, emailNormalized: normalized, displayName: 'Platform owner' } });
      await tx.authIdentity.create({ data: { userId: user.id, provider: 'local', subject: normalized, passwordHash: await hashPassword(password) } });
      await tx.platformRoleAssignment.create({ data: { userId: user.id, source: 'bootstrap', reason: 'Operator bootstrap of the first platform administrator' } });
      await tx.auditEvent.create({ data: { type: 'platform.owner_bootstrapped', subjectUserId: user.id, meta: { environment: process.env.DEPLOYMENT_ENV ?? '' } } });
    });
    console.log('Platform owner created. Sign in through the web app.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
