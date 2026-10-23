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
    centerId = (await post(h, '/api/platform/centers', ops, { name: 'Clin Center', timezone: 'Europe/Berlin', country: 'Germany', city: 'Berlin', specialties: ['speech', 'occupational'], firstAdmin: { email: 'lead@clin.test', displayName: 'Lead Admin' } }).expect(201)).body.id;
    admin = await accept('lead@clin.test', 'Lead Admin');
  });

  async function setup(services: string[] = ['speech']) {
    const therapist = await staff('thera@clin.test', ['THERAPIST']);
    const other = await staff('other@clin.test', ['THERAPIST']);
    const sup = await staff('sup@clin.test', ['CLINICAL_SUPERVISOR'], []);
    const kid = (await post(h, c('children'), admin, { firstName: 'Mila', lastName: 'Stone', dateOfBirth: '2019-04-02', services }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: therapist.body.activeContext.membershipId, service: 'speech', isLead: true }).expect(201);
    const link = (await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Rosa Stone', email: 'rosa@family.test', relationship: 'mother', invite: true }).expect(201)).body.id;
    const rosa = await accept('rosa@family.test', 'Rosa Stone');
    return { therapist, other, sup, kid, link, rosa };
  }


  it('supports scoped activity duplication and author-only versioned edits without exposing global samples', async () => {
    const { therapist, other, sup, rosa } = await setup();
    const ot = await staff('ot-library@clin.test', ['THERAPIST'], ['occupational']);
    const data = {
      title: 'Picture-card turn taking', service: 'speech', ageBand: '3-6', minutes: 10,
      materials: ['Picture cards'], steps: ['Take turns with cards'],
      safety: ['An adult must supervise'],
    };
    // A therapist may only author an activity in an active declared specialty.
    await post(h, c('activities'), ot, data).expect(403);
    await post(h, c('activities'), admin, data).expect(403);
    const originalId = (await post(h, c('activities'), therapist, data).expect(201)).body.id;
    const original = await h.prisma.activityTemplate.findUniqueOrThrow({ where: { id: originalId } });
    expect(original).toMatchObject({ title: data.title, service: 'speech', version: 1, centerId });

    // A different therapist can copy but cannot overwrite the original author.
    const copy = (await post(h, c(`activities/${originalId}/duplicate`), other, {
      title: 'Personalized speech copy',
    }).expect(201)).body;
    expect(copy).toMatchObject({ version: 1 });
    const copied = await h.prisma.activityTemplate.findUniqueOrThrow({ where: { id: copy.id } });
    expect(copied).toMatchObject({
      title: 'Personalized speech copy', service: 'speech', centerId,
      version: 1,
    });
    expect(copied.createdById).not.toBe(original.createdById);
    expect(copied.steps).toEqual(original.steps);
    expect(copied.safety).toEqual(original.safety);
    const { service, ...editable } = data;
    const update = { ...editable, title: 'Author edited speech activity', version: 1 };
    await patch(other, c(`activities/${originalId}`), update).expect(403);
    const saved = await patch(therapist, c(`activities/${originalId}`), update).expect(200);
    expect(saved.body).toMatchObject({ id: originalId, version: 2 });
    await patch(therapist, c(`activities/${originalId}`), update).expect(409);
    expect(await h.prisma.activityTemplate.findUniqueOrThrow({ where: { id: originalId } }))
      .toMatchObject({ title: update.title, service: 'speech', version: 2 });
    expect(await h.prisma.activityTemplate.findUniqueOrThrow({ where: { id: copy.id } }))
      .toMatchObject({ title: 'Personalized speech copy', version: 1 });

    // Global fictional samples are read-only originals; a copied activity is
    // centre-scoped and must never become a guardian-visible sample.
    const sample = await h.prisma.activityTemplate.create({
      data: { centerId: null, title: 'Public synthetic sample', service: 'speech',
        ageBand: '3-6', minutes: 5, materials: [], steps: ['Play a game'],
        safety: ['Adult present'], createdAt: h.clock.now() },
    });
    await patch(therapist, c(`activities/${sample.id}`), update).expect(404);
    const clonedSample = (await post(h, c(`activities/${sample.id}/duplicate`), therapist, {
      title: 'Local version of sample',
    }).expect(201)).body;
    expect(await h.prisma.activityTemplate.findUniqueOrThrow({ where: { id: clonedSample.id } }))
      .toMatchObject({ centerId, service: 'speech', version: 1 });
    expect(await h.prisma.activityTemplate.findUniqueOrThrow({ where: { id: sample.id } }))
      .toMatchObject({ centerId: null, title: 'Public synthetic sample', version: 1 });
    const guardian = (await get(rosa, c('family/activities')).expect(200)).body;
    expect(JSON.stringify(guardian)).not.toContain('Local version of sample');
    await get(rosa, c('activities')).expect(403);
    await post(h, c(`activities/${originalId}/duplicate`), rosa, { title: 'Disallowed copy' }).expect(403);
    await patch(sup, c(`activities/${originalId}`), update).expect(403);

    const audit = await h.prisma.centerEvent.findMany({ where: { centerId }, select: { type: true } });
    expect(audit.map(e => e.type)).toEqual(expect.arrayContaining([
      'clinical.template_created', 'clinical.template_duplicated', 'clinical.template_updated',
    ]));
  });

  it('shows named active specialty-scoped care team, excludes inactive or revoked staff, and never infers a child-wide referent', async () => {
    const { therapist, other, sup, kid, rosa } = await setup(['speech', 'occupational']);
    const occupational = await staff('ot@clin.test', ['THERAPIST'], ['occupational']);
    const W = c(`clinical/children/${kid}`);
    // Existing 'other' therapist has no active assignment yet.
    await get(other, W).expect(404);
    await post(h, c(`children/${kid}/assignments`), admin, {
      membershipId: other.body.activeContext.membershipId, service: 'speech',
    }).expect(201);
    await post(h, c(`children/${kid}/assignments`), admin, {
      membershipId: occupational.body.activeContext.membershipId, service: 'occupational', isLead: true,
    }).expect(201);
    const names = (rows: { displayName: string }[]) => rows.map(x => x.displayName);
    const speech = (await get(therapist, W).expect(200)).body;
    expect(speech.child.services).toEqual(['speech']);
    expect(speech.childWideReferent).toBeNull();
    expect(speech.careTeam).toHaveLength(2);
    expect(names(speech.careTeam)).toEqual(expect.arrayContaining([
      'Staff thera', 'Staff other',
    ]));
    expect(names(speech.careTeam)).not.toContain('Staff ot');
    expect(speech.careTeam.find((x: { displayName: string }) => x.displayName === 'Staff thera'))
      .toMatchObject({ service: 'speech', isSpecialtyLead: true });
    expect(speech.careTeam.some((x: { displayName: string }) => x.displayName === 'Staff ot')).toBe(false);
    const ot = (await get(occupational, W).expect(200)).body;
    expect(ot.child.services).toEqual(['occupational']);
    expect(ot.careTeam).toEqual([expect.objectContaining({
      displayName: 'Staff ot', service: 'occupational', isSpecialtyLead: true,
    })]);
    const supervisor = (await get(sup, W).expect(200)).body;
    expect(supervisor.careTeam).toHaveLength(3);
    expect(names(supervisor.careTeam)).toEqual(expect.arrayContaining(['Staff ot', 'Staff thera', 'Staff other']));
    expect(supervisor.childWideReferent).toBeNull();
    for (const viewer of [admin, rosa]) await get(viewer, W).expect(403);
    await get(sup, c('threads')).expect(403);

    // A suspended centre membership must not appear even if its assignment
    // has not yet been formally ended.
    await h.prisma.membership.update({
      where: { id: other.body.activeContext.membershipId }, data: { status: 'SUSPENDED' },
    });
    const afterSuspend = (await get(therapist, W).expect(200)).body;
    expect(names(afterSuspend.careTeam)).not.toContain('Staff other');
    expect(afterSuspend.careTeam).toHaveLength(1);

    // Ending an OT assignment removes that name from everyone's scoped view.
    const activeOt = await h.prisma.careAssignment.findFirstOrThrow({
      where: { centerId, childId: kid, membershipId: occupational.body.activeContext.membershipId, endedAt: null },
    });
    await post(h, c(`children/${kid}/assignments/${activeOt.id}/end`), admin).expect(200);
    await get(occupational, W).expect(404);
    const afterRevoke = (await get(sup, W).expect(200)).body;
    expect(names(afterRevoke.careTeam)).not.toContain('Staff ot');
    expect(names(afterRevoke.careTeam)).not.toContain('Staff other');

    // Membership specialty revocation must hide a stale assignment row.
    await h.prisma.membership.update({
      where: { id: other.body.activeContext.membershipId }, data: { status: 'ACTIVE', specialties: [] },
    });
    const afterSpecialtyChange = (await get(therapist, W).expect(200)).body;
    expect(names(afterSpecialtyChange.careTeam)).toEqual(['Staff thera']);
    expect(afterSpecialtyChange.childWideReferent).toBeNull();
  });

  it('captures immutable activity-template content on draft save and never uses changed library text in internal family previews', async () => {
    const { therapist, sup, kid, rosa } = await setup();
    const W = c('clinical/children/' + kid);
    const own = (await post(h, c('activities'), therapist, {
      title: 'Picture naming - original', service: 'speech', ageBand: '3-6',
      minutes: 10, materials: ['Original picture cards'],
      steps: ['Say one word together.'], safety: ['Clinician supervision is required.'],
    }).expect(201)).body.id;
    const wrongService = await h.prisma.activityTemplate.create({
      data: { centerId, title: 'OT only', service: 'occupational', ageBand: '3-6',
        minutes: 10, materials: [], steps: ['Fine motor task'], safety: ['Stay close'],
        createdAt: h.clock.now() },
    });
    const plan = (await post(h, W + '/plans', therapist, { service: 'speech', title: 'Speech practice' }).expect(201)).body;
    const goals = [{ key: 'words', title: 'Name a familiar object', measure: 'count', baseline: 1, target: 5 }];
    const planPath = c('clinical/plan-versions/' + plan.versionId);
    const activity = { templateId: own, goalKey: 'words', frequency: 'Twice weekly' };
    await patch(therapist, planPath, {
      summary: 'Draft', goals, homeActivities: [activity, activity], version: 1,
    }).expect(422);
    await patch(therapist, planPath, {
      summary: 'Draft', goals, homeActivities: [{ ...activity, templateId: wrongService.id }], version: 1,
    }).expect(422);
    expect(await h.prisma.planVersion.findUniqueOrThrow({ where: { id: plan.versionId } }))
      .toMatchObject({ version: 1, homeActivities: [] });
    await patch(therapist, planPath, { summary: 'Draft', goals, homeActivities: [activity], version: 1 }).expect(200);
    const saved = await h.prisma.planVersion.findUniqueOrThrow({ where: { id: plan.versionId } });
    const first = (saved.homeActivities as unknown as Array<{ snapshot: { title: string; steps: string[]; version: number; capturedAt: string } }>)[0].snapshot;
    expect(first).toMatchObject({ title: 'Picture naming - original', steps: ['Say one word together.'], version: 1 });
    expect(first.capturedAt).toBeTruthy();

    await h.prisma.activityTemplate.update({
      where: { id: own }, data: { title: 'Library wording changed', steps: ['Different revised activity'], version: { increment: 1 } },
    });
    await patch(therapist, planPath, { summary: 'Updated draft', goals, homeActivities: [activity], version: 2 }).expect(200);
    const after = await h.prisma.planVersion.findUniqueOrThrow({ where: { id: plan.versionId } });
    const frozen = (after.homeActivities as unknown as Array<{ snapshot: typeof first }>)[0].snapshot;
    expect(frozen).toEqual(first);
    const preview = (await get(therapist, c('clinical/plan-versions/' + plan.versionId + '/family-preview')).expect(200)).body;
    expect(preview).toMatchObject({
      preview: true, released: false,
      activities: [{ goalKey: 'words', template: { title: 'Picture naming - original', version: 1, steps: ['Say one word together.'] } }],
    });
    expect(JSON.stringify((await get(rosa, c('family/activities')).expect(200)).body)).not.toContain('Picture naming');
    await get(sup, W).expect(200);
    await get(admin, W).expect(403);
  });

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
    // Explicit goal-to-home-activity association must target a key in THIS plan version.
    // Invalid input must fail before mutating the draft or concurrency token.
    await patch(therapist, c(`clinical/plan-versions/${plan.versionId}`), {
      summary: 'v1', goals, homeActivities: [{ templateId: tpl, goalKey: 'not-a-real-goal', frequency: '3 times a week' }], version: 1,
    }).expect(422);
    expect(await h.prisma.planVersion.findUniqueOrThrow({ where: { id: plan.versionId } }))
      .toMatchObject({ version: 1, homeActivities: [] });
    await patch(therapist, c(`clinical/plan-versions/${plan.versionId}`), {
      summary: 'v1', goals, homeActivities: [{ templateId: tpl, goalKey: 'two-word', frequency: '3 times a week' }], version: 1,
    }).expect(200);
    expect(await h.prisma.planVersion.findUniqueOrThrow({ where: { id: plan.versionId } }))
      .toMatchObject({ homeActivities: [{ templateId: tpl, goalKey: 'two-word', frequency: '3 times a week' }] });
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
    const therapist = await staff('dual@clin.test', ['THERAPIST'], ['speech', 'occupational']);
    const kid = (await post(h, c('children'), admin, { firstName: 'Test', lastName: 'Child', dateOfBirth: '2019-04-02', services: ['speech', 'occupational'] }).expect(201)).body.id;
    const membershipId = therapist.body.activeContext.membershipId;
    for (const service of ['speech', 'occupational']) await post(h, c(`children/${kid}/assignments`), admin, { membershipId, service, isLead: service === 'speech' }).expect(201);
    const id = (await post(h, c(`clinical/children/${kid}/assessments`), therapist, { service: 'occupational', assessedOn: '2026-10-19', summary: 'OT baseline', areas: [] }).expect(201)).body.id;
    await h.prisma.careAssignment.updateMany({ where: { centerId, childId: kid, membershipId, service: 'occupational', endedAt: null }, data: { endedAt: h.clock.now() } });
    await patch(therapist, c(`clinical/assessments/${id}`), { service: 'speech', assessedOn: '2026-10-19', summary: 'Relabeled', areas: [], version: 1 }).expect(404);
    expect(await h.prisma.assessment.findUniqueOrThrow({ where: { id } })).toMatchObject({ service: 'occupational', summary: 'OT baseline', version: 1 });
  });

  it('rejects an assessment DTO specialty mismatch without modifying an authorized assessment', async () => {
    const { therapist, kid } = await setup();
    const id = (await post(h, c(`clinical/children/${kid}/assessments`), therapist, {
      service: 'speech', assessedOn: '2026-10-19', summary: 'Original synthetic speech assessment', areas: [],
    }).expect(201)).body.id;
    await patch(therapist, c(`clinical/assessments/${id}`), {
      service: 'occupational', assessedOn: '2026-10-19', summary: 'Wrong specialty', areas: [], version: 1,
    }).expect(422);
    expect(await h.prisma.assessment.findUniqueOrThrow({ where: { id } })).toMatchObject({
      service: 'speech', summary: 'Original synthetic speech assessment', version: 1,
    });
  });

  it.each(['staging', 'production'])('denies all existing synthetic message routes in %s with demo flag enabled', async (environment) => {
    const { therapist, kid, link, rosa } = await setup();
    const threadId = (await post(h, c('threads'), therapist, {
      childId: kid, guardianLinkId: link, category: 'scheduling',
      subject: 'Pre-existing synthetic thread', body: 'Synthetic scheduling only',
    }).expect(201)).body.id;
    const oldEnvironment = process.env.DEPLOYMENT_ENV;
    const oldFlag = process.env.FAMILY_MESSAGING_DEMO;
    try {
      process.env.DEPLOYMENT_ENV = environment;
      process.env.FAMILY_MESSAGING_DEMO = 'true';
      const attempts = [
        () => get(therapist, c('threads')),
        () => get(rosa, c(`threads/${threadId}`)),
        () => post(h, c('threads'), therapist, {
          childId: kid, guardianLinkId: link, category: 'scheduling',
          subject: 'Must not open', body: 'Denied synthetic message',
        }),
        () => post(h, c(`threads/${threadId}/messages`), therapist, { body: 'Must not reply' }),
        () => post(h, c(`threads/${threadId}/close`), admin),
        () => post(h, c(`threads/${threadId}/reopen`), admin),
      ];
      for (const attempt of attempts) {
        const response = await attempt().expect(403);
        expect(response.body.message).toMatch(/synthetic demonstration/);
      }
    } finally {
      if (oldEnvironment === undefined) delete process.env.DEPLOYMENT_ENV;
      else process.env.DEPLOYMENT_ENV = oldEnvironment;
      if (oldFlag === undefined) delete process.env.FAMILY_MESSAGING_DEMO;
      else process.env.FAMILY_MESSAGING_DEMO = oldFlag;
    }
  });

  it('denies supervisor messaging entirely and permits managers only internal staff threads', async () => {
    const { sup, kid } = await setup(['speech', 'occupational']);
    const coordinator = await staff('coordinator@clin.test', ['COORDINATOR'], []);
    const requested = [
      { creator: coordinator, audience: 'CARE_TEAM', service: undefined },
      { creator: coordinator, audience: 'SPECIALTY', service: 'speech' },
      { creator: admin, audience: 'CARE_TEAM', service: undefined },
      { creator: admin, audience: 'SPECIALTY', service: 'occupational' },
    ];
    const threadIds: string[] = [];
    for (const choice of requested) {
      const created = await post(h, c('threads'), choice.creator, {
        childId: kid, audience: choice.audience,
        ...(choice.service ? { service: choice.service } : {}),
        category: 'logistics', subject: 'Synthetic staff coordination', body: 'Synthetic staff-only message',
      }).expect(201);
      threadIds.push(created.body.id);
    }
    expect((await get(admin, c('threads')).expect(200)).body.items).toHaveLength(4);
    expect((await get(coordinator, c('threads')).expect(200)).body.items).toHaveLength(4);
    await get(sup, c('threads')).expect(403);
    for (const id of threadIds) {
      await get(admin, c(`threads/${id}`)).expect(200);
      await get(sup, c(`threads/${id}`)).expect(403);
      await post(h, c(`threads/${id}/messages`), sup, { body: 'Denied' }).expect(403);
      await post(h, c(`threads/${id}/close`), sup).expect(403);
    }
    await post(h, c('threads'), sup, {
      childId: kid, audience: 'CARE_TEAM', category: 'logistics',
      subject: 'Denied internal message', body: 'Denied',
    }).expect(403);

    const otherCenterId = (await post(h, '/api/platform/centers', ops, {
      name: 'Separate Clin Center', timezone: 'UTC', country: 'France', city: 'Lyon',
      specialties: ['speech'], firstAdmin: { email: 'otherlead@clin.test', displayName: 'Other Lead' },
    }).expect(201)).body.id;
    const otherAdmin = await accept('otherlead@clin.test', 'Other Lead');
    await get(otherAdmin, c('threads')).expect(404);
    expect((await get(otherAdmin, `/api/centers/${otherCenterId}/threads`).expect(200)).body.items).toHaveLength(0);
    for (const id of threadIds) {
      await get(otherAdmin, `/api/centers/${otherCenterId}/threads/${id}`).expect(404);
      await post(h, `/api/centers/${otherCenterId}/threads/${id}/messages`, otherAdmin, {
        body: 'Cross-tenant attempt',
      }).expect(404);
    }
  });

  it('scopes synthetic family, team and specialty threads after specialty revocation', async () => {
    const { therapist, other, sup, kid, link, rosa } = await setup(['speech', 'occupational']);
    const dual = await staff('dual@clin.test', ['THERAPIST'], ['speech', 'occupational']);
    const membershipId = dual.body.activeContext.membershipId;
    for (const service of ['speech', 'occupational']) {
      await post(h, c(`children/${kid}/assignments`), admin, { membershipId, service }).expect(201);
    }

    const guardianId = (await post(h, c('threads'), therapist, {
      childId: kid, guardianLinkId: link, category: 'scheduling', subject: 'Guardian coordination', body: 'Appointment reminder',
    }).expect(201)).body.id;
    const teamId = (await post(h, c('threads'), therapist, {
      childId: kid, audience: 'CARE_TEAM', category: 'logistics', subject: 'Team coordination', body: 'Room updated',
    }).expect(201)).body.id;
    const specialtyId = (await post(h, c('threads'), dual, {
      childId: kid, audience: 'SPECIALTY', service: 'occupational', category: 'logistics',
      subject: 'Occupational coordination', body: 'Synthetic equipment note',
    }).expect(201)).body.id;

    const ids = async (viewer: Signed) => (await get(viewer, c('threads')).expect(200)).body.items.map((x: { id: string }) => x.id);
    expect(await ids(rosa)).toEqual([guardianId]);
    expect(await ids(other)).toEqual([]);
    expect(await ids(therapist)).toEqual(expect.arrayContaining([guardianId, teamId]));
    expect(await ids(therapist)).not.toContain(specialtyId);
    expect(await ids(dual)).toEqual(expect.arrayContaining([guardianId, teamId, specialtyId]));
    await get(sup, c('threads')).expect(403);
    for (const id of [guardianId, teamId, specialtyId]) await get(sup, c(`threads/${id}`)).expect(403);
    expect((await get(admin, c('threads')).expect(200)).body.items.map((x: { id: string }) => x.id)).toEqual(expect.arrayContaining([teamId, specialtyId]));
    await get(admin, c(`threads/${guardianId}`)).expect(404);
    await post(h, c(`threads/${guardianId}/messages`), admin, { body: 'Manager forbidden' }).expect(404);
    await get(therapist, c(`threads/${specialtyId}`)).expect(404);
    await get(rosa, c(`threads/${teamId}`)).expect(404);
    await get(other, c(`threads/${teamId}`)).expect(404);
    await post(h, c('threads'), rosa, {
      childId: kid, audience: 'CARE_TEAM', category: 'scheduling', subject: 'Not allowed', body: 'No access',
    }).expect(403);
    await post(h, c('threads'), therapist, {
      childId: kid, audience: 'SPECIALTY', service: 'occupational', category: 'scheduling',
      subject: 'Not assigned', body: 'No access',
    }).expect(404);

    const activeOt = await h.prisma.careAssignment.findFirstOrThrow({
      where: { centerId, childId: kid, membershipId, service: 'occupational', endedAt: null },
    });
    await post(h, c(`children/${kid}/assignments/${activeOt.id}/end`), admin).expect(200);
    expect(await ids(dual)).toEqual(expect.arrayContaining([guardianId, teamId]));
    expect(await ids(dual)).not.toContain(specialtyId);
    await get(dual, c(`threads/${specialtyId}`)).expect(404);
    await post(h, c(`threads/${specialtyId}/messages`), dual, { body: 'Should not send' }).expect(404);
    await get(dual, c(`threads/${teamId}`)).expect(200);

    // A therapist who loses the final remaining assignment must lose even shared-team and guardian threads.
    const activeSpeech = await h.prisma.careAssignment.findFirstOrThrow({
      where: { centerId, childId: kid, membershipId, service: 'speech', endedAt: null },
    });
    await post(h, c(`children/${kid}/assignments/${activeSpeech.id}/end`), admin).expect(200);
    expect(await ids(dual)).toEqual([]);
    for (const id of [guardianId, teamId, specialtyId]) {
      await get(dual, c(`threads/${id}`)).expect(404);
      await post(h, c(`threads/${id}/messages`), dual, { body: 'No assignments' }).expect(404);
    }
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
