import { randomUUID } from 'node:crypto';
import type { Tx } from '../src/centers/history';
import { ChildrenService } from '../src/operations/children.service';
import { TrialService } from '../src/operations/trial.service';
import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { Harness, ORIGIN, PASSWORD, Signed, cookieFrom, createUser, makeApp, post, preAuth, resetDb, signIn } from './helpers';

describe('TB-EM-010 family home practice and outcomes (real PostgreSQL)', () => {
  let h: Harness;
  let ops: Signed;
  let admin: Signed;
  let centerId: string;
  const get = (s: Pick<Signed, 'cookie'>, path: string) => h.http().get(path).set('Cookie', s.cookie);
  const mails = () => h.app.get(DevMailboxService).list();
  const c = (path: string) => `/api/centers/${centerId}/${path}`;
  async function accept(email: string, name = 'Person Name') {
    const token = mails().find((m) => m.to === email)?.body.match(/#token=([A-Za-z0-9_-]+)/)?.[1];
    const p = await preAuth(h);
    const res = await h.http().post('/api/invitations/accept-new').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send({ token, displayName: name, password: PASSWORD });
    expect(res.status).toBe(200);
    const t = cookieFrom(res, 'tb_session');
    return { token: t!, cookie: `tb_session=${t}`, csrf: res.body.csrfToken, body: res.body } as Signed;
  }
  async function staff(email: string, roles: string[], specialties: string[] = ['speech']) {
    await post(h, c('invitations'), admin, { email, displayName: 'Staff', roles, ...(specialties.length ? { specialties } : {}) }).expect(201);
    return accept(email, `Staff ${email.split('@')[0]}`);
  }

  async function family() {
    const kid = (await post(h, c('children'), admin, { firstName: 'Mila', lastName: 'Stone', dateOfBirth: '2020-02-02', services: ['speech'] }).expect(201)).body.id;
    const link = (await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Ada Stone', email: 'ada@family.test', relationship: 'mother', invite: true }).expect(201)).body.id;
    const guardian = await accept('ada@family.test', 'Ada Stone');
    const week = (await get(guardian, c('family/practice')).expect(200)).body;
    return { kid, link, guardian, body: { childId: kid, templateId: week.children[0].activities[0].id, practiceDate: week.today, choice: 'COMPLETED', idempotencyKey: randomUUID() } };
  }

  const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => { resolve = r; });
    return { promise, resolve };
  };

  // Observe actual PostgreSQL blocking, not timing guesses or Promise.all alone.
  async function waitForBlock(query: string) {
    for (let i = 0; i < 100; i++) {
      const rows = await h.prisma.$queryRaw<{ waiting: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock' AND query ILIKE ${`%${query}%`}) AS waiting`;
      if (rows[0].waiting) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`No PostgreSQL lock wait observed for ${query}`);
  }

  const previousHomeRequestsFlag = process.env.HOME_PLAN_REQUESTS_DEMO;
  beforeAll(async () => {
    process.env.HOME_PLAN_REQUESTS_DEMO = 'true';
    h = await makeApp({ DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' });
  });
  afterAll(async () => {
    await h.close();
    if (previousHomeRequestsFlag === undefined) delete process.env.HOME_PLAN_REQUESTS_DEMO;
    else process.env.HOME_PLAN_REQUESTS_DEMO = previousHomeRequestsFlag;
  });
  beforeEach(async () => {
    h.clock.t = Date.parse('2026-10-19T08:00:00Z');
    await resetDb(h.prisma);
    mails().length = 0;
    const now = new Date();
    for (const title of ['A sample: picture naming', 'B sample: turn-taking game'])
      await h.prisma.activityTemplate.create({ data: { title, service: 'speech', ageBand: '3-5', minutes: 10, materials: ['Cards'], steps: ['Sit together', 'Take turns'], safety: ['Supervise small parts'], createdAt: now } });
    const u = await createUser(h.prisma, 'ops@ops.therabridge.test');
    await h.prisma.platformRoleAssignment.create({ data: { userId: u.id, source: 'synthetic_seed', reason: 'test' } });
    ops = await signIn(h, u.email);
    centerId = (await post(h, '/api/platform/centers', ops, { name: 'Practice Center', timezone: 'Europe/Berlin', country: 'Germany', city: 'Berlin', specialties: ['speech'], firstAdmin: { email: 'lead@prac.test', displayName: 'Lead Admin' } }).expect(201)).body.id;
    admin = await accept('lead@prac.test', 'Lead Admin');
  });

  it('TB-EM-048: guardian requests are structured, idempotent and only assigned therapists may respond', async () => {
    const { kid, link, guardian } = await family();
    const therapist = await staff('plan-request-speech@practice.test', ['THERAPIST'], ['speech']);
    const other = await staff('plan-request-other@practice.test', ['THERAPIST'], ['speech']);
    const sup = await staff('plan-request-supervisor@practice.test', ['CLINICAL_SUPERVISOR'], []);
    const target = c('family/home-plan-requests');
    const inbox = c('clinical/home-plan-requests');
    const requestKey = randomUUID();
    const body = { childId: kid, service: 'speech', requestKey };
    await post(h, target, guardian, body).expect(422); // no assigned therapist yet
    await post(h, c(`children/${kid}/assignments`), admin,
      { membershipId: therapist.body.activeContext.membershipId, service: 'speech', isLead: true }).expect(201);
    await post(h, target, guardian, { ...body, service: 'not-a-service' }).expect(400);
    await post(h, target, guardian, { ...body, message: 'Sensitive unmoderated message' }).expect(400);
    await post(h, target, guardian, { ...body, childId: randomUUID() }).expect(404);
    await post(h, target, admin, body).expect(403);
    await get(guardian, inbox).expect(403);
    await get(sup, inbox).expect(403);
    const first = (await post(h, target, guardian, body).expect(200)).body;
    expect(first).toMatchObject({ status: 'PENDING', synthetic: true, released: false, clinicalAuthorization: false, replayed: false });
    expect((await post(h, target, guardian, body).expect(200)).body).toMatchObject({ id: first.id, replayed: true });
    await post(h, target, guardian, { ...body, requestKey: randomUUID() }).expect(409);
    const collisionKey = randomUUID();
    await post(h, target, guardian, { ...body, requestKey: collisionKey }).expect(409);
    expect(await h.prisma.homePlanRequest.count()).toBe(1);
    expect((await get(guardian, target).expect(200)).body.items.map((r: { id: string }) => r.id)).toEqual([first.id]);
    expect((await get(other, inbox).expect(200)).body.items).toEqual([]);
    expect((await get(therapist, inbox).expect(200)).body.items[0].id).toBe(first.id);
    await post(h, c(`clinical/home-plan-requests/${first.id}/respond`), other, { status: 'ACKNOWLEDGED' }).expect(404);
    await post(h, c(`clinical/home-plan-requests/${first.id}/respond`), guardian, { status: 'ACKNOWLEDGED' }).expect(403);
    await post(h, c(`clinical/home-plan-requests/${first.id}/respond`), therapist,
      { status: 'APPROVED' }).expect(400);
    await post(h, c(`clinical/home-plan-requests/${first.id}/respond`), therapist,
      { status: 'ACKNOWLEDGED', clinicalReportId: randomUUID() }).expect(400);
    const accepted = (await post(h, c(`clinical/home-plan-requests/${first.id}/respond`), therapist,
      { status: 'ACKNOWLEDGED' }).expect(200)).body;
    expect(accepted).toMatchObject({ id: first.id, status: 'ACKNOWLEDGED', released: false, clinicalAuthorization: false });
    await post(h, c(`clinical/home-plan-requests/${first.id}/respond`), therapist,
      { status: 'CLOSED_UNAVAILABLE' }).expect(409);
    const familyView = (await get(guardian, target).expect(200)).body;
    expect(familyView.items[0].status).toBe('ACKNOWLEDGED');
    expect(JSON.stringify(familyView)).not.toMatch(/summary|goals|planVersion|reportId|safetyNote/);
    // The earlier rejected key is now a genuinely new request, not a false replay.
    const again = (await post(h, target, guardian, { ...body, requestKey: collisionKey }).expect(200)).body;
    expect(again.status).toBe('PENDING');
    expect(again.id).not.toBe(first.id);
    expect((await post(h, target, guardian, { ...body, requestKey: collisionKey }).expect(200)).body)
      .toMatchObject({ id: again.id, replayed: true });
    expect(await h.prisma.homePlanRequest.count()).toBe(2);
    expect(await h.prisma.centerEvent.count({ where: { type: 'family.home_plan_requested' } })).toBe(2);
    expect(await h.prisma.centerEvent.count({ where: { type: 'clinical.home_plan_request_answered' } })).toBe(1);
    // Revocation immediately removes visibility and prevents an existing requestKey replay.
    await post(h, c(`children/${kid}/guardians/${link}/remove`), admin, { reason: 'Synthetic revocation' }).expect(200);
    expect((await get(guardian, target).expect(200)).body.items).toEqual([]);
    await post(h, target, guardian, body).expect(404);
    expect((await get(therapist, inbox).expect(200)).body.items).toEqual([]);
    await post(h, c(`clinical/home-plan-requests/${again.id}/respond`), therapist, { status: 'ACKNOWLEDGED' }).expect(404);
  });

  it('TB-EM-048: assignment loss and trial expiry do not bypass tenant-scoped request permissions', async () => {
    const { kid, guardian } = await family();
    const therapist = await staff('request-revocation@practice.test', ['THERAPIST'], ['speech']);
    const membershipId = therapist.body.activeContext.membershipId;
    await post(h, c(`children/${kid}/assignments`), admin,
      { membershipId, service: 'speech', isLead: true }).expect(201);
    const body = { childId: kid, service: 'speech', requestKey: randomUUID() };
    const first = (await post(h, c('family/home-plan-requests'), guardian, body).expect(200)).body;
    await h.prisma.careAssignment.updateMany({ where: { centerId, childId: kid, membershipId }, data: { endedAt: h.clock.now() } });
    expect((await get(therapist, c('clinical/home-plan-requests')).expect(200)).body.items).toEqual([]);
    await post(h, c(`clinical/home-plan-requests/${first.id}/respond`), therapist,
      { status: 'ACKNOWLEDGED' }).expect(404);
    await h.prisma.center.update({ where: { id: centerId }, data: { trialEndsAt: new Date(h.clock.t - 1) } });
    await post(h, c('family/home-plan-requests'), guardian,
      { ...body, requestKey: randomUUID() }).expect(403);
    expect((await get(guardian, c('family/home-plan-requests')).expect(200)).body.items).toHaveLength(1);
  });

  it('denies replay and new submissions after removal, including replacement links for the same user', async () => {
    const { kid, link, guardian, body } = await family();
    const first = (await post(h, c('family/practice/outcomes'), guardian, body).expect(201)).body;
    await post(h, c(`children/${kid}/guardians/${link}/remove`), admin, { reason: 'Synthetic revocation' }).expect(200);
    for (const payload of [body, { ...body, choice: 'SKIPPED' }, { ...body, idempotencyKey: randomUUID() }]) {
      const denied = await post(h, c('family/practice/outcomes'), guardian, payload).expect(404);
      expect(denied.body).not.toHaveProperty('id');
      expect(JSON.stringify(denied.body)).not.toContain(first.id);
    }
    await get(guardian, c(`family/practice/outcomes/${body.idempotencyKey}`)).expect(404);
    // Fixture a newly accepted link for the same user: old outcomes stay revoked.
    await h.prisma.guardianLink.create({ data: { centerId, childId: kid, userId: guardian.body.user.id, displayName: 'Ada Stone', email: 'ada@family.test', emailNorm: 'ada@family.test', relationship: 'mother', createdAt: h.clock.now() } });
    await post(h, c('family/practice/outcomes'), guardian, body).expect(404);
    await get(guardian, c(`family/practice/outcomes/${body.idempotencyKey}`)).expect(404);
    expect(await h.prisma.practiceOutcome.count()).toBe(1);
  });

  it('keeps authorized confirmed retries and unknown-result lookup readable after trial expiry', async () => {
    const { kid, link, guardian, body } = await family();
    const first = (await post(h, c('family/practice/outcomes'), guardian, body).expect(201)).body;
    await h.prisma.center.update({ where: { id: centerId }, data: { trialEndsAt: new Date(h.clock.t - 1) } });
    expect((await post(h, c('family/practice/outcomes'), guardian, body).expect(200)).body).toEqual({ ...first, replayed: true });
    expect((await get(guardian, c(`family/practice/outcomes/${body.idempotencyKey}`)).expect(200)).body.id).toBe(first.id);
    await post(h, c('family/practice/outcomes'), guardian, { ...body, choice: 'SKIPPED' }).expect(409);
    await post(h, c('family/practice/outcomes'), guardian, { ...body, idempotencyKey: randomUUID() }).expect(403);
    await post(h, c(`children/${kid}/guardians/${link}/remove`), admin, { reason: 'Revocation remains allowed after expiry' }).expect(200);
    await post(h, c('family/practice/outcomes'), guardian, body).expect(404);
  });

  it('denies cross-child and cross-center keys without exposing confirmed outcome details', async () => {
    const { guardian, body } = await family();
    const first = (await post(h, c('family/practice/outcomes'), guardian, body).expect(201)).body;
    const otherCenter = await h.prisma.center.create({ data: { name: 'Other synthetic center', slug: 'other-synthetic', timezone: 'UTC' } });
    const child = await h.prisma.child.create({ data: { centerId, firstName: 'Other', lastName: 'Synthetic', dateOfBirth: new Date('2020-01-01'), services: ['speech'], createdById: admin.body.user.id, createdAt: h.clock.now() } });
    for (const childId of [child.id, randomUUID()]) {
      const denied = await post(h, c('family/practice/outcomes'), guardian, { ...body, childId }).expect(404);
      expect(JSON.stringify(denied.body)).not.toContain(first.id);
    }
    const path = `/api/centers/${otherCenter.id}/family/practice/outcomes`;
    await post(h, path, guardian, body).expect(404);
    await get(guardian, `${path}/${body.idempotencyKey}`).expect(404);
    // Same user legitimately has another tenant context and child: key still cannot cross tenants.
    const userId = guardian.body.user.id;
    const membership = await h.prisma.membership.create({ data: { centerId: otherCenter.id, userId, roles: { create: { role: 'GUARDIAN' } } } });
    const otherChild = await h.prisma.child.create({ data: { centerId: otherCenter.id, firstName: 'Other', lastName: 'Tenant', dateOfBirth: new Date('2020-01-01'), services: ['speech'], createdById: admin.body.user.id, createdAt: h.clock.now() } });
    await h.prisma.guardianLink.create({ data: { centerId: otherCenter.id, childId: otherChild.id, userId, displayName: 'Ada', email: 'ada@family.test', emailNorm: 'ada@family.test', relationship: 'mother', createdAt: h.clock.now() } });
    const switched = await post(h, '/api/auth/context', guardian, { membershipId: membership.id, role: 'GUARDIAN' }).expect(200);
    const token = cookieFrom(switched, 'tb_session')!;
    const other = { cookie: `tb_session=${token}`, csrf: switched.body.csrfToken };
    await post(h, path, other, body).expect(404);
    await post(h, path, other, { ...body, childId: otherChild.id }).expect(404);
    await get(other, `${path}/${body.idempotencyKey}`).expect(404);
    expect(await h.prisma.practiceOutcome.count()).toBe(1);
  });

  it('denies replay and recovery lookup when the child is archived', async () => {
    const { kid, guardian, body } = await family();
    await post(h, c('family/practice/outcomes'), guardian, body).expect(201);
    await post(h, c(`children/${kid}/archive`), admin, { reason: 'Synthetic archival' }).expect(200);
    await post(h, c('family/practice/outcomes'), guardian, body).expect(404);
    await get(guardian, c(`family/practice/outcomes/${body.idempotencyKey}`)).expect(404);
    expect(await h.prisma.practiceOutcome.count()).toBe(1);
  });

  it('serializes concurrent authorized retries into one outcome and one recorded event', async () => {
    const { guardian, body } = await family();
    const responses = await Promise.all(Array.from({ length: 4 }, () => post(h, c('family/practice/outcomes'), guardian, body)));
    expect(responses.map((r) => r.status).sort()).toEqual([200, 200, 200, 201]);
    expect(new Set(responses.map((r) => r.body.id)).size).toBe(1);
    expect(await h.prisma.practiceOutcome.count()).toBe(1);
    expect(await h.prisma.centerEvent.count({ where: { type: 'family.practice_recorded' } })).toBe(1);
  });

  it('rechecks authorization after waiting for the write lock when removal commits first', async () => {
    const { kid, link, guardian, body } = await family();
    const locked = deferred();
    const release = deferred();
    const blocker = h.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM center WHERE id = ${centerId}::uuid FOR NO KEY UPDATE`;
      locked.resolve();
      await release.promise;
    });
    let submission: PromiseLike<{ status: number }> | undefined;
    try {
      await locked.promise;
      submission = post(h, c('family/practice/outcomes'), guardian, body).then((r) => r);
      await waitForBlock('center');
      await post(h, c(`children/${kid}/guardians/${link}/remove`), admin, { reason: 'Concurrent synthetic removal' }).expect(200);
    } finally { release.resolve(); await blocker; }
    expect((await submission!).status).toBe(404);
    expect(await h.prisma.practiceOutcome.count()).toBe(0);
    expect(await h.prisma.centerEvent.count({ where: { type: 'family.practice_recorded' } })).toBe(0);
  });

  it.each([false, true])('waits for an uncommitted removal before authorizing an outcome (replay=%s)', async (replay) => {
    const { kid, link, guardian, body } = await family();
    if (replay) await post(h, c('family/practice/outcomes'), guardian, body).expect(201);
    const locked = deferred();
    const release = deferred();
    // Pause the real removal transaction after its UPDATE, before commit.
    const original = h.prisma.$transaction.bind(h.prisma);
    const spy = jest.spyOn(h.prisma, '$transaction').mockImplementationOnce(((fn: (tx: Tx) => Promise<unknown>) => original(async (tx) => {
      const result = await fn(tx);
      locked.resolve();
      await release.promise;
      return result;
    })) as typeof h.prisma.$transaction);
    const removal = h.app.get(ChildrenService).removeGuardian(centerId, admin.body.user.id, kid, link, 'Uncommitted synthetic removal');
    let submission: PromiseLike<{ status: number }> | undefined;
    try {
      await locked.promise;
      spy.mockRestore();
      submission = post(h, c('family/practice/outcomes'), guardian, body).then((r) => r);
      await waitForBlock('guardian_link');
    } finally { spy.mockRestore(); release.resolve(); await removal; }
    expect((await submission!).status).toBe(404);
    expect(await h.prisma.practiceOutcome.count()).toBe(replay ? 1 : 0);
    await get(guardian, c(`family/practice/outcomes/${body.idempotencyKey}`)).expect(404);
  });

  it('holds guardian authorization until creation commits, then permits removal and denies later replay', async () => {
    const { kid, link, guardian, body } = await family();
    const trial = h.app.get(TrialService);
    const original = trial.assertWritable.bind(trial);
    const locked = deferred();
    const release = deferred();
    const spy = jest.spyOn(trial, 'assertWritable').mockImplementationOnce(async (...args) => {
      const result = await original(...args);
      locked.resolve();
      await release.promise;
      return result;
    });
    const submission = post(h, c('family/practice/outcomes'), guardian, body).then((r) => r);
    let removal: PromiseLike<{ status: number }> | undefined;
    try {
      await locked.promise;
      removal = post(h, c(`children/${kid}/guardians/${link}/remove`), admin, { reason: 'Submission commits first' }).then((r) => r);
      await waitForBlock('guardian_link');
    } finally { release.resolve(); spy.mockRestore(); }
    expect((await submission).status).toBe(201);
    expect((await removal!).status).toBe(200);
    await post(h, c('family/practice/outcomes'), guardian, body).expect(404);
    expect(await h.prisma.practiceOutcome.count()).toBe(1);
  });

  it('records fixed-choice synthetic outcomes idempotently and shows them to the assigned therapist, separate from clinical records', async () => {
    const therapist = await staff('thera@prac.test', ['THERAPIST']);
    const other = await staff('other@prac.test', ['THERAPIST']);
    const sup = await staff('sup@prac.test', ['CLINICAL_SUPERVISOR'], []);
    const kid = (await post(h, c('children'), admin, { firstName: 'Mila', lastName: 'Stone', dateOfBirth: '2020-02-02', services: ['speech'] }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: therapist.body.activeContext.membershipId, service: 'speech', isLead: true }).expect(201);
    const adaLink = (await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Ada Stone', email: 'ada@family.test', relationship: 'mother', invite: true }).expect(201)).body.id;
    const ada = await accept('ada@family.test', 'Ada Stone');
    await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Bo Stone', email: 'bo@family.test', relationship: 'father', invite: true }).expect(201);
    const bo = await accept('bo@family.test', 'Bo Stone');

    for (const s of [admin, therapist]) await get(s, c('family/practice')).expect(403);
    const wk = (await get(ada, c('family/practice')).expect(200)).body;
    expect(wk).toMatchObject({ sample: true, released: false, today: '2026-10-19', week: { start: '2026-10-19' }, gates: { practiceDemo: true, clinicalPlanRelease: false, freeText: false, media: false } });
    const [daily, mwf] = wk.children[0].activities;
    expect([daily.frequency, daily.slots.length, mwf.slots.map((x: { date: string }) => x.date)]).toEqual(['Every day', 7, ['2026-10-19', '2026-10-21', '2026-10-23']]);
    expect(daily.slots.slice(0, 2)).toEqual([{ date: '2026-10-19', status: 'PENDING', outcomeId: null, recordable: true }, { date: '2026-10-20', status: 'UPCOMING', outcomeId: null, recordable: false }]);
    const prev = (await get(ada, c('family/practice?week=2026-10-12')).expect(200)).body.children[0].activities[0].slots;
    expect(prev.map((x: { recordable: boolean }) => x.recordable)).toEqual([false, true, true, true, true, true, true]);

    const O = c('family/practice/outcomes');
    const k1 = randomUUID();
    const body = { childId: kid, templateId: daily.id, practiceDate: '2026-10-19', choice: 'COMPLETED', idempotencyKey: k1 };
    const first = (await post(h, O, ada, body).expect(201)).body;
    expect(first).toMatchObject({ choice: 'COMPLETED', practiceDate: '2026-10-19', replayed: false, synthetic: true });
    expect((await post(h, O, ada, body).expect(200)).body).toMatchObject({ id: first.id, replayed: true });
    await post(h, O, ada, { ...body, choice: 'SKIPPED' }).expect(409);
    expect((await post(h, O, ada, { ...body, idempotencyKey: randomUUID() }).expect(409)).body.message).toMatch(/already recorded/);
    await post(h, O, bo, body).expect(409);
    await post(h, O, ada, { ...body, practiceDate: '2026-10-20', idempotencyKey: randomUUID() }).expect(422);
    await post(h, O, ada, { ...body, practiceDate: '2026-10-12', idempotencyKey: randomUUID() }).expect(422);
    await post(h, O, ada, { ...body, templateId: mwf.id, practiceDate: '2026-10-18', idempotencyKey: randomUUID() }).expect(422);
    await post(h, O, ada, { ...body, choice: 'GREAT', idempotencyKey: randomUUID() }).expect(400);
    await post(h, O, ada, { ...body, note: 'free text', idempotencyKey: randomUUID() }).expect(400);
    await post(h, O, ada, { ...body, childId: randomUUID(), idempotencyKey: randomUUID() }).expect(404);
    await post(h, O, ada, { ...body, templateId: mwf.id, practiceDate: '2026-10-16', choice: 'NEEDED_HELP', idempotencyKey: randomUUID() }).expect(201);
    await post(h, O, bo, { ...body, choice: 'SKIPPED', idempotencyKey: randomUUID() }).expect(201);

    expect((await get(ada, c(`family/practice/outcomes/${k1}`)).expect(200)).body.id).toBe(first.id);
    await get(bo, c(`family/practice/outcomes/${k1}`)).expect(404);
    await get(ada, c(`family/practice/outcomes/${randomUUID()}`)).expect(404);
    expect((await get(ada, c('family/practice')).expect(200)).body.children[0].activities[0].slots[0]).toMatchObject({ status: 'COMPLETED', recordable: false });
    expect((await get(bo, c('family/practice')).expect(200)).body.children[0].activities[0].slots[0].status).toBe('SKIPPED');
    const hist = (await get(ada, c('family/practice/history')).expect(200)).body.items;
    expect(hist.map((x: { practiceDate: string; choice: string }) => [x.practiceDate, x.choice])).toEqual([['2026-10-19', 'COMPLETED'], ['2026-10-16', 'NEEDED_HELP']]);

    const F = c('clinical/practice-feedback');
    for (const s of [admin, ada]) await get(s, F).expect(403);
    expect((await get(other, F).expect(200)).body.items).toEqual([]);
    const inbox = (await get(therapist, F).expect(200)).body;
    expect(inbox).toMatchObject({ synthetic: true, notClinical: true, canAcknowledge: true, counts: { total: 3, new: 3 } });
    expect(inbox.items.map((x: { guardian: string; choice: string }) => `${x.guardian}:${x.choice}`).sort()).toEqual(['Ada Stone:COMPLETED', 'Ada Stone:NEEDED_HELP', 'Bo Stone:SKIPPED']);
    expect((await get(therapist, `${F}?choice=SKIPPED`).expect(200)).body.items).toHaveLength(1);
    expect((await get(therapist, `${F}?templateId=${mwf.id}`).expect(200)).body.items).toHaveLength(1);
    expect((await get(therapist, `${F}?from=2026-10-17&to=2026-10-19&childId=${kid}`).expect(200)).body.items).toHaveLength(2);
    await get(therapist, `${F}?from=2026-10-19&to=2026-10-01`).expect(422);
    expect((await get(sup, F).expect(200)).body).toMatchObject({ canAcknowledge: false, counts: { total: 3 } });
    const A = c(`clinical/practice-feedback/${first.id}/acknowledge`);
    await post(h, A, sup).expect(403);
    await post(h, A, other).expect(404);
    expect((await post(h, A, therapist).expect(200)).body.already).toBe(false);
    expect((await post(h, A, therapist).expect(200)).body.already).toBe(true);
    expect((await get(therapist, `${F}?status=acknowledged`).expect(200)).body.items).toHaveLength(1);
    expect((await get(therapist, `${F}?status=new`).expect(200)).body.items).toHaveLength(2);
    expect((await get(ada, c('family/practice/history')).expect(200)).body.items[0].seenByCareTeam).toBe(true);
    expect(await h.prisma.observation.count()).toBe(0);

    await post(h, c(`children/${kid}/guardians/${adaLink}/remove`), admin, { reason: 'Custody update' }).expect(200);
    expect((await get(ada, c('family/practice')).expect(200)).body.children).toEqual([]);
    expect((await get(ada, c('family/practice/history')).expect(200)).body.items).toEqual([]);
    await get(ada, c(`family/practice/outcomes/${k1}`)).expect(404);
    await post(h, O, ada, body).expect(404);
    await post(h, O, ada, { ...body, templateId: mwf.id, practiceDate: '2026-10-19', idempotencyKey: randomUUID() }).expect(404);
    expect((await get(therapist, F).expect(200)).body.items.filter((x: { guardianAccessRemoved: boolean }) => x.guardianAccessRemoved)).toHaveLength(2);

    process.env.FAMILY_PRACTICE_DEMO = 'false';
    try {
      expect((await get(bo, c('family/practice')).expect(200)).body.gates.practiceDemo).toBe(false);
      await post(h, O, bo, { ...body, templateId: mwf.id, idempotencyKey: randomUUID() }).expect(403);
    } finally { process.env.FAMILY_PRACTICE_DEMO = 'true'; }

    await expect(h.prisma.$executeRawUnsafe(`UPDATE practice_outcome SET synthetic = false`)).rejects.toThrow(/synthetic_check/);
    const types = (await h.prisma.centerEvent.findMany({ where: { centerId }, select: { type: true } })).map((e) => e.type);
    expect(types.filter((t) => t === 'family.practice_recorded')).toHaveLength(3);
    expect(types.filter((t) => t === 'clinical.practice_acknowledged')).toHaveLength(1);
  });
});
