import { Harness, ORIGIN, Signed, cookieFrom, createUser, makeApp, post, preAuth, resetDb, signIn } from './helpers';

const valid = (over: Record<string, unknown> = {}) => ({
  organizationName: 'Lighthouse Pediatric Therapy',
  country: 'United States',
  city: 'Portland',
  timezone: 'America/Los_Angeles',
  contactName: 'Avery Chen',
  contactEmail: `avery.${Math.random().toString(36).slice(2)}@lighthouse.therabridge.test`,
  specialties: ['speech', 'occupational'],
  therapistEstimate: 6,
  childEstimate: 40,
  message: 'We would like to pilot with synthetic data.',
  syntheticDataAcknowledged: true,
  ...over,
});

describe('TB-EM-002: center applications and platform review (real PostgreSQL)', () => {
  let h: Harness;
  let admin: Signed;
  let adminId: string;

  function submit(body: object, xff?: string) {
    const run = (async () => {
      const p = await preAuth(h);
      const req = h.http().post('/api/center-applications').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token);
      if (xff) req.set('X-Forwarded-For', xff);
      return req.send(body);
    })();
    return Object.assign(run, {
      expect: async (code: number) => {
        const r = await run;
        expect([r.status, r.body]).toEqual([code, expect.anything()]);
        return r;
      },
    });
  }
  const get = (s: Pick<Signed, 'cookie'>, path: string) => h.http().get(path).set('Cookie', s.cookie);
  async function firstId() {
    return (await h.prisma.centerApplication.findFirstOrThrow()).id;
  }

  beforeAll(async () => {
    h = await makeApp();
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(async () => {
    await resetDb(h.prisma);
    const u = await createUser(h.prisma, 'ops@apps.therabridge.test');
    adminId = u.id;
    await h.prisma.platformRoleAssignment.create({ data: { userId: u.id, source: 'synthetic_seed', reason: 'test' } });
    admin = await signIn(h, u.email);
  });

  describe('public submission', () => {
    it('stores a valid application with a reference, a submitted event and an audit record', async () => {
      const res = await submit(valid()).expect(201);
      expect(res.body.reference).toMatch(/^APP-[A-Z2-9]{6}$/);
      expect(res.body.status).toBe('SUBMITTED');
      const app = await h.prisma.centerApplication.findFirstOrThrow({ include: { events: true } });
      expect(app.events.map((e) => e.type)).toEqual(['submitted']);
      expect(await h.prisma.auditEvent.count({ where: { type: 'application.submitted' } })).toBe(1);
      expect(await h.prisma.center.count()).toBe(0);
    });

    it('requires the pre-auth CSRF token and an allowed Origin', async () => {
      await h.http().post('/api/center-applications').set('Origin', ORIGIN).send(valid()).expect(403);
      const p = await preAuth(h);
      await h.http().post('/api/center-applications').set('Origin', 'https://evil.example').set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send(valid()).expect(403);
    });

    it.each([
      ['missing organization', { organizationName: '' }],
      ['bad email', { contactEmail: 'not-an-email' }],
      ['unknown specialty', { specialties: ['astrology'] }],
      ['no specialty', { specialties: [] }],
      ['zero therapists', { therapistEstimate: 0 }],
      ['huge estimate', { childEstimate: 999999 }],
      ['bad timezone', { timezone: 'Mars Time' }],
      ['synthetic data not acknowledged', { syntheticDataAcknowledged: false }],
      ['unknown field (mass assignment)', { status: 'APPROVED' }],
      ['message too long', { message: 'x'.repeat(2001) }],
    ])('rejects %s with 400', async (_n, over) => {
      await submit(valid(over)).expect(400);
      expect(await h.prisma.centerApplication.count()).toBe(0);
    });

    it('allows only one open application per contact email (case-insensitive)', async () => {
      await submit(valid({ contactEmail: 'dup@lighthouse.therabridge.test' })).expect(201);
      const dup = await submit(valid({ contactEmail: 'DUP@Lighthouse.therabridge.test' })).expect(409);
      expect(dup.body.message).toMatch(/already being reviewed/);
    });

    it('rate-limits submissions per network (5 per hour)', async () => {
      for (let i = 0; i < 5; i++) await submit(valid()).expect(201);
      await submit(valid()).expect(429);
    });
  });

  describe('platform review', () => {
    it('lists, filters and searches applications with status counts', async () => {
      await submit(valid({ organizationName: 'Harborview Kids' })).expect(201);
      await submit(valid({ organizationName: 'Maple Therapy' })).expect(201);
      const all = await get(admin, '/api/platform/applications').expect(200);
      expect(all.body.total).toBe(2);
      expect(all.body.counts.SUBMITTED).toBe(2);
      expect(all.body.items[0]).not.toHaveProperty('contactEmailNorm');
      const found = await get(admin, '/api/platform/applications?q=maple').expect(200);
      expect(found.body.items.map((i: { organizationName: string }) => i.organizationName)).toEqual(['Maple Therapy']);
      expect((await get(admin, '/api/platform/applications?status=APPROVED').expect(200)).body.total).toBe(0);
      await get(admin, '/api/platform/applications?status=BOGUS').expect(400);
      expect((await get(admin, '/api/platform/summary').expect(200)).body.pendingApplications).toBe(2);
    });

    it('start review → approve records reviewer, rationale, immutable history and awaits provisioning', async () => {
      await submit(valid()).expect(201);
      const id = await firstId();
      const r1 = await post(h, `/api/platform/applications/${id}/start-review`, admin, { version: 1 }).expect(200);
      expect(r1.body).toMatchObject({ status: 'UNDER_REVIEW', reviewStartedBy: 'Test User', version: 2 });
      const r2 = await post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'APPROVED', rationale: 'Licensed center, synthetic pilot scope confirmed.', version: 2 }).expect(200);
      expect(r2.body).toMatchObject({ status: 'APPROVED', decidedBy: 'Test User', provisioning: { status: 'AWAITING_PROVISIONING', center: null } });
      expect(r2.body.events.map((e: { type: string }) => e.type)).toEqual(['submitted', 'review_started', 'approved']);
      expect(await h.prisma.center.count()).toBe(0);
      expect(await h.prisma.auditEvent.count({ where: { type: { in: ['application.review_started', 'application.approved'] }, actorUserId: adminId } })).toBe(2);
      await expect(h.prisma.$executeRawUnsafe('UPDATE application_event SET note = $1', 'tampered')).rejects.toThrow(/append-only/);
      await expect(h.prisma.$executeRawUnsafe('DELETE FROM application_event')).rejects.toThrow(/append-only/);
    });

    it('rejects directly from submitted; decided applications cannot change again', async () => {
      await submit(valid()).expect(201);
      const id = await firstId();
      await post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'REJECTED', rationale: 'Outside the synthetic pilot region.', version: 1 }).expect(200);
      await post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'APPROVED', rationale: 'Changing my mind now.', version: 2 }).expect(409);
      await post(h, `/api/platform/applications/${id}/start-review`, admin, { version: 2 }).expect(409);
    });

    it('a stale version is rejected (two reviewers cannot both decide)', async () => {
      await submit(valid()).expect(201);
      const id = await firstId();
      const results = await Promise.all([
        post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'APPROVED', rationale: 'Reviewer A approves this one.', version: 1 }),
        post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'REJECTED', rationale: 'Reviewer B rejects this one.', version: 1 }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await h.prisma.applicationEvent.count({ where: { applicationId: id } })).toBe(2);
    });

    it('requires a rationale of at least 10 characters and a valid decision', async () => {
      await submit(valid()).expect(201);
      const id = await firstId();
      await post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'APPROVED', rationale: 'ok', version: 1 }).expect(400);
      await post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'APPROVED', rationale: 'no            ', version: 1 }).expect(400);
      await post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'PROVISIONED', rationale: 'Trying a sneaky status', version: 1 }).expect(400);
      await post(h, `/api/platform/applications/${id}/decision`, admin, { decision: 'APPROVED', rationale: 'Fine fine fine', version: 1, decidedById: 'x' }).expect(400);
    });

    it('unknown and malformed ids return 404', async () => {
      await get(admin, '/api/platform/applications/00000000-0000-4000-8000-000000000000').expect(404);
      await get(admin, '/api/platform/applications/not-a-uuid').expect(400);
    });
  });

  describe('authorization', () => {
    it('center roles, members without roles and anonymous users cannot read or decide', async () => {
      await submit(valid()).expect(201);
      const id = await firstId();
      const center = await h.prisma.center.create({ data: { slug: 'harbor', name: 'Harbor', timezone: 'America/New_York' } });
      const u = await createUser(h.prisma, 'cadmin@apps.therabridge.test');
      await h.prisma.membership.create({ data: { userId: u.id, centerId: center.id, roles: { create: [{ role: 'CENTER_ADMIN' }] } } });
      const cs = await signIn(h, u.email);
      await get(cs, '/api/platform/applications').expect(403);
      await get(cs, `/api/platform/applications/${id}`).expect(403);
      await post(h, `/api/platform/applications/${id}/decision`, cs, { decision: 'APPROVED', rationale: 'Center admins must not approve.', version: 1 }).expect(403);
      await h.http().get('/api/platform/applications').expect(401);
      await h.prisma.platformRoleAssignment.updateMany({ data: { revokedAt: new Date() } });
      await get(admin, '/api/platform/applications').expect(403);
      expect((await h.prisma.centerApplication.findUniqueOrThrow({ where: { id } })).status).toBe('SUBMITTED');
    });

    it('decisions require the session CSRF token', async () => {
      await submit(valid()).expect(201);
      const id = await firstId();
      await post(h, `/api/platform/applications/${id}/start-review`, { cookie: admin.cookie, csrf: 'wrong' }, { version: 1 }).expect(403);
      void cookieFrom;
    });
  });
});
