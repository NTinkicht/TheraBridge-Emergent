import { randomUUID } from 'node:crypto';
import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { Harness, ORIGIN, PASSWORD, type Signed, cookieFrom, createUser, makeApp, post, preAuth, resetDb, signIn } from './helpers';

describe('TB-EM-021 non-authorizing report suggestion decision ledger (real PostgreSQL)', () => {
  let h: Harness;
  let ops: Signed;
  let admin: Signed;
  let centerId: string;
  const get = (s: Pick<Signed, 'cookie'>, path: string) => h.http().get(path).set('Cookie', s.cookie);
  const patch = (s: Signed, path: string, body: object) => h.http().patch(path).set('Origin', ORIGIN).set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send(body);
  const c = (p: string) => `/api/centers/${centerId}/${p}`;
  const mails = () => h.app.get(DevMailboxService).list();
  async function accept(email: string) {
    const token = mails().find(m => m.to === email)?.body.match(/#token=([A-Za-z0-9_-]+)/)?.[1];
    const p = await preAuth(h);
    const res = await h.http().post('/api/invitations/accept-new').set('Origin', ORIGIN)
      .set('Cookie', p.cookie).set('X-CSRF-Token', p.token)
      .send({ token, displayName: 'Synthetic Clinician', password: PASSWORD });
    const t = cookieFrom(res, 'tb_session');
    return { token: t!, cookie: `tb_session=${t}`, csrf: res.body.csrfToken, body: res.body } as Signed;
  }
  async function staff(email: string, roles: string[], specialties: string[] = ['speech']) {
    await post(h, c('invitations'), admin, { email, displayName: 'Synthetic Staff', roles, ...(specialties.length ? { specialties } : {}) }).expect(201);
    return accept(email);
  }

  beforeAll(async () => { h = await makeApp({ DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' }); });
  afterAll(async () => { await h.close(); });
  beforeEach(async () => {
    h.clock.t = Date.parse('2026-10-19T08:00:00Z');
    await resetDb(h.prisma);
    mails().length = 0;
    const user = await createUser(h.prisma, 'ops@decision.test');
    await h.prisma.platformRoleAssignment.create({ data: { userId: user.id, source: 'synthetic_seed', reason: 'test' } });
    ops = await signIn(h, user.email);
    centerId = (await post(h, '/api/platform/centers', ops, {
      name: 'Decision Centre', timezone: 'Europe/Berlin', country: 'Germany', city: 'Berlin',
      specialties: ['speech', 'occupational'],
      firstAdmin: { email: 'admin@decision.test', displayName: 'Synthetic Admin' },
    }).expect(201)).body.id;
    admin = await accept('admin@decision.test');
  });

  it('persists applied/omitted/reconsidered factual decisions and leaves report versions frozen', async () => {
    const therapist = await staff('speech@decision.test', ['THERAPIST']);
    const other = await staff('other@decision.test', ['THERAPIST']);
    const ot = await staff('ot@decision.test', ['THERAPIST'], ['occupational']);
    const supervisor = await staff('supervisor@decision.test', ['CLINICAL_SUPERVISOR'], []);
    const kid = (await post(h, c('children'), admin, {
      firstName: 'Synthetic', lastName: 'Decision', dateOfBirth: '2019-04-02',
      services: ['speech', 'occupational'],
    }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin, {
      membershipId: therapist.body.activeContext.membershipId, service: 'speech',
    }).expect(201);
    await post(h, c(`children/${kid}/assignments`), admin, {
      membershipId: ot.body.activeContext.membershipId, service: 'occupational',
    }).expect(201);
    await post(h, c(`children/${kid}/guardians`), admin, {
      displayName: 'Synthetic Guardian', email: 'guardian@decision.test',
      relationship: 'mother', invite: true,
    }).expect(201);
    const guardian = await accept('guardian@decision.test');
    const W = c(`clinical/children/${kid}`);
    const assessmentId = (await post(h, W + '/assessments', therapist, {
      service: 'speech', assessedOn: '2026-09-20',
      summary: 'Fictional speech assessment', areas: [],
    }).expect(201)).body.id;
    const plan = (await post(h, W + '/plans', therapist, {
      service: 'speech', title: 'Synthetic speech plan',
    }).expect(201)).body;
    const goals = [{ key: 'words', title: 'Uses two-word phrases', measure: 'percent', baseline: 20, target: 80 }];
    await patch(therapist, c(`clinical/plan-versions/${plan.versionId}`), {
      summary: 'Synthetic initial draft', goals, homeActivities: [], version: 1,
    }).expect(200);
    const observationId = (await post(h, W + '/observations', therapist, {
      planVersionId: plan.versionId, goalKey: 'words', observedOn: '2026-10-10', value: 30,
    }).expect(201)).body.id;
    const reportId = (await post(h, W + '/reports', therapist, {
      service: 'speech', title: 'Synthetic progress report',
      periodStart: '2026-09-01', periodEnd: '2026-10-19',
    }).expect(201)).body.id;
    const P = c(`clinical/reports/${reportId}`);
    const D = P + '/suggestion-decisions';
    const first = (await get(therapist, D).expect(200)).body;
    expect(first).toMatchObject({ synthetic: true, released: false, clinicalAuthorization: false });
    expect(first.latest.goals).toBeNull();
    const goalRef = `planVersion:${plan.versionId}:goal:words`;
    expect(first.sources.goals.sources.map((s: { ref: string }) => s.ref)).toEqual(
      expect.arrayContaining([goalRef, `observation:${observationId}`]));
    const base = {
      section: 'goals', action: 'APPLIED', version: 1,
      proposalFingerprint: first.sources.goals.proposalFingerprint,
      idempotencyKey: randomUUID(),
      claims: [{ text: 'One recorded value was 30 percent.', sourceRefs: [goalRef, `observation:${observationId}`] }],
    };
    // Unknown cross-specialty and cross-report refs cannot be mapped as evidence.
    await post(h, D, therapist, { ...base, claims: [{
      text: 'Unsupported claim', sourceRefs: [`observation:${randomUUID()}`],
    }] }).expect(422);
    await post(h, D, therapist, { ...base, proposalFingerprint: 'a'.repeat(64) }).expect(409);
    await post(h, D, admin, base).expect(403);
    await post(h, D, guardian, base).expect(403);
    await post(h, D, supervisor, base).expect(403);
    await post(h, D, ot, base).expect(404);
    await post(h, D, other, base).expect(404);
    await get(guardian, D).expect(403);
    await get(admin, D).expect(403);
    await get(other, D).expect(404);
    await get(ot, D).expect(404);
    await get(supervisor, D).expect(200);

    const applied = (await post(h, D, therapist, base).expect(201)).body;
    expect(applied).toMatchObject({ persisted: true, replayed: false, action: 'APPLIED', version: 2 });
    expect((await post(h, D, therapist, base).expect(201)).body)
      .toMatchObject({ id: applied.id, replayed: true, version: 2 });
    await post(h, D, therapist, { ...base, action: 'OMITTED' }).expect(409);
    await post(h, D, therapist, { ...base, idempotencyKey: randomUUID() }).expect(409);
    const r = (await get(therapist, P).expect(200)).body;
    expect(r.report.sections.goals).toContain('One recorded value was 30 percent.');
    expect(r.report.sections.goals).toContain(`- Claim 1: ${goalRef}, observation:${observationId}`);
    expect(r.report.sections.goals).toContain('Evidence references (internal draft; goals):');
    expect(r.report.status).toBe('DRAFT');
    const history = (await get(therapist, D).expect(200)).body;
    expect(history.latest.goals).toMatchObject({ id: applied.id, status: 'CURRENT',
      action: 'APPLIED', label: 'NON_CLINICAL_DRAFT' });
    expect(JSON.stringify(history.decisions)).not.toContain('One recorded value was');
    expect(history.latest.goals.claimMap).toEqual([expect.objectContaining({ index: 0,
      sourceRefs: [goalRef, `observation:${observationId}`] })]);
    const snap = (await post(h, P + '/versions', therapist, { version: 2 }).expect(201)).body;
    const frozen = await h.prisma.reportVersion.findFirstOrThrow({
      where: { reportId, number: snap.number },
    });
    await patch(therapist, P, { sections: { goals: 'Clinician corrected prior passage manually.' }, version: 3 }).expect(200);
    expect((await get(therapist, D).expect(200)).body.latest.goals.status).toBe('REQUIRES_REVIEW');
    const untouched = await h.prisma.reportVersion.findUniqueOrThrow({ where: { id: frozen.id } });
    expect(untouched.sections).toEqual(frozen.sections);
    expect(untouched.evidence).toEqual(frozen.evidence);

    const assessmentHash = first.sources.assessment.proposalFingerprint;
    const omitted = (await post(h, D, therapist, {
      section: 'assessment', action: 'OMITTED', version: 4,
      idempotencyKey: randomUUID(), proposalFingerprint: assessmentHash,
      reason: 'Not relevant to this draft',
    }).expect(201)).body;
    expect(omitted).toMatchObject({ version: 5, action: 'OMITTED' });
    const reconsidered = (await post(h, D, therapist, {
      section: 'assessment', action: 'RECONSIDERED', version: 5,
      idempotencyKey: randomUUID(), proposalFingerprint: assessmentHash,
    }).expect(201)).body;
    expect(reconsidered.action).toBe('RECONSIDERED');
    const h2 = (await get(therapist, D).expect(200)).body;
    expect(h2.decisions.filter((d: { section: string }) => d.section === 'assessment').map((d: { action: string }) => d.action))
      .toEqual(['RECONSIDERED', 'OMITTED']);
    expect(h2.decisions.find((d: { action: string }) => d.action === 'OMITTED').reason)
      .toBe('Not relevant to this draft');
    expect(h2.sources.assessment.sources.some((x: { ref: string }) => x.ref === `assessment:${assessmentId}`)).toBe(true);
    await expect(h.prisma.$executeRawUnsafe(`UPDATE report_suggestion_decision SET action = 'OMITTED' WHERE id = '${applied.id}'`))
      .rejects.toThrow(/immutable/);
    await expect(h.prisma.$executeRawUnsafe(`DELETE FROM report_suggestion_decision WHERE id = '${applied.id}'`))
      .rejects.toThrow(/immutable/);
    expect((await h.prisma.centerEvent.findMany({ where: { centerId, type: 'clinical.report_suggestion_reviewed' } })).length).toBe(3);
    expect(await h.prisma.reportSuggestionDecision.count({ where: { reportId } })).toBe(3);

    // A new observation changes the source fingerprint without editing past claims.
    await post(h, W + '/observations', therapist, {
      planVersionId: plan.versionId, goalKey: 'words', observedOn: '2026-10-15', value: 45,
    }).expect(201);
    const changed = (await get(therapist, D).expect(200)).body;
    expect(changed.latest.goals.status).toBe('REQUIRES_REVIEW');
    expect(changed.latest.goals.reasons).toContain('EVIDENCE_CHANGED');
    await post(h, D, therapist, {
      section: 'goals', action: 'OMITTED', version: 6,
      idempotencyKey: randomUUID(), proposalFingerprint: first.sources.goals.proposalFingerprint,
    }).expect(409);
    // Revoking this active specialty prevents even replaying an earlier idempotency key.
    await h.prisma.membership.update({
      where: { id: therapist.body.activeContext.membershipId },
      data: { specialties: [] },
    });
    await post(h, D, therapist, base).expect(403);
  });

  it('serializes simultaneous suggestion decisions and rejects stale tabs', async () => {
    const therapist = await staff('parallel@decision.test', ['THERAPIST']);
    const kid = (await post(h, c('children'), admin, {
      firstName: 'Synthetic', lastName: 'Parallel', dateOfBirth: '2020-02-02', services: ['speech'],
    }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin, {
      membershipId: therapist.body.activeContext.membershipId, service: 'speech',
    }).expect(201);
    const reportId = (await post(h, c(`clinical/children/${kid}/reports`), therapist, {
      service: 'speech', title: 'Parallel draft', periodStart: '2026-10-01', periodEnd: '2026-10-19',
    }).expect(201)).body.id;
    const D = c(`clinical/reports/${reportId}/suggestion-decisions`);
    const view = (await get(therapist, D).expect(200)).body;
    const a = { section: 'sessions', action: 'OMITTED', version: 1, idempotencyKey: randomUUID(),
      proposalFingerprint: view.sources.sessions.proposalFingerprint };
    const b = { ...a, idempotencyKey: randomUUID() };
    const pair = await Promise.all([post(h, D, therapist, a), post(h, D, therapist, b)]);
    expect(pair.map(x => x.status).sort()).toEqual([201, 409]);
    expect(await h.prisma.reportSuggestionDecision.count({ where: { reportId } })).toBe(1);
  });
});
