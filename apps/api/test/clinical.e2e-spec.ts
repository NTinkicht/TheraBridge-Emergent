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

  it('M2-H04 Codex P2: newest plan stays reachable above 200 and older plans are paged with tenant scope', async () => {
    const { therapist, kid } = await setup();
    const base = Date.parse('2026-10-18T00:00:00Z');
    const created = await h.prisma.therapyPlan.createManyAndReturn({ data: Array.from({ length: 205 }, (_, i) => ({
      centerId, childId: kid, service: 'speech', title: `Plan ${i}`, createdById: therapist.body.user.id,
      createdAt: new Date(base + i * 1000),
    })) });
    await h.prisma.planVersion.createMany({ data: created.map(p => ({ centerId, planId: p.id, number: 1,
      authorId: therapist.body.user.id, createdAt: h.clock.now(), updatedAt: h.clock.now(),
    })) });
    const first = (await get(therapist, c(`clinical/children/${kid}`)).expect(200)).body;
    expect(first.plans).toHaveLength(200);
    expect(first.hasMorePlans).toBe(true);
    expect(first.plans[0].title).toBe('Plan 204');
    expect(first.plans.some((p: { title: string }) => p.title === 'Plan 0')).toBe(false);
    const next = (await get(therapist, c(`clinical/children/${kid}?planOffset=200`)).expect(200)).body;
    expect(next.plans).toHaveLength(5);
    expect(next.hasMorePlans).toBe(false);
    expect(next.plans.some((p: { title: string }) => p.title === 'Plan 0')).toBe(true);
    expect(new Set([...first.plans, ...next.plans].map((p: { id: string }) => p.id)).size).toBe(205);
    await get(therapist, c(`clinical/children/${kid}?planOffset=-1`)).expect(400);
  });

  it('M2-H04 Codex P2: activity pagination and search reach beyond 200; therapist templates are service-filtered before cap', async () => {
    const { therapist, kid } = await setup();
    await h.prisma.activityTemplate.createMany({ data: [
      ...Array.from({ length: 205 }, (_, i) => ({ centerId, service: 'occupational',
        title: `Occupational sample ${String(i).padStart(3, '0')}`, ageBand: '5-8', minutes: 10,
        materials: ['cards'], steps: ['Synthetic steps'], safety: ['Adult supports'], createdAt: h.clock.now() })),
      ...Array.from({ length: 5 }, (_, i) => ({ centerId, service: 'speech',
        title: `Speech needle ${i}`, ageBand: '5-8', minutes: 8,
        materials: ['cards'], steps: ['Synthetic steps'], safety: ['Adult supports'], createdAt: h.clock.now() })),
    ] });
    const first = (await get(therapist, c('activities?limit=100')).expect(200)).body;
    expect(first.items).toHaveLength(100);
    expect(first.hasMore).toBe(true);
    expect(first.nextOffset).toBe(100);
    const last = (await get(therapist, c('activities?limit=100&offset=200')).expect(200)).body;
    expect(last.items).toHaveLength(10);
    expect(last.hasMore).toBe(false);
    expect(last.items.some((t: { title: string }) => t.title === 'Speech needle 4')).toBe(true);
    const searched = (await get(therapist, c('activities?search=Speech%20needle%204')).expect(200)).body;
    expect(searched.items.map((t: { title: string }) => t.title)).toEqual(['Speech needle 4']);
    const language = (await get(therapist, c('activities?search=LANGUAGE&service=speech')).expect(200)).body;
    expect(language.items).toHaveLength(5);
    const scoped = (await get(therapist, c(`clinical/children/${kid}`)).expect(200)).body;
    expect(scoped.templates).toHaveLength(5);
    expect(scoped.templates.every((t: { service: string }) => t.service === 'speech')).toBe(true);
    await get(therapist, c('activities?limit=201')).expect(400);
    await get(therapist, c('activities?offset=-1')).expect(400);
  });

  it('M2-H04 Codex P2: older/backdated assessments are reachable in stable authorized pages', async () => {
    const { therapist, kid } = await setup();
    const base = Date.parse('2026-01-01T00:00:00Z');
    await h.prisma.assessment.createMany({ data: Array.from({ length: 205 }, (_, i) => ({
      centerId, childId: kid, membershipId: therapist.body.activeContext.membershipId,
      service: 'speech', assessedOn: new Date(base + i * DAY), summary: `Historical assessment ${i}`,
      areas: [], createdAt: h.clock.now(), updatedAt: h.clock.now(),
    })) });
    const backdated = (await post(h, c(`clinical/children/${kid}/assessments`), therapist,
      { service: 'speech', assessedOn: '2025-10-01', summary: 'Late-entered older assessment', areas: [] }).expect(201)).body.id;
    const first = (await get(therapist, c(`clinical/children/${kid}`)).expect(200)).body;
    expect(first.assessments).toHaveLength(200);
    expect(first.hasMoreAssessments).toBe(true);
    expect(first.assessments.some((a: { id: string }) => a.id === backdated)).toBe(false);
    const older = (await get(therapist, c(`clinical/children/${kid}?assessmentOffset=200`)).expect(200)).body;
    expect(older.assessments).toHaveLength(6);
    expect(older.hasMoreAssessments).toBe(false);
    expect(older.assessments.some((a: { id: string }) => a.id === backdated)).toBe(true);
    expect(new Set([...first.assessments, ...older.assessments].map((a: { id: string }) => a.id)).size).toBe(206);
    await get(therapist, c(`clinical/children/${kid}?assessmentOffset=-1`)).expect(400);
  });


  it('hides a same-center different-child assessment ID just like an unknown ID', async () => {
    const { therapist, other } = await setup();
    // Direct synthetic fixture avoids the centre's single-child onboarding
    // capacity limit; this test exercises authorization, not provisioning.
    const childB = (await h.prisma.child.create({ data: {
      centerId, firstName: 'Other', lastName: 'Child',
      dateOfBirth: new Date('2020-01-02'), services: ['speech'],
      createdById: admin.body.user.id, createdAt: h.clock.now(),
    } })).id;
    await post(h, c(`children/${childB}/assignments`), admin,
      { membershipId: other.body.activeContext.membershipId, service: 'speech' }).expect(201);
    const assessment = (await post(h, c(`clinical/children/${childB}/assessments`), other,
      { service: 'speech', assessedOn: '2026-10-18', summary: 'Restricted speech assessment', areas: [] }).expect(201)).body;
    const body = { service: 'speech', assessedOn: '2026-10-18',
      summary: 'Attempted overwrite of another child', areas: [], version: 1 };
    const wrongChild = await patch(therapist, c(`clinical/assessments/${assessment.id}`), body).expect(404);
    const unknown = await patch(therapist, c('clinical/assessments/00000000-0000-0000-0000-000000000000'), body).expect(404);
    expect(wrongChild.body).toEqual(unknown.body);
    expect((await h.prisma.assessment.findUniqueOrThrow({ where: { id: assessment.id } })).summary).toBe('Restricted speech assessment');
    expect(await h.prisma.centerEvent.count({ where: { centerId, type: 'clinical.assessment_updated' } })).toBe(0);
    const foreignPlan = (await post(h, c(`clinical/children/${childB}/plans`), other,
      { service: 'speech', title: 'Restricted child plan' }).expect(201)).body;
    const goal = { key: 'dup', title: 'A synthetic goal', measure: 'count', baseline: 0, target: 1 };
    const invalid = { summary: 'Do not reveal validation for a hidden plan', goals: [goal, goal], homeActivities: [], version: 1 };
    const wrongPlan = await patch(therapist, c(`clinical/plan-versions/${foreignPlan.versionId}`), invalid).expect(404);
    const unknownPlan = await patch(therapist, c('clinical/plan-versions/00000000-0000-0000-0000-000000000000'), invalid).expect(404);
    expect(wrongPlan.body).toEqual(unknownPlan.body);
    expect(await h.prisma.centerEvent.count({ where: { centerId, type: 'clinical.plan_draft_saved' } })).toBe(0);
  });

  it('M2-H05 Codex P2: a measured legacy goal with whitespace title can round-trip without redefinition', async () => {
    const { therapist, kid } = await setup();
    const versionId = (await post(h, c(`clinical/children/${kid}/plans`), therapist, {
      service: 'speech', title: 'Legacy draft goal compatibility',
    }).expect(201)).body.versionId as string;
    const goal = { key: 'legacy', title: 'Names familiar objects', measure: 'count', baseline: 0, target: 8 };
    const planPath = c(`clinical/plan-versions/${versionId}`);
    await patch(therapist, planPath, {
      summary: 'Original synthetic draft', goals: [goal], homeActivities: [], version: 1,
    }).expect(200);
    await post(h, c(`clinical/children/${kid}/observations`), therapist, {
      planVersionId: versionId, goalKey: 'legacy', value: 2, observedOn: '2026-10-18',
    }).expect(201);
    // Imported drafts persisted before M2-H05 could have leading/trailing
    // whitespace. The new pipe trims client input, but immutable stored
    // definitions cannot be silently rewritten.
    await h.prisma.planVersion.update({ where: { id: versionId }, data: {
      goals: [{ ...goal, title: '  Names familiar objects  ' }],
    } });
    await patch(therapist, planPath, {
      summary: 'Summary-only revision after import', goals: [goal], homeActivities: [], version: 2,
    }).expect(200);
    const saved = await h.prisma.planVersion.findUniqueOrThrow({ where: { id: versionId } });
    expect((saved.goals as Array<{ title: string }>)[0].title).toBe('  Names familiar objects  ');
    expect(saved.summary).toBe('Summary-only revision after import');
    await patch(therapist, planPath, {
      summary: 'Must not redefine measured goal',
      goals: [{ ...goal, title: 'Renamed goal should fail' }], homeActivities: [], version: 3,
    }).expect(409);
  });

  it('records non-authorizing therapist goal checkpoints with exact saved observation sources', async () => {
    const { therapist, other, sup, kid, rosa } = await setup();
    const created = (await post(h, c(`clinical/children/${kid}/plans`), therapist, {
      service: 'speech', title: 'Synthetic dated goal review'
    }).expect(201)).body;
    const verId = created.versionId;
    await patch(therapist, c('clinical/plan-versions/' + verId), {
      summary: 'Synthetic goal plan only', goals: [
        { key: 'check', title: 'Names familiar pictures', measure: 'count', baseline: 1, target: 8 },
        { key: 'other', title: 'Uses complete phrases', measure: 'count', baseline: 2, target: 10 },
        { key: 'review-only', title: 'Plans a practice routine', measure: 'count', baseline: 0, target: 5 },
      ], homeActivities: [], version: 1,
    }).expect(200);
    const observe = async (goalKey: string) => (await post(h,
      c(`clinical/children/${kid}/observations`), therapist, {
        planVersionId: verId, goalKey, value: 3, observedOn: '2026-10-18',
      }).expect(201)).body.id as string;
    const exactSource = await observe('check');
    const unrelatedSource = await observe('other');
    const path = c(`clinical/plan-versions/${verId}/goal-checkpoints`);
    const body = { goalKey: 'check', reviewedOn: '2026-10-18',
      summary: 'Examined one recorded source; more observation visits may be needed.',
      observationIds: [exactSource], version: 2 };
    await post(h, path, other, body).expect(404);
    await post(h, path, sup, body).expect(403);
    await post(h, path, admin, body).expect(403);
    await post(h, path, rosa, body).expect(403);
    await post(h, path, therapist, { ...body, goalKey: 'not-in-plan' }).expect(422);
    await post(h, path, therapist, { ...body, observationIds: [unrelatedSource] }).expect(422);
    await post(h, path, therapist, { ...body, observationIds: [exactSource, exactSource] }).expect(422);
    await post(h, path, therapist, { ...body, reviewedOn: '2026-02-30' }).expect(400);
    await post(h, path, therapist, { ...body, reviewedOn: '2026-11-02' }).expect(422);
    await post(h, path, therapist, { ...body, summary: 'short' }).expect(400);
    const receipt = (await post(h, path, therapist, body).expect(200)).body;
    expect(receipt).toMatchObject({
      persisted: true, version: 3, released: false, clinicalAuthorization: false,
    });
    await post(h, path, therapist, body).expect(409); // CAS: no double append
    const saved = await h.prisma.planVersion.findUniqueOrThrow({ where: { id: verId } });
    const checkpoints = (saved.reviewNotes as any[]).filter(n => n.kind === 'GOAL_CHECKPOINT');
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0]).toMatchObject({
      goalKey: 'check', reviewedOn: '2026-10-18',
      observationIds: [exactSource], summary: body.summary,
      clinicalAuthorization: false, released: false,
    });
    expect(saved.goals).toHaveLength(3);
    expect(await h.prisma.observation.count({ where: { planVersionId: verId } })).toBe(2);
    const read = (await get(sup, c('clinical/children/' + kid)).expect(200)).body;
    expect(read.plans[0].versions[0].goalCheckpoints).toEqual([
      expect.objectContaining({ goalKey: 'check', observationIds: [exactSource] }),
    ]);
    expect(read.plans[0].versions[0].reviewNotes).toEqual([]);
    await get(rosa, c('clinical/children/' + kid)).expect(403);
    // Ordinary centre/admin event timelines must not expose even goal keys,
    // review dates or source counts from the protected clinical review ledger.
    expect(await h.prisma.centerEvent.count({
      where: { centerId, type: 'clinical.goal_checkpoint_recorded' },
    })).toBe(0);
    // It is already Oct 20 at the Berlin centre, although still Oct 19 UTC:
    // a therapist may record the centre-local day, not UTC midnight's day.
    h.clock.t = Date.parse('2026-10-19T22:30:00Z');
    // The synthetic test jumps past the original login session expiry.
    // Refresh authentication so date validation, not 401, is exercised.
    const midnightTherapist = await signIn(h, 'thera@clin.test');
    await post(h, path, midnightTherapist, { ...body,
      goalKey: 'review-only', reviewedOn: '2026-10-21',
      observationIds: [], version: 3 }).expect(422);
    await post(h, path, midnightTherapist, { ...body,
      goalKey: 'review-only', reviewedOn: '2026-10-20',
      summary: 'Reviewed the unsampled objective definition; no observations yet.',
      observationIds: [], version: 3 }).expect(200);
    // Narrative-only checkpoints must also freeze their exact goal definition.
    await patch(midnightTherapist, c('clinical/plan-versions/' + verId), {
      summary: 'Synthetic goal plan only', version: 4, homeActivities: [],
      goals: [
        { key: 'check', title: 'Names familiar pictures', measure: 'count', baseline: 1, target: 8 },
        { key: 'other', title: 'Uses complete phrases', measure: 'count', baseline: 2, target: 10 },
      ],
    }).expect(409);
    // Specialty revocation without care-assignment removal is still a denial.
    await h.prisma.membership.update({
      where: { id: therapist.body.activeContext.membershipId },
      data: { specialties: [] },
    });
    await post(h, path, midnightTherapist, { ...body, version: 4 }).expect(404);

  });

  it('Child360 includes authorized upcoming visits beyond tomorrow within its explicit 42-day window', async () => {
    const { therapist, other, sup, kid } = await setup();
    const membershipId = therapist.body.activeContext.membershipId;
    const creatorId = (await h.prisma.membership.findUniqueOrThrow({
      where: { id: admin.body.activeContext.membershipId }, select: { userId: true },
    })).userId;
    const now = h.clock.now();
    const createVisit = async (days: number) => h.prisma.appointment.create({
      data: {
        centerId, childId: kid, membershipId, service: 'speech',
        startsAt: new Date(now.getTime() + days * DAY),
        endsAt: new Date(now.getTime() + days * DAY + 45 * 60_000),
        createdById: creatorId, createdAt: now, status: 'SCHEDULED',
      },
    });
    const upcomingWeek = await createVisit(7);
    const upcomingSixWeeks = await createVisit(41);
    const outsideHorizon = await createVisit(44);
    const ws = (await get(therapist, c('clinical/children/' + kid)).expect(200)).body;
    const ids = ws.appointments.map((v: { id: string }) => v.id);
    expect(ids).toEqual(expect.arrayContaining([upcomingWeek.id, upcomingSixWeeks.id]));
    expect(ids).not.toContain(outsideHorizon.id);
    await get(other, c('clinical/children/' + kid)).expect(404);
    const supervisor = (await get(sup, c('clinical/children/' + kid)).expect(200)).body;
    expect(supervisor.appointments.map((v: { id: string }) => v.id)).toEqual(
      expect.arrayContaining([upcomingWeek.id, upcomingSixWeeks.id]));
  });

  it('does not expose an occupational referent to a speech-only clinician', async () => {
    const { therapist, sup, kid } = await setup(['speech', 'occupational']);
    const ot = await staff('ot-referent@clin.test', ['THERAPIST'], ['occupational']);
    const otMembership = ot.body.activeContext.membershipId;
    await post(h, c('children/' + kid + '/assignments'), admin, {
      membershipId: otMembership, service: 'occupational', isLead: true,
    }).expect(201);
    const detail = (await get(admin, c('children/' + kid)).expect(200)).body;
    await patch(admin, c('children/' + kid + '/referent'), {
      membershipId: otMembership, version: detail.version,
      reason: 'Explicit occupational coordination referent',
    }).expect(200);
    const speech = (await get(therapist, c('clinical/children/' + kid)).expect(200)).body;
    expect(speech.childWideReferent).toBeNull();
    expect(speech.childWideReferentStatus).toBe('UNAVAILABLE');
    expect(JSON.stringify(speech)).not.toContain('Staff ot-referent');
    const occupational = (await get(ot, c('clinical/children/' + kid)).expect(200)).body;
    expect(occupational.childWideReferent).toMatchObject({
      displayName: 'Staff ot-referent',
    });
    expect(occupational.childWideReferentStatus).toBe('VISIBLE');
    const supervisor = (await get(sup, c('clinical/children/' + kid)).expect(200)).body;
    expect(supervisor.childWideReferent).toMatchObject({
      displayName: 'Staff ot-referent',
    });
    await h.prisma.membership.update({ where: { id: otMembership }, data: { specialties: [] } });
    const invalid = (await get(sup, c('clinical/children/' + kid)).expect(200)).body;
    expect(invalid.childWideReferent).toBeNull();
    expect(invalid.childWideReferentStatus).toBe('UNAVAILABLE');
  });

  it('retains optional short/long-term goal dates and scoped weekly/monthly home schedules in saved plan versions', async () => {
    const { therapist, other, sup, kid, rosa } = await setup();
    const template = await h.prisma.activityTemplate.create({
      data: {
        centerId, service: 'speech', title: 'Synthetic home picture practice', ageBand: '6-8',
        minutes: 10, materials: ['cards'], steps: ['Practice'], safety: ['Adult supports'],
        createdAt: h.clock.now(),
      },
    });
    const plan = (await post(h, c(`clinical/children/${kid}/plans`), therapist,
      { service: 'speech', title: 'Dated objectives and home schedule' }).expect(201)).body;
    const url = c(`clinical/plan-versions/${plan.versionId}`);
    const goal = {
      key: 'naming', title: 'Names familiar pictures', measure: 'count',
      baseline: 1, target: 8, horizon: 'SHORT_TERM',
      targetOn: '2027-03-15', reviewOn: '2026-12-15',
    };
    const activity = {
      templateId: template.id, goalKey: 'naming', frequency: 'Weekly calendar draft',
      schedule: { cadence: 'WEEKLY', startsOn: '2026-10-19', endsOn: '2026-12-16', weekdays: [1, 3] },
    };
    const update = { summary: 'Synthetic, unapproved draft with dated objectives', goals: [goal], homeActivities: [activity], version: 1 };
    await patch(therapist, url, { ...update, goals: [{ ...goal, measure: 'percent', target: 101 }] }).expect(400);
    await patch(therapist, url, { ...update, goals: [{ ...goal, measure: 'percent', baseline: -1 }] }).expect(400);
    await patch(therapist, url, { ...update, goals: [{ ...goal, targetOn: '2027-02-30' }] }).expect(400);
    await patch(therapist, url, { ...update, goals: [{ ...goal, reviewOn: '2027-02-29' }] }).expect(400);
    await patch(therapist, url, { ...update, goals: [{ ...goal, horizon: 'VERY_LONG' }] }).expect(400);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity,
      schedule: { ...activity.schedule, weekdays: [1, 1] } }] }).expect(422);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity,
      schedule: { ...activity.schedule, weekdays: [] } }] }).expect(400);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity,
      schedule: { ...activity.schedule, monthDay: 10 } }] }).expect(422);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity,
      schedule: { ...activity.schedule, endsOn: '2025-12-01' } }] }).expect(422);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity,
      schedule: { ...activity.schedule, endsOn: '2028-12-01' } }] }).expect(422);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity,
      schedule: { cadence: 'MONTHLY', startsOn: '2026-10-01', endsOn: '2027-03-31', weekdays: [1] } }] }).expect(422);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity,
      schedule: { cadence: 'MONTHLY', startsOn: '2027-02-01', endsOn: '2027-02-28', monthDay: 31 } }] }).expect(422);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity,
      schedule: { cadence: 'WEEKLY', startsOn: '2026-10-19', endsOn: '2026-10-19', weekdays: [2] } }] }).expect(422);

    // TB-EM-047: validate optional per-plan duration at the HTTP boundary.
    // Explicit null must be rejected, not saved as a hidden/invalid override.
    for (const badDuration of [null, 0, 121, 10.5, -1]) {
      await patch(therapist, url, { ...update, homeActivities: [{ ...activity, durationMinutes: badDuration }] }).expect(400);
    }
    expect((await h.prisma.planVersion.findUniqueOrThrow({ where: { id: plan.versionId } })).version).toBe(1);
    await patch(other, url, update).expect(404);
    await patch(sup, url, update).expect(403);
    await patch(therapist, url, { ...update, homeActivities: [{ ...activity, durationMinutes: 7 }] }).expect(200);
    const current = await h.prisma.planVersion.findUniqueOrThrow({ where: { id: plan.versionId } });
    expect(current.version).toBe(2);
    expect(current.goals).toEqual([goal]);
    expect(current.homeActivities).toEqual([expect.objectContaining({
      templateId: template.id, goalKey: 'naming', schedule: activity.schedule, durationMinutes: 7,
      snapshot: expect.objectContaining({ title: 'Synthetic home picture practice', minutes: 10, safety: ['Adult supports'] }),
    })]);
    const viewed = (await get(sup, c(`clinical/children/${kid}`)).expect(200)).body;
    expect(viewed.plans[0].versions[0].goals).toEqual([goal]);
    expect(viewed.plans[0].versions[0].homeActivities[0].schedule).toEqual(activity.schedule);
    expect(viewed.plans[0].versions[0].homeActivities[0].durationMinutes).toBe(7);
    await get(rosa, c(`clinical/children/${kid}`)).expect(403);
    expect(JSON.stringify((await get(rosa, c('family/activities')).expect(200)).body))
      .not.toContain('Synthetic home picture practice');

    const longTerm = { ...goal, horizon: 'LONG_TERM', targetOn: '2028-02-29' };
    const monthly = {
      ...activity, frequency: 'Monthly calendar draft',
      schedule: { cadence: 'MONTHLY', startsOn: '2026-10-01', endsOn: '2027-03-31', monthDay: 31 },
    };
    await patch(therapist, url, { summary: update.summary, goals: [longTerm], homeActivities: [monthly], version: 2 }).expect(200);
    const updated = await h.prisma.planVersion.findUniqueOrThrow({ where: { id: plan.versionId } });
    expect(updated.goals).toEqual([longTerm]);
    expect(updated.homeActivities).toEqual([expect.objectContaining({ schedule: monthly.schedule })]);
    const cleared = (updated.homeActivities as unknown as Array<{ durationMinutes?: number; snapshot: { minutes: number } }>)[0];
    expect(cleared.durationMinutes).toBeUndefined();
    expect(cleared.snapshot.minutes).toBe(10);
    expect(await h.prisma.observation.count({ where: { planVersionId: plan.versionId } })).toBe(0);
  });

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
    await post(h, c('activities'), therapist, { ...data, title: '    ' }).expect(400);
    await post(h, c('activities'), admin, data).expect(403);
    const originalId = (await post(h, c('activities'), therapist, data).expect(201)).body.id;
    const original = await h.prisma.activityTemplate.findUniqueOrThrow({ where: { id: originalId } });
    expect(original).toMatchObject({ title: data.title, service: 'speech', version: 1, centerId });

    // A different therapist can copy but cannot overwrite the original author.
    await post(h, c(`activities/${originalId}/duplicate`), other, { title: '    ' }).expect(400);
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
    await patch(therapist, c(`activities/${originalId}`), { ...update, title: '    ' }).expect(400);
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

    // Referencing a foreign tenant's activity ID must not expose or duplicate it.
    const foreignCenterId = (await post(h, '/api/platform/centers', ops, {
      name: 'Separate Library Center', timezone: 'UTC', country: 'France', city: 'Lyon',
      specialties: ['speech'], firstAdmin: {
        email: 'library-other-center@clin.test', displayName: 'Other Centre Admin',
      },
    }).expect(201)).body.id;
    const foreign = await h.prisma.activityTemplate.create({
      data: { centerId: foreignCenterId, ...data, createdAt: h.clock.now() },
    });
    await post(h, c(`activities/${foreign.id}/duplicate`), therapist, {
      title: 'Attempted cross-centre copy',
    }).expect(404);
    await patch(therapist, c(`activities/${foreign.id}`), update).expect(404);

    // A revoked specialty immediately disables local copy and edit actions.
    await h.prisma.membership.update({
      where: { id: other.body.activeContext.membershipId }, data: { specialties: [] },
    });
    await post(h, c(`activities/${originalId}/duplicate`), other, {
      title: 'Revoked copy',
    }).expect(403);
    await patch(other, c(`activities/${copy.id}`), {
      ...update, title: 'Revoked edit',
    }).expect(403);
    expect(await h.prisma.activityTemplate.findUniqueOrThrow({ where: { id: copy.id } }))
      .toMatchObject({ title: 'Personalized speech copy', version: 1 });
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

  it.each(['local', 'preview', 'development', 'staging', 'production'])('denies all existing synthetic message routes in %s with demo flag enabled', async (environment) => {
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
        expect(response.body.message).toMatch(/synthetic demonstration|role does not include/);
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

  it('revokes guardian access to pre-existing message history without touching archived content', async () => {
    const { therapist, kid, link, rosa } = await setup();
    const threadId = (await post(h, c('threads'), therapist, {
      childId: kid, guardianLinkId: link, category: 'scheduling',
      subject: 'Historical synthetic coordination', body: 'Original non-clinical message',
    }).expect(201)).body.id;
    expect((await get(rosa, c('threads')).expect(200)).body.items.map((t: { id: string }) => t.id)).toContain(threadId);
    const before = await h.prisma.message.count({ where: { threadId } });
    await post(h, c(`children/${kid}/guardians/${link}/remove`), admin, { reason: 'Synthetic custody boundary test' }).expect(200);
    expect((await get(rosa, c('threads')).expect(200)).body.items).toHaveLength(0);
    await get(rosa, c(`threads/${threadId}`)).expect(404);
    await post(h, c(`threads/${threadId}/messages`), rosa, { body: 'Revoked access attempt' }).expect(404);
    expect(await h.prisma.message.count({ where: { threadId } })).toBe(before);
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
    expect((await post(h, c(`threads/${t}/messages`), rosa, { body: 'hi' }).expect(403)).body.message).toMatch(/synthetic demonstration|role does not include/);
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
