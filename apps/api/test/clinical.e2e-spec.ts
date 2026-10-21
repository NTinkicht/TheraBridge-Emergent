import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { Harness, ORIGIN, PASSWORD, Signed, cookieFrom, createUser, makeApp, post, preAuth, resetDb, signIn } from './helpers';

const DAY = 86_400_000;

describe('TB-EM-008 clinical workspace foundations + messaging policy (real PostgreSQL)', () => {
  let h: Harness;
  let ops: Signed;
  let admin: Signed;
  let centerId: string;
  const get = (s: Pick<Signed, 'cookie'>, path: string) => h.http().get(path).set('Cookie', s.cookie);
  const patch = (s: Signed, path: string, body: object) => h.http().patch(path).set('Origin', ORIGIN).set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send(body);
  const mails = () => h.app.get(DevMailboxService).list();
  const c = (path: string) => `/api/centers/${centerId}/${path}`;
  async function accept(email: string, name = 'Person Name') {
    const token = mails().find((m) => m.to === email)?.body.match(/#token=([A-Za-z0-9_-]+)/)?.[1];
    const p = await preAuth(h);
    const res = await h.http().post('/api/invitations/accept-new').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send({ token, displayName: name, password: PASSWORD });
    const t = cookieFrom(res, 'tb_session');
    return { token: t!, cookie: `tb_session=${t}`, csrf: res.body.csrfToken, body: res.body } as Signed;
  }
  async function staff(email: string, roles: string[], specialties: string[] = ['speech']) {
    await post(h, c('invitations'), admin, { email, displayName: 'Staff', roles, ...(specialties.length ? { specialties } : {}) }).expect(201);
    return accept(email, `Staff ${email.split('@')[0]}`);
  }

  beforeAll(async () => { h = await makeApp({ DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' }); });
  afterAll(async () => { await h.close(); });
  beforeEach(async () => {
    h.clock.t = Date.parse('2026-10-19T08:00:00Z');
    await resetDb(h.prisma);
    mails().length = 0;
    const u = await createUser(h.prisma, 'ops@ops.therabridge.test');
    await h.prisma.platformRoleAssignment.create({ data: { userId: u.id, source: 'synthetic_seed', reason: 'test' } });
    ops = await signIn(h, u.email);
    centerId = (await post(h, '/api/platform/centers', ops, { name: 'Clin Center', timezone: 'Europe/Berlin', country: 'Germany', city: 'Berlin', specialties: ['speech', 'ot'], firstAdmin: { email: 'lead@clin.test', displayName: 'Lead Admin' } }).expect(201)).body.id;
    admin = await accept('lead@clin.test', 'Lead Admin');
  });

  async function setup() {
    const therapist = await staff('thera@clin.test', ['THERAPIST']);
    const other = await staff('other@clin.test', ['THERAPIST']);
    const sup = await staff('sup@clin.test', ['CLINICAL_SUPERVISOR'], []);
    const kid = (await post(h, c('children'), admin, { firstName: 'Mila', lastName: 'Stone', dateOfBirth: '2019-04-02', services: ['speech'] }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: therapist.body.activeContext.membershipId, service: 'speech', isLead: true }).expect(201);
    const link = (await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Rosa Stone', email: 'rosa@family.test', relationship: 'mother', invite: true }).expect(201)).body.id;
    const rosa = await accept('rosa@family.test', 'Rosa Stone');
    return { therapist, other, sup, kid, link, rosa };
  }

  it('therapist drafts assessments, versioned goals, session notes and observations; supervisor reviews; approval and signing stay locked', async () => {
    const { therapist, other, sup, kid, rosa } = await setup();
    const W = c(`clinical/children/${kid}`);
    for (const s of [admin, rosa, other]) await get(s, W).expect(s === other ? 404 : 403);
    const a = (await post(h, `${W}/assessments`, therapist, { service: 'speech', assessedOn: '2026-10-19', summary: 'Synthetic baseline', areas: [{ area: 'Expressive language', finding: 'Two-word phrases' }] }).expect(201)).body.id;
    await post(h, `${W}/assessments`, sup, { service: 'speech', assessedOn: '2026-10-19', summary: 'x', areas: [] }).expect(403);
    await patch(therapist, c(`clinical/assessments/${a}`), { service: 'speech', assessedOn: '2026-10-19', summary: 'Updated', areas: [], version: 2 }).expect(409);
    await patch(therapist, c(`clinical/assessments/${a}`), { service: 'speech', assessedOn: '2026-10-19', summary: 'Updated', areas: [], version: 1 }).expect(200);

    const tpl = (await post(h, c('activities'), therapist, { title: 'Bubble sounds', service: 'speech', ageBand: '3-6 years', minutes: 10, materials: ['Bubbles'], steps: ['Blow a bubble and say pop.'], safety: ['Keep liquid out of reach.'] }).expect(201)).body.id;
    await post(h, c('activities'), admin, { title: 'Nope', service: 'speech', ageBand: 'x', minutes: 5, materials: [], steps: ['abc'], safety: ['abc'] }).expect(403);
    const plan = (await post(h, `${W}/plans`, therapist, { service: 'speech', title: 'Speech plan' }).expect(201)).body;
    const goals = [{ key: 'two-word', title: 'Uses two-word phrases', measure: 'percent', baseline: 20, target: 80 }];
    await post(h, c(`clinical/plan-versions/${plan.versionId}/submit`), therapist, { version: 1 }).expect(422);
    await patch(therapist, c(`clinical/plan-versions/${plan.versionId}`), { summary: 'v1', goals, homeActivities: [{ templateId: tpl, frequency: '3 times a week' }], version: 1 }).expect(200);
    await post(h, c(`clinical/plan-versions/${plan.versionId}/submit`), therapist, { version: 2 }).expect(200);
    await patch(therapist, c(`clinical/plan-versions/${plan.versionId}`), { summary: 'late', goals, homeActivities: [], version: 3 }).expect(409);
    await post(h, c(`clinical/plan-versions/${plan.versionId}/approve`), sup).expect(403);
    await post(h, c(`clinical/plan-versions/${plan.versionId}/return`), therapist, { comment: 'self review' }).expect(403);
    await post(h, c(`clinical/plan-versions/${plan.versionId}/return`), sup, { version: 3, comment: 'Please add a measurable target for home practice.' }).expect(200);
    await post(h, c(`clinical/plan-versions/${plan.versionId}/submit`), therapist, { version: 4 }).expect(200);
    await post(h, c(`clinical/plans/${plan.id}/versions`), therapist).expect(409);
    await post(h, c(`governance/documents/PLAN/${plan.versionId}/transitions`), therapist, { version: 5, action: 'WITHDRAW', reason: 'Explicit synthetic revision request' }).expect(201);
    const v2 = (await post(h, c(`clinical/plans/${plan.id}/versions`), therapist).expect(201)).body;
    expect(v2.number).toBe(2);
    await post(h, c(`clinical/plans/${plan.id}/versions`), therapist).expect(409);

    const note = (await post(h, `${W}/notes`, therapist, { service: 'speech', sessionDate: '2026-10-19' }).expect(201)).body.id;
    await patch(therapist, c(`clinical/notes/${note}`), { sections: { focus: 'Two-word phrases', response: 'Engaged' }, version: 1 }).expect(200);
    await post(h, c(`clinical/notes/${note}/sign`), therapist).expect(403);
    await post(h, `${W}/observations`, therapist, { planVersionId: v2.id, goalKey: 'nope', value: 3, observedOn: '2026-10-19' }).expect(422);
    await post(h, `${W}/observations`, therapist, { planVersionId: v2.id, goalKey: 'two-word', value: 40, observedOn: '2026-10-29' }).expect(422);
    await post(h, `${W}/observations`, therapist, { planVersionId: v2.id, goalKey: 'two-word', value: 40, observedOn: '2026-10-19', sessionNoteId: note }).expect(201);

    const ws = (await get(sup, W).expect(200)).body;
    expect(ws).toMatchObject({ canEdit: false, canReview: true, synthetic: true });
    expect(ws.plans[0].versions.map((x: { number: number; status: string }) => [x.number, x.status])).toEqual([[2, 'DRAFT'], [1, 'WITHDRAWN']]);
    expect(ws.plans[0].versions[1].reviewNotes).toHaveLength(1);
    expect(ws.observations).toEqual([expect.objectContaining({ goalKey: 'two-word', value: 40 })]);
    expect(ws.notes[0].sections).toEqual({ focus: 'Two-word phrases', response: 'Engaged' });
    const prev = (await get(therapist, c(`clinical/plan-versions/${v2.id}/family-preview`)).expect(200)).body;
    expect(prev).toMatchObject({ preview: true, released: false, activities: [{ template: { title: 'Bubble sounds' } }] });

    // Families see only sample activities, never plan content.
    await h.prisma.activityTemplate.create({ data: { centerId: null, title: 'Sample speech game', service: 'speech', ageBand: '3-6', minutes: 5, materials: [], steps: ['Step one'], safety: ['Stay close'], createdAt: new Date() } });
    const fam = (await get(rosa, c('family/activities')).expect(200)).body;
    expect(fam).toMatchObject({ sample: true, released: false, children: [{ activities: [{ title: 'Sample speech game' }] }] });
    expect(JSON.stringify(fam)).not.toMatch(/two-word|Bubble sounds|Synthetic baseline/);
    const types = (await h.prisma.centerEvent.findMany({ where: { centerId }, select: { type: true } })).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['clinical.assessment_drafted', 'clinical.plan_submitted', 'clinical.plan_returned', 'clinical.plan_version_started', 'clinical.session_saved', 'clinical.observation_recorded']));
  });

  it('denies assessment edits after specialty revocation', async () => {
    const therapist = await staff('dual@clin.test', ['THERAPIST'], ['speech', 'ot']);
    const kid = (await post(h, c('children'), admin, { firstName: 'Test', lastName: 'Child', dateOfBirth: '2019-04-02', services: ['speech', 'ot'] }).expect(201)).body.id;
    const membershipId = therapist.body.activeContext.membershipId;
    for (const service of ['speech', 'ot']) await post(h, c(`children/${kid}/assignments`), admin, { membershipId, service, isLead: service === 'speech' }).expect(201);
    const id = (await post(h, c(`clinical/children/${kid}/assessments`), therapist, { service: 'ot', assessedOn: '2026-10-19', summary: 'OT baseline', areas: [] }).expect(201)).body.id;
    await h.prisma.careAssignment.updateMany({ where: { centerId, childId: kid, membershipId, service: 'ot', endedAt: null }, data: { endedAt: h.clock.now() } });
    await patch(therapist, c(`clinical/assessments/${id}`), { service: 'speech', assessedOn: '2026-10-19', summary: 'Relabeled', areas: [], version: 1 }).expect(404);
    expect(await h.prisma.assessment.findUniqueOrThrow({ where: { id } })).toMatchObject({ service: 'ot', summary: 'OT baseline', version: 1 });
  });

  it('messages are recipient-specific, demo-gated, and blocked after trial expiry while consented reminders continue', async () => {
    const { therapist, kid, link, rosa } = await setup();
    await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Dan Stone', email: 'dan@family.test', relationship: 'father', invite: true }).expect(201);
    const dan = await accept('dan@family.test', 'Dan Stone');
    await post(h, c('threads'), therapist, { childId: kid, category: 'scheduling', subject: 'For Rosa', body: 'Hello' }).expect(422);
    const t = (await post(h, c('threads'), therapist, { childId: kid, guardianLinkId: link, category: 'scheduling', subject: 'For Rosa', body: 'Hello' }).expect(201)).body.id;
    expect((await get(rosa, c('threads')).expect(200)).body.items).toHaveLength(1);
    expect((await get(dan, c('threads')).expect(200)).body.items).toHaveLength(0);
    await get(dan, c(`threads/${t}`)).expect(404);
    process.env.FAMILY_MESSAGING_DEMO = 'false';
    expect((await post(h, c(`threads/${t}/messages`), rosa, { body: 'hi' }).expect(403)).body.message).toMatch(/synthetic demonstration/);
    for (const viewer of [rosa, therapist, admin]) {
      await get(viewer, c('threads')).expect(403);
      await get(viewer, c(`threads/${t}`)).expect(403);
    }
    await post(h, c(`threads/${t}/close`), admin).expect(403);
    process.env.FAMILY_MESSAGING_DEMO = 'true';

    const tid = therapist.body.activeContext.membershipId;
    const startsAt = new Date(h.clock.now().getTime() + 30 * DAY + 12 * 3_600_000);
    await post(h, c('appointments'), admin, { childId: kid, membershipId: tid, service: 'speech', startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + 45 * 60_000).toISOString() }).expect(201);
    h.clock.advance(30 * DAY);
    const [rosa2, ops2] = [await signIn(h, 'rosa@family.test'), await signIn(h, 'ops@ops.therabridge.test')];
    expect((await post(h, c(`threads/${t}/messages`), rosa2, { body: 'after expiry' }).expect(403)).body.message).toMatch(/trial has ended/);
    expect((await post(h, '/api/platform/reminders/run', ops2).expect(200)).body).toEqual({ sent: 2 });
  });
});
