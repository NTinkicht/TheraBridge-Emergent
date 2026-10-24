import { spawnSync } from 'node:child_process';
import { readFileSync, statSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Role } from '@prisma/client';
import { RouteAccessVerifier } from '../src/auth/route-access.verifier';
import { CLINICAL_CAPABILITIES, PERMISSIONS, ROLES, can } from '../src/auth/policy';
import { bootstrapPreconditionError } from '../src/cli/bootstrap-owner';
import { SEED_ACCOUNTS, assertSeedAllowed, runSeed } from '../src/cli/seed-synthetic';
import { Harness, ORIGIN, PASSWORD, Signed, createUser, login, makeApp, post, resetDb, signIn, cookieFrom } from './helpers';

const UUID0 = '00000000-0000-4000-8000-000000000000';

describe('TB-EM-001 checkpoint B: tenancy, roles, deny-by-default authorization (real PostgreSQL)', () => {
  let h: Harness;
  let harbor: string;
  let cedar: string;
  const ids: Record<string, string> = {};

  async function member(key: string, center: string, roles: Role[], status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE') {
    const u = ids[key] ? { id: ids[key] } : await createUser(h.prisma, `${key}@authz.therabridge.test`);
    ids[key] = u.id;
    const m = await h.prisma.membership.create({ data: { userId: u.id, centerId: center, status, roles: { create: roles.map((role) => ({ role })) } } });
    return m.id;
  }
  const email = (key: string) => `${key}@authz.therabridge.test`;
  const get = (s: Pick<Signed, 'cookie'>, path: string) => h.http().get(path).set('Cookie', s.cookie);

  beforeAll(async () => {
    h = await makeApp();
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(async () => {
    await resetDb(h.prisma);
    for (const k of Object.keys(ids)) delete ids[k];
    harbor = (await h.prisma.center.create({ data: { slug: 'harbor', name: 'Harbor Child Development Center', timezone: 'America/New_York' } })).id;
    cedar = (await h.prisma.center.create({ data: { slug: 'cedar', name: 'Cedar Grove Therapy Collective', timezone: 'America/Chicago' } })).id;
  });

  describe('AC-10 tenant isolation and context', () => {
    it('a single-context center admin is auto-selected and sees only their own center', async () => {
      await member('hadmin', harbor, ['CENTER_ADMIN']);
      const s = await signIn(h, email('hadmin'));
      expect(s.body.activeContext).toMatchObject({ type: 'center', centerId: harbor, role: 'CENTER_ADMIN' });
      expect(s.body.permissions).toContain('center.summary.read');
      expect(s.body.permissions.every((p: string) => p.startsWith('center.'))).toBe(true);
      const own = await get(s, `/api/centers/${harbor}/summary`).expect(200);
      expect(own.body.center.name).toBe('Harbor Child Development Center');
      await get(s, `/api/centers/${cedar}/summary`).expect(404);
      const sneaky = await get(s, `/api/centers/${harbor}/summary?centerId=${cedar}`).expect(200);
      expect(sneaky.body.center.id).toBe(harbor);
      await get(s, '/api/centers/not-a-uuid/summary').expect(404);
    });

    it('a multi-membership user must choose; switching rotates the session and changes permissions', async () => {
      const hm = await member('multi', harbor, ['THERAPIST']);
      const cm = await member('multi', cedar, ['CENTER_ADMIN']);
      const s = await signIn(h, email('multi'));
      expect(s.body.activeContext).toBeNull();
      expect(s.body.contexts).toHaveLength(2);
      await get(s, `/api/centers/${harbor}/summary`).expect(404);
      const r1 = await post(h, '/api/auth/context', s, { membershipId: hm, role: 'THERAPIST' }).expect(200);
      const t1 = { cookie: `tb_session=${cookieFrom(r1, 'tb_session')}`, csrf: r1.body.csrfToken };
      await get(s, '/api/auth/session').expect(401);
      await get(t1, `/api/centers/${harbor}/summary`).expect(200);
      await get(t1, `/api/centers/${cedar}/summary`).expect(404);
      await post(h, '/api/auth/context', t1, { membershipId: cm, role: 'THERAPIST' }).expect(403);
      const r2 = await post(h, '/api/auth/context', t1, { membershipId: cm, role: 'CENTER_ADMIN' }).expect(200);
      const t2 = { cookie: `tb_session=${cookieFrom(r2, 'tb_session')}`, csrf: r2.body.csrfToken };
      await get(t2, `/api/centers/${cedar}/summary`).expect(200);
      await get(t2, `/api/centers/${harbor}/summary`).expect(404);
      expect(await h.prisma.auditEvent.count({ where: { type: 'auth.context.switched' } })).toBe(2);
    });
  });

  describe('AC-9 membership alone grants nothing; revocation is immediate', () => {
    it('a membership with no role has no context, no permissions and no center access', async () => {
      const m = await member('norole', harbor, []);
      const s = await signIn(h, email('norole'));
      expect(s.body).toMatchObject({ contexts: [], activeContext: null, permissions: [] });
      await get(s, `/api/centers/${harbor}/summary`).expect(404);
      await post(h, '/api/auth/context', s, { membershipId: m, role: 'CENTER_ADMIN' }).expect(403);
    });

    it('a guardian in an active context is still denied center admin data', async () => {
      await member('guardian', harbor, ['GUARDIAN']);
      const s = await signIn(h, email('guardian'));
      expect(s.body.permissions).toEqual(['family.portal.read', 'family.preferences.update', 'center.messages.use', 'family.activities.read', 'family.progress.demo', 'family.practice.read', 'family.practice.record']);
    });

    it.each([
      ['membership suspended', async (m: string) => h.prisma.membership.update({ where: { id: m }, data: { status: 'SUSPENDED' } })],
      ['membership revoked', async (m: string) => h.prisma.membership.update({ where: { id: m }, data: { status: 'REVOKED' } })],
      ['center suspended', async () => h.prisma.center.update({ where: { id: harbor }, data: { status: 'SUSPENDED' } })],
      ['role removed', async (m: string) => h.prisma.roleAssignment.deleteMany({ where: { membershipId: m } })],
    ])('%s: denied on the very next request without signing out', async (_n, change) => {
      const m = await member('therapist', harbor, ['THERAPIST']);
      const s = await signIn(h, email('therapist'));
      await get(s, `/api/centers/${harbor}/summary`).expect(200);
      await change(m);
      await get(s, `/api/centers/${harbor}/summary`).expect(404);
      await get(s, '/api/auth/session').expect(200);
    });

    it('a suspended membership is never offered as a context', async () => {
      await member('susp', harbor, ['THERAPIST'], 'SUSPENDED');
      const s = await signIn(h, email('susp'));
      expect(s.body.contexts).toEqual([]);
    });
  });

  describe('AC-11 privilege escalation', () => {
    it('platform admins have no center access; center admins have no platform access; revocation applies at once', async () => {
      const p = await createUser(h.prisma, email('platform'));
      await h.prisma.platformRoleAssignment.create({ data: { userId: p.id, source: 'synthetic_seed', reason: 'test' } });
      await member('hadmin', harbor, ['CENTER_ADMIN']);
      const ps = await signIn(h, email('platform'));
      expect(ps.body.activeContext).toMatchObject({ type: 'platform' });
      await get(ps, '/api/platform/summary').expect(200);
      await get(ps, `/api/centers/${harbor}/summary`).expect(404);
      const cs = await signIn(h, email('hadmin'));
      await get(cs, '/api/platform/summary').expect(403);
      await post(h, '/api/auth/context', cs, { platform: true }).expect(403);
      await h.prisma.platformRoleAssignment.updateMany({ data: { revokedAt: new Date() } });
      await get(ps, '/api/platform/summary').expect(403);
    });

    it('mass-assignment fields are rejected with 400', async () => {
      await member('hadmin', harbor, ['CENTER_ADMIN']);
      const s = await signIn(h, email('hadmin'));
      await post(h, '/api/auth/context', s, { platform: true, isPlatformAdmin: true }).expect(400);
      await post(h, '/api/auth/context', s, { membershipId: UUID0, role: 'PLATFORM_ADMIN' }).expect(400);
      await post(h, '/api/auth/context', s, { membershipId: UUID0, role: 'CENTER_ADMIN', centerId: cedar }).expect(400);
    });

    // TB-EM-003/004: memberships and center roles are written only by the audited invitation/staff routes below; platform roles never.
    it('only the reviewed set of routes writes data, and none writes platform roles', () => {
      const unsafe = h.app.get(RouteAccessVerifier).routes().filter((r) => r.method !== 'GET').map((r) => `${r.method} ${r.route}`).sort();
      expect(unsafe).toEqual([
        'PATCH /centers/:centerId/activities/:templateId', 'PATCH /centers/:centerId/appointments/:appointmentId', 'PATCH /centers/:centerId/children/:childId',
        'PATCH /centers/:centerId/clinical/assessments/:id', 'PATCH /centers/:centerId/clinical/notes/:id', 'PATCH /centers/:centerId/clinical/plan-versions/:id', 'PATCH /centers/:centerId/clinical/reports/:id', 'PATCH /centers/:centerId/clinical/sessions/:id',
        'PATCH /centers/:centerId/me', 'PATCH /centers/:centerId/series/:seriesId', 'PATCH /centers/:centerId/settings', 'PATCH /centers/:centerId/staff/:membershipId',
        'POST /auth/context', 'POST /auth/login', 'POST /auth/logout', 'POST /auth/logout-all',
        'POST /auth/password/change', 'POST /auth/password/forgot', 'POST /auth/password/reset',
        'POST /center-applications',
        'POST /centers/:centerId/activities', 'POST /centers/:centerId/activities/:templateId/duplicate', 'POST /centers/:centerId/appointments', 'POST /centers/:centerId/appointments/:appointmentId/status',
        'POST /centers/:centerId/children', 'POST /centers/:centerId/children/:childId/archive', 'POST /centers/:centerId/children/:childId/assignments',
        'POST /centers/:centerId/children/:childId/assignments/:assignmentId/end', 'POST /centers/:centerId/children/:childId/guardians',
        'POST /centers/:centerId/children/:childId/guardians/:linkId/invite', 'POST /centers/:centerId/children/:childId/guardians/:linkId/remove',
        'POST /centers/:centerId/children/:childId/restore', 'POST /centers/:centerId/clinical/children/:childId/assessments',
        'POST /centers/:centerId/clinical/children/:childId/notes', 'POST /centers/:centerId/clinical/children/:childId/observations', 'POST /centers/:centerId/clinical/children/:childId/plans', 'POST /centers/:centerId/clinical/children/:childId/reports', 'POST /centers/:centerId/clinical/children/:childId/sessions',
        'POST /centers/:centerId/clinical/notes/:id/sign', 'POST /centers/:centerId/clinical/plan-versions/:id/approve', 'POST /centers/:centerId/clinical/plan-versions/:id/return',
        'POST /centers/:centerId/clinical/plan-versions/:id/submit', 'POST /centers/:centerId/clinical/plans/:planId/versions', 'POST /centers/:centerId/clinical/practice-feedback/:id/acknowledge',
        'POST /centers/:centerId/clinical/reports/:id/comments', 'POST /centers/:centerId/clinical/reports/:id/suggestion-decisions', 'POST /centers/:centerId/clinical/reports/:id/release', 'POST /centers/:centerId/clinical/reports/:id/return',
        'POST /centers/:centerId/clinical/reports/:id/submit', 'POST /centers/:centerId/clinical/reports/:id/versions', 'POST /centers/:centerId/family/practice/outcomes', 'POST /centers/:centerId/family/preferences',
        'POST /centers/:centerId/governance/consent-grants', 'POST /centers/:centerId/governance/documents/:kind/:id/transitions', 'POST /centers/:centerId/governance/release', 'POST /centers/:centerId/governance/transfer-simulations',
        'POST /centers/:centerId/invitations', 'POST /centers/:centerId/invitations/:invitationId/resend', 'POST /centers/:centerId/invitations/:invitationId/revoke',
        'POST /centers/:centerId/series', 'POST /centers/:centerId/series/:seriesId/cancel',
        'POST /centers/:centerId/setup/:key/complete',
        'POST /centers/:centerId/staff/:membershipId/reactivate', 'POST /centers/:centerId/staff/:membershipId/revoke', 'POST /centers/:centerId/staff/:membershipId/suspend',
        'POST /centers/:centerId/threads', 'POST /centers/:centerId/threads/:threadId/close', 'POST /centers/:centerId/threads/:threadId/messages', 'POST /centers/:centerId/threads/:threadId/reopen',
        'POST /invitations/accept', 'POST /invitations/accept-new', 'POST /invitations/inspect',
        'POST /platform/applications/:id/decision', 'POST /platform/applications/:id/start-review',
        'POST /platform/centers', 'POST /platform/centers/:centerId/admin-invitations',
        'POST /platform/centers/:centerId/admin-invitations/:invitationId/replace', 'POST /platform/centers/:centerId/admin-invitations/:invitationId/resend',
        'POST /platform/centers/:centerId/admin-invitations/:invitationId/revoke', 'POST /platform/centers/:centerId/trial/extend',
        'POST /platform/reminders/run',
      ]);
    });

    it('the database rejects self-grants, a second bootstrap record and PLATFORM_ADMIN as a center role', async () => {
      const a = await createUser(h.prisma);
      const b = await createUser(h.prisma);
      await expect(h.prisma.platformRoleAssignment.create({ data: { userId: a.id, source: 'grant', grantedByUserId: a.id, reason: 'self' } })).rejects.toThrow();
      await expect(h.prisma.platformRoleAssignment.create({ data: { userId: a.id, source: 'grant', reason: 'no granter' } })).rejects.toThrow();
      await expect(h.prisma.platformRoleAssignment.create({ data: { userId: a.id, source: 'bootstrap', grantedByUserId: b.id, reason: 'x' } })).rejects.toThrow();
      await h.prisma.platformRoleAssignment.create({ data: { userId: a.id, source: 'bootstrap', reason: 'first' } });
      await expect(h.prisma.platformRoleAssignment.create({ data: { userId: b.id, source: 'bootstrap', reason: 'second' } })).rejects.toThrow();
      await expect(h.prisma.platformRoleAssignment.create({ data: { userId: b.id, role: 'CENTER_ADMIN', source: 'synthetic_seed', reason: 'x' } })).rejects.toThrow();
      const m = await member('x', harbor, []);
      await expect(h.prisma.roleAssignment.create({ data: { membershipId: m, role: 'PLATFORM_ADMIN' } })).rejects.toThrow();
    });
  });

  describe('AC-12 permission matrix', () => {
    const expected: Record<string, Role[]> = {
      'platform.summary.read': ['PLATFORM_ADMIN'],
      'platform.applications.read': ['PLATFORM_ADMIN'],
      'platform.applications.decide': ['PLATFORM_ADMIN'],
      'center.summary.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
      'platform.centers.read': ['PLATFORM_ADMIN'],
      'platform.centers.create': ['PLATFORM_ADMIN'],
      'platform.centers.invite_admin': ['PLATFORM_ADMIN'],
      'center.settings.read': ['CENTER_ADMIN'],
      'center.settings.update': ['CENTER_ADMIN'],
      'center.setup.manage': ['CENTER_ADMIN'],
      'center.staff.read': ['CENTER_ADMIN', 'COORDINATOR'],
      'center.staff.invite': ['CENTER_ADMIN'],
      'center.staff.manage': ['CENTER_ADMIN'],
      'center.profile.self': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
      'platform.centers.trial': ['PLATFORM_ADMIN'],
      'center.children.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
      'center.children.manage': ['CENTER_ADMIN', 'COORDINATOR'],
      'center.families.manage': ['CENTER_ADMIN', 'COORDINATOR'],
      'center.assignments.manage': ['CENTER_ADMIN', 'COORDINATOR'],
      'center.schedule.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
      'center.schedule.manage': ['CENTER_ADMIN', 'COORDINATOR'],
      'center.appointments.status': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST'],
      'family.portal.read': ['GUARDIAN'],
      'family.preferences.update': ['GUARDIAN'],
      'center.messages.use': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'GUARDIAN'],
      'center.messages.manage': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST'],
      'platform.reminders.run': ['PLATFORM_ADMIN'],
      'center.governance.read': ['CENTER_ADMIN', 'COORDINATOR'],
      'center.clinical.read': ['THERAPIST', 'CLINICAL_SUPERVISOR'],
      'center.clinical.draft': ['THERAPIST'],
      'center.clinical.review': ['CLINICAL_SUPERVISOR'],
      'center.activities.read': ['CENTER_ADMIN', 'COORDINATOR', 'THERAPIST', 'CLINICAL_SUPERVISOR'],
      'center.activities.manage': ['THERAPIST', 'CLINICAL_SUPERVISOR'],
      'family.activities.read': ['GUARDIAN'],
      'family.progress.demo': ['GUARDIAN'],
      'center.practice.read': ['THERAPIST', 'CLINICAL_SUPERVISOR'],
      'center.practice.acknowledge': ['THERAPIST'],
      'family.practice.read': ['GUARDIAN'],
      'family.practice.record': ['GUARDIAN'],
    };
    const cases = ROLES.flatMap((role) => [...Object.keys(PERMISSIONS), ...CLINICAL_CAPABILITIES].map((p) => [role, p] as const));
    it.each(cases)('%s × %s', (role, permission) => {
      expect(can(role, permission)).toBe(expected[permission]?.includes(role) ?? false);
    });
    it('every clinical capability is DENY for every role and an unknown permission is DENY', () => {
      for (const role of ROLES) {
        for (const c of CLINICAL_CAPABILITIES) expect(can(role, c)).toBe(false);
        expect(can(role, 'center.anything.else')).toBe(false);
      }
    });
    it('PERMISSIONS_MATRIX.md matches the code', () => {
      const doc = readFileSync(join(__dirname, '../../../docs/emergent/security/PERMISSIONS_MATRIX.md'), 'utf8');
      for (const [p, roles] of Object.entries(PERMISSIONS)) expect(doc).toContain(`| ${p} | ${roles.join(', ')} |`);
      for (const c of CLINICAL_CAPABILITIES) expect(doc).toContain(`\`${c}\``);
    });
  });

  describe('AC-15/16/17 bootstrap and seed', () => {
    const ok = { DEPLOYMENT_ENV: 'local', BOOTSTRAP_OWNER_ALLOWED: 'true' };
    it.each([
      ['preview', { ...ok, DEPLOYMENT_ENV: 'preview' }, ['--email', 'o@x.test'], true, /refuses/],
      ['shared-synthetic', { ...ok, DEPLOYMENT_ENV: 'shared-synthetic' }, ['--email', 'o@x.test'], true, /refuses/],
      ['ci', { ...ok, DEPLOYMENT_ENV: 'ci' }, ['--email', 'o@x.test'], true, /refuses/],
      ['not allowed', { DEPLOYMENT_ENV: 'local' }, ['--email', 'o@x.test'], true, /BOOTSTRAP_OWNER_ALLOWED/],
      ['no TTY', ok, ['--email', 'o@x.test'], false, /interactive/],
      ['password argument', ok, ['--email', 'o@x.test', '--password=x'], true, /arguments/],
      ['password env', { ...ok, BOOTSTRAP_PASSWORD: 'x' }, ['--email', 'o@x.test'], true, /environment/],
      ['missing email', ok, [], true, /Usage/],
    ])('bootstrap:owner refuses: %s', (_n, env, argv, tty, msg) => {
      expect(bootstrapPreconditionError(env as Record<string, string>, argv, tty)).toMatch(msg);
    });

    it('bootstrap:owner accepts valid preconditions', () => {
      expect(bootstrapPreconditionError(ok, ['--email', 'owner@example.test'], true)).toBeNull();
    });

    it('the bootstrap CLI process exits non-zero in the Emergent preview environment', () => {
      const r = spawnSync('npx', ['ts-node', '--transpile-only', 'src/cli/bootstrap-owner.ts', '--email', 'o@x.test'], {
        cwd: join(__dirname, '..'),
        env: { ...process.env, DEPLOYMENT_ENV: 'preview', BOOTSTRAP_OWNER_ALLOWED: 'true' },
        encoding: 'utf8',
        timeout: 60_000,
      });
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/refuses to run when DEPLOYMENT_ENV=preview/);
    });

    it('seed:synthetic refuses production and staging', () => {
      expect(() => assertSeedAllowed({ DEPLOYMENT_ENV: 'production' })).toThrow();
      expect(() => assertSeedAllowed({ DEPLOYMENT_ENV: 'staging' })).toThrow();
      expect(() => assertSeedAllowed({})).toThrow();
      expect(() => assertSeedAllowed({ DEPLOYMENT_ENV: 'preview' })).not.toThrow();
    });

    it('seed and bootstrap code contain only synthetic .test emails', () => {
      expect(SEED_ACCOUNTS.every((a) => a.email.endsWith('.test'))).toBe(true);
      for (const f of ['seed-synthetic.ts', 'bootstrap-owner.ts']) {
        const src = readFileSync(join(__dirname, '../src/cli', f), 'utf8');
        const emails = src.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
        expect(emails.filter((e) => !e.endsWith('.test'))).toEqual([]);
      }
    });

    it('seeding is idempotent, writes a 0600 local file and rotates passwords and sessions on re-run', async () => {
      const out = join(mkdtempSync(join(tmpdir(), 'tb-seed-')), 'accounts.json');
      const first = await runSeed(h.prisma, out);
      expect(statSync(out).mode & 0o777).toBe(0o600);
      const admin = first.find((a) => a.email === 'admin@harbor.therabridge.test')!;
      const s = await signIn(h, admin.email, admin.password);
      expect(s.body.activeContext).toMatchObject({ type: 'center', role: 'CENTER_ADMIN' });
      const second = await runSeed(h.prisma, out);
      expect(await h.prisma.center.count()).toBe(2);
      expect((await login(h, admin.email, admin.password)).status).toBe(401);
      await get(s, '/api/auth/session').expect(401);
      const again = second.find((a) => a.email === admin.email)!;
      expect((await login(h, admin.email, again.password)).status).toBe(200);
      expect(await h.prisma.user.count({ where: { email: { not: { endsWith: '.test' } } } })).toBe(0);
    });
  });
});

void ORIGIN;
void PASSWORD;
