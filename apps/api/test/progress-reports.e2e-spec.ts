import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { Harness, ORIGIN, PASSWORD, Signed, cookieFrom, createUser, makeApp, post, preAuth, resetDb, signIn } from './helpers';

describe('TB-EM-009 progress tracking, report drafting and family progress demo (real PostgreSQL)', () => {
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
    centerId = (await post(h, '/api/platform/centers', ops, { name: 'Prog Center', timezone: 'Europe/Berlin', country: 'Germany', city: 'Berlin', specialties: ['speech'], firstAdmin: { email: 'lead@prog.test', displayName: 'Lead Admin' } }).expect(201)).body.id;
    admin = await accept('lead@prog.test', 'Lead Admin');
  });

  it('M2-H04 Codex P2: older unfinished reports remain retrievable past the bounded first page', async () => {
    const therapist = await staff('report-page@prog.test', ['THERAPIST']);
    const kid = (await post(h, c('children'), admin, { firstName: 'Report', lastName: 'History',
      dateOfBirth: '2019-04-02', services: ['speech'] }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin,
      { membershipId: therapist.body.activeContext.membershipId, service: 'speech', isLead: true }).expect(201);
    const base = Date.parse('2026-09-01T00:00:00Z');
    await h.prisma.progressReport.createMany({ data: Array.from({ length: 205 }, (_, i) => ({
      centerId, childId: kid, membershipId: therapist.body.activeContext.membershipId,
      service: 'speech', title: `Older draft ${i}`, periodStart: new Date('2026-08-01T00:00:00Z'),
      periodEnd: new Date('2026-08-31T00:00:00Z'), status: 'DRAFT',
      createdAt: new Date(base + i * 1000), updatedAt: new Date(base + i * 1000),
    })) });
    const endpoint = c(`clinical/children/${kid}/reports`);
    const first = (await get(therapist, endpoint).expect(200)).body;
    expect(first.items).toHaveLength(200);
    expect(first.hasMore).toBe(true);
    expect(first.items[0].title).toBe('Older draft 204');
    const later = (await get(therapist, endpoint + '?offset=200').expect(200)).body;
    expect(later.items).toHaveLength(5);
    expect(later.hasMore).toBe(false);
    expect(later.items.some((r: { title: string }) => r.title === 'Older draft 0')).toBe(true);
    expect(new Set([...first.items, ...later.items].map((r: { id: string }) => r.id)).size).toBe(205);
    await get(therapist, endpoint + '?offset=-1').expect(400);
  });

  it('charts, dashboards and report drafts use only recorded observations; review, history, conflicts and release lock', async () => {
    const therapist = await staff('thera@prog.test', ['THERAPIST']);
    const other = await staff('other@prog.test', ['THERAPIST']);
    const sup = await staff('sup@prog.test', ['CLINICAL_SUPERVISOR'], []);
    const coord = await staff('coord@prog.test', ['COORDINATOR'], []);
    const kid = (await post(h, c('children'), admin, { firstName: 'Ivo', lastName: 'Lane', dateOfBirth: '2019-04-02', services: ['speech'] }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: therapist.body.activeContext.membershipId, service: 'speech', isLead: true }).expect(201);
    await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Ada Lane', email: 'ada@family.test', relationship: 'mother', invite: true }).expect(201);
    const ada = await accept('ada@family.test', 'Ada Lane');
    const W = c(`clinical/children/${kid}`);
    await post(h, `${W}/assessments`, therapist, { service: 'speech', assessedOn: '2026-08-20', summary: 'Synthetic baseline: single words.', areas: [] }).expect(201);
    const plan = (await post(h, `${W}/plans`, therapist, { service: 'speech', title: 'Speech plan' }).expect(201)).body;
    const goals = [
      { key: 'two-word', title: 'Uses two-word phrases', measure: 'percent', baseline: 20, target: 80 },
      { key: 'turns', title: 'Takes turns', measure: 'count', baseline: 1, target: 5 },
      { key: 'names', title: 'Names objects', measure: 'count', baseline: 3, target: 15 },
    ];
    await patch(therapist, c(`clinical/plan-versions/${plan.versionId}`), { summary: 'v1', goals, homeActivities: [], version: 1 }).expect(200);
    for (const [goalKey, value, observedOn] of [['two-word', 25, '2026-08-25'], ['two-word', 30, '2026-09-05'], ['two-word', 45, '2026-09-26'], ['two-word', 40, '2026-10-10'], ['turns', 2, '2026-10-01']] as const)
      await post(h, `${W}/observations`, therapist, { planVersionId: plan.versionId, goalKey, value, observedOn }).expect(201);

    const D = c('clinical/progress?from=2026-09-01&to=2026-10-19');
    for (const s of [admin, ada]) await get(s, D).expect(403);
    expect((await get(other, D).expect(200)).body.goals).toEqual([]);
    const dash = (await get(therapist, D).expect(200)).body;
    expect(dash.summary).toEqual({ goals: 3, recorded: 1, insufficient: 1, none: 1 });
    const g = dash.goals.find((x: { key: string }) => x.key === 'two-word');
    expect(g).toMatchObject({ status: 'recorded', baseline: 20, target: 80, prior: { date: '2026-08-25', value: 25 }, points: [{ date: '2026-09-05', value: 30 }, { date: '2026-09-26', value: 45 }, { date: '2026-10-10', value: 40 }] });
    expect(g.planVersionId).toBe(plan.versionId);
    expect(g.points.every((p: { observationId?: string }) => /^[a-f0-9-]{36}$/.test(p.observationId ?? ''))).toBe(true);
    expect(/^[a-f0-9-]{36}$/.test(g.prior?.observationId ?? '')).toBe(true);
    expect(new Set(g.points.map((p: { observationId: string }) => p.observationId)).size).toBe(3);
    expect((await get(sup, `${D}&goalKey=turns&childId=${kid}`).expect(200)).body.goals.map((x: { key: string; status: string }) => [x.key, x.status])).toEqual([['turns', 'insufficient']]);
    await get(therapist, c('clinical/progress?from=2026-10-19&to=2026-09-01')).expect(422);

    const R = `${W}/reports`;
    await post(h, R, therapist, { service: 'speech', title: 'Autumn report', periodStart: '2026-09-01', periodEnd: '2026-10-25' }).expect(422);
    await post(h, R, other, { service: 'speech', title: 'Nope', periodStart: '2026-09-01', periodEnd: '2026-10-19' }).expect(404);
    await post(h, R, sup, { service: 'speech', title: 'Nope', periodStart: '2026-09-01', periodEnd: '2026-10-19' }).expect(403);
    const id = (await post(h, R, therapist, { service: 'speech', title: 'Autumn report', periodStart: '2026-09-01', periodEnd: '2026-10-19' }).expect(201)).body.id;
    const P = c(`clinical/reports/${id}`);
    const queue = c('clinical/reports/review-queue');
    // DeepSeek F1/P2: authorized review queue must exclude unpublished DRAFT.
    expect((await get(sup, queue).expect(200)).body).toMatchObject({ total: 0, items: [] });
    let d = (await get(therapist, P).expect(200)).body;
    expect(d).toMatchObject({ canEdit: true, canReview: false, released: false, report: { status: 'DRAFT', version: 1 } });
    const reportGoal = d.evidence.goals.find((x: { key: string }) => x.key === 'two-word');
    expect(reportGoal.planVersionId).toBe(plan.versionId);
    expect(reportGoal.points.every((p: { observationId?: string }) => /^[a-f0-9-]{36}$/.test(p.observationId ?? ''))).toBe(true);
    expect(d.report.sections.summary).toBe('');
    expect(d.report.sections.assessment).toContain('Synthetic baseline: single words.');
    expect(d.report.sections.goals).toContain('3 observations recorded between 2026-09-05 and 2026-10-10. First recorded value 30; most recent 40.');
    expect(d.report.sections.goals).toContain('Not enough recorded data to describe change.');
    expect(d.report.sections.goals).toContain('No observations recorded in this period.');
    expect(JSON.stringify(d.report.sections)).not.toMatch(/improv|progress(ed|ing)|achiev|attain|home activit/i);
    expect((await get(therapist, R).expect(200)).body.items).toHaveLength(1);
    await get(other, P).expect(404);
    await get(ada, P).expect(403);

    // Milestone 1: saved report snapshot -> fresh, clinician-controlled draft.
    // Source is an immutable CREATED report version, not mutable live values.
    const source = await h.prisma.reportVersion.findFirstOrThrow({
      where: { centerId, reportId: id, kind: 'CREATED' },
    });
    const handoffPath = P + '/plan-drafts';
    const body = {
      sourceReportVersionId: source.id,
      requestId: '2c931786-ccfa-4e19-82e6-11a111a1f040',
      reportRevision: 1, title: 'Home-plan candidate from recorded report',
      selectedGoals: [{ planVersionId: plan.versionId, goalKey: 'two-word' }],
    };
    for (const unauthorized of [admin, ada, sup])
      await post(h, handoffPath, unauthorized, body).expect(403);
    await post(h, handoffPath, other, body).expect(404);
    // Transform at the API boundary, not just the clinician UI: trimmed
    // whitespace-only and one-letter titles must fail before persistence.
    await post(h, handoffPath, therapist, { ...body, title: '   ' }).expect(400);
    await post(h, handoffPath, therapist, { ...body, title: 'a  ' }).expect(400);
    await post(h, handoffPath, therapist, { ...body, selectedGoals: [] }).expect(400);
    await post(h, handoffPath, therapist, { ...body, sourceReportVersionId: plan.versionId }).expect(404);
    await post(h, handoffPath, therapist, { ...body, selectedGoals: [{ planVersionId: plan.versionId, goalKey: 'unknown' }] }).expect(422);
    await post(h, handoffPath, therapist, { ...body, selectedGoals: [body.selectedGoals[0], body.selectedGoals[0]] }).expect(422);
    await post(h, handoffPath, therapist, { ...body, reportRevision: 123 }).expect(409);
    const parallel = await Promise.all([
      post(h, handoffPath, therapist, body).expect(201),
      post(h, handoffPath, therapist, body).expect(201),
    ]);
    expect(parallel.map(x => x.body.reused).sort()).toEqual([false, true]);
    const created = parallel.find(x => !x.body.reused)!.body;
    expect(created).toMatchObject({ id: body.requestId, reused: false, released: false });
    const savedPlan = await h.prisma.therapyPlan.findUniqueOrThrow({ where: { id: created.id }, include: { versions: true } });
    expect(savedPlan).toMatchObject({ centerId, childId: kid, service: 'speech', title: body.title });
    expect(savedPlan.versions).toHaveLength(1);
    expect(savedPlan.versions[0].status).toBe('DRAFT');
    expect(savedPlan.versions[0].homeActivities).toEqual([]);
    expect(savedPlan.versions[0].goals).toEqual([
      { key: 'g1', title: 'Uses two-word phrases', measure: 'percent', baseline: 20, target: 80 },
    ]);
    expect(await h.prisma.observation.count({ where: { planVersionId: created.versionId } })).toBe(0);
    const audit = await h.prisma.centerEvent.findMany({ where: { centerId, type: 'clinical.report_plan_drafted' } });
    expect(audit).toHaveLength(1);
    expect(audit[0].meta).toMatchObject({
      childId: kid, reportId: id, reportVersionId: source.id, planId: created.id,
      selectedGoalRefs: [plan.versionId + ':two-word'], draftOnly: true, released: false,
    });
    // Corrupted source audit metadata is NOT trusted as a UUID. It must not
    // crash the child workspace or become invented provenance.
    await h.prisma.centerEvent.create({
      data: { centerId, type: 'clinical.report_plan_drafted', createdAt: h.clock.now(),
        meta: { planId: plan.id, planVersionId: plan.versionId,
          reportId: 'not-a-uuid', reportVersionId: 'also-not-a-uuid',
          selectedGoalRefs: [plan.versionId + ':two-word'],
          draftOnly: true, released: false } },
    });
    const validAfterBadEvent = (await get(therapist, W).expect(200)).body;
    expect(validAfterBadEvent.plans.find((p: { id: string }) => p.id === plan.id).source).toBeNull();

    // TB-EM-032: source provenance is visible only through the authorized
    // child/plan projection; observations remain bound to the ORIGINAL
    // plan-version IDs, never copied into the new report-derived plan.
    const therapistWorkspace = (await get(therapist, W).expect(200)).body;
    const sourcePlan = therapistWorkspace.plans.find((x: { id: string }) => x.id === created.id);
    expect(sourcePlan).toMatchObject({
      id: created.id, service: 'speech',
      source: {
        reportId: id, reportTitle: 'Autumn report', reportVersionId: source.id,
        reportVersionNumber: source.number, originalPlanVersionId: created.versionId,
        selectedGoals: [{
          planGoalKey: 'g1', sourcePlanVersionId: plan.versionId, sourceGoalKey: 'two-word',
        }], draftOnly: true, released: false,
      },
    });
    expect(therapistWorkspace.plans.find((x: { id: string }) => x.id === plan.id).source).toBeNull();
    expect(therapistWorkspace.observations.filter((o: { planVersionId: string }) =>
      o.planVersionId === created.versionId)).toEqual([]);
    expect(therapistWorkspace.observations.some((o: { planVersionId: string; goalKey: string }) =>
      o.planVersionId === plan.versionId && o.goalKey === 'two-word')).toBe(true);
    expect((await get(sup, W).expect(200)).body.plans
      .find((x: { id: string }) => x.id === created.id).source.reportVersionId).toBe(source.id);
    await get(other, W).expect(404);
    for (const forbidden of [admin, ada, coord]) await get(forbidden, W).expect(403);

    expect((await post(h, handoffPath, therapist, body).expect(201)).body).toMatchObject({
      id: created.id, versionId: created.versionId, reused: true,
    });
    expect((await post(h, handoffPath, therapist, {
      ...body, requestId: '57bf6a97-568d-4e46-b275-07da6cd1a5e0',
    }).expect(201)).body).toMatchObject({
      id: created.id, versionId: created.versionId, reused: true,
    });
    await post(h, handoffPath, therapist, { ...body, title: 'Different request with reused ID' }).expect(409);
    expect(await h.prisma.therapyPlan.count({ where: { id: created.id } })).toBe(1);
    expect(await h.prisma.centerEvent.count({ where: {
      centerId, type: 'clinical.report_plan_drafted',
      meta: { path: ['planId'], equals: created.id },
    } })).toBe(1);

    expect((await patch(therapist, P, { sections: { summary: 'Draft summary', familySummary: 'Ivo enjoyed the picture games.' }, version: 1 }).expect(200)).body.version).toBe(2);
    expect((await patch(therapist, P, { sections: { summary: 'stale tab' }, version: 1 }).expect(409)).body.message).toMatch(/another window/);
    await patch(sup, P, { sections: { summary: 'x' }, version: 2 }).expect(403);
    await patch(therapist, P, { sections: { bogus: 'x' }, version: 2 }).expect(400);
    expect((await post(h, `${P}/versions`, therapist, { version: 2 }).expect(201)).body).toEqual({ number: 2, version: 3 });
    await patch(therapist, P, { sections: { summary: '' }, version: 3 }).expect(200);
    await post(h, `${P}/submit`, therapist, { version: 4 }).expect(422);
    await patch(therapist, P, { sections: { summary: 'Recorded values are listed below.' }, version: 4 }).expect(200);
    await post(h, `${P}/comments`, sup, { version: 5, comment: 'Not in review yet' }).expect(409);
    expect((await post(h, `${P}/submit`, therapist, { version: 5 }).expect(200)).body.number).toBe(3);
    expect((await patch(therapist, P, { sections: { summary: 'late' }, version: 6 }).expect(409)).body.message).toMatch(/with the supervisor/);
    for (const s of [sup, therapist]) await post(h, `${P}/release`, s).expect(403);
    await post(h, `${P}/comments`, therapist, { comment: 'self review' }).expect(403);
    for (const s of [admin, ada, coord, therapist, other]) await get(s, queue).expect(403);
    await get(ops, queue).expect(404); // Platform actors have no centre context; do not disclose resources.
    const foreignCenter = (await post(h, '/api/platform/centers', ops, {
      name: 'Other Synthetic Center', timezone: 'Europe/Berlin', country: 'Germany', city: 'Hamburg',
      specialties: ['speech'], firstAdmin: { email: 'lead2@prog.test', displayName: 'Other Admin' },
    }).expect(201)).body.id;
    await get(sup, `/api/centers/${foreignCenter}/clinical/reports/review-queue`).expect(404);
    const pending = (await get(sup, queue).expect(200)).body;
    expect(pending).toMatchObject({ synthetic: true, released: false, total: 1 });
    expect(pending.items).toHaveLength(1);
    expect(pending.items[0]).toMatchObject({ id, childId: kid, childName: 'Ivo Lane',
      title: 'Autumn report', service: 'speech', status: 'IN_REVIEW' });
    expect(JSON.stringify(pending)).not.toMatch(/Draft summary|Synthetic baseline|Recorded values are listed|familySummary/);
    expect((await get(sup, P).expect(200)).body).toMatchObject({ canEdit: false, canReview: true });
    await post(h, `${P}/comments`, sup, { version: 6, comment: 'Please list the session dates.' }).expect(200);
    await post(h, `${P}/return`, sup, { version: 7, comment: 'Returned for revision: add session dates.' }).expect(200);
    expect((await get(sup, queue).expect(200)).body).toMatchObject({ total: 0, items: [] });
    d = (await get(therapist, P).expect(200)).body;
    expect(d).toMatchObject({ canEdit: true, report: { status: 'RETURNED_FOR_REVISION', version: 8 } });
    expect(d.report.reviewNotes.map((n: { kind: string }) => n.kind)).toEqual(['comment', 'returned']);
    expect(d.versions.map((v: { number: number; kind: string }) => [v.number, v.kind])).toEqual([[3, 'SUBMITTED'], [2, 'SAVED'], [1, 'CREATED']]);
    const v1 = (await get(sup, c(`clinical/report-versions/${d.versions[2].id}`)).expect(200)).body;
    expect(v1.sections.summary).toBe('');
    expect(v1.evidence.goals).toHaveLength(3);
    await get(other, c(`clinical/report-versions/${d.versions[2].id}`)).expect(404);

    const prev = (await get(therapist, `${P}/family-preview`).expect(200)).body;
    expect(prev).toMatchObject({ preview: true, released: false, childName: 'Ivo', message: 'Ivo enjoyed the picture games.' });
    expect(JSON.stringify(prev)).not.toMatch(/Recorded values are listed|Synthetic baseline|Please list/);
    await get(ada, `${P}/family-preview`).expect(403);

    const demo = (await get(ada, c('family/progress-demo')).expect(200)).body;
    expect(demo).toMatchObject({ sample: true, released: false });
    expect(JSON.stringify(demo)).not.toMatch(/Ivo|two-word phrases"|Autumn/);
    await get(therapist, c('family/progress-demo')).expect(403);

    await expect(h.prisma.$executeRawUnsafe(`INSERT INTO report_release (id, report_id, report_version_id, center_id, audience, released_by_id, released_at) VALUES (gen_random_uuid(), '${id}', '${d.versions[0].id}', '${centerId}', 'guardian', '${id}', now())`)).rejects.toThrow(/release is disabled/);
    await expect(h.prisma.$executeRawUnsafe(`UPDATE report_version SET kind = 'X' WHERE report_id = '${id}'`)).rejects.toThrow(/immutable/);
    const types = (await h.prisma.centerEvent.findMany({ where: { centerId }, select: { type: true } })).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['clinical.report_drafted', 'clinical.report_autosaved', 'clinical.report_version_saved', 'clinical.report_submitted', 'clinical.report_commented', 'clinical.report_returned']));
  });
  it('pages beyond 100 pending reports with server-side scoped filters and stable ordering', async () => {
    const sup = await staff('pagination-supervisor@prog.test', ['CLINICAL_SUPERVISOR'], []);
    const therapist = await staff('pagination-therapist@prog.test', ['THERAPIST']);
    const a = (await post(h, c('children'), admin, {
      firstName: 'Alice', lastName: 'Queue', dateOfBirth: '2019-04-02', services: ['speech'],
    }).expect(201)).body.id;
    // Additional child is an isolated high-volume database fixture, not an API
    // onboarding attempt: the synthetic centre intentionally has a child cap.
    const existing = await h.prisma.child.findUniqueOrThrow({ where: { id: a } });
    const b = (await h.prisma.child.create({ data: {
      centerId, firstName: 'Béatrice', lastName: 'Queue',
      dateOfBirth: new Date('2018-04-02T00:00:00Z'), services: ['speech'],
      createdById: existing.createdById, createdAt: new Date(h.clock.t),
    } })).id;
    const member = therapist.body.activeContext.membershipId;
    const baseTime = Date.parse('2026-10-15T09:00:00Z');
    // Seed only synthetic report metadata; no release, sign, or clinical action.
    await h.prisma.progressReport.createMany({ data: Array.from({ length: 102 }, (_, i) => ({
      centerId, childId: i === 0 ? b : a, membershipId: member,
      service: i === 0 ? 'occupational' : 'speech',
      title: i === 0 ? 'Unique Needle' : `Bulk Review ${String(i).padStart(3, '0')}`,
      status: 'IN_REVIEW', periodStart: new Date('2026-09-01T00:00:00Z'),
      periodEnd: new Date('2026-10-19T00:00:00Z'),
      createdAt: new Date(baseTime + i * 1000), updatedAt: new Date(baseTime + i * 1000),
    })) });
    const queue = c('clinical/reports/review-queue');
    const first = (await get(sup, queue).expect(200)).body;
    expect(first).toMatchObject({ total: 102, filteredTotal: 102, page: 1, pageSize: 25, hasMore: true });
    expect(first.items).toHaveLength(25);
    const last = (await get(sup, queue + '?page=5').expect(200)).body;
    expect(last).toMatchObject({ total: 102, filteredTotal: 102, page: 5, hasMore: false });
    expect(last.items).toHaveLength(2);
    const ids = new Set<string>();
    for (let page = 1; page <= 5; page++) {
      const batch = (await get(sup, queue + '?page=' + page).expect(200)).body.items;
      for (const row of batch) {
        expect(ids.has(row.id)).toBe(false);
        ids.add(row.id);
        expect(row).not.toHaveProperty('sections');
        expect(row).not.toHaveProperty('evidence');
      }
    }
    expect(ids.size).toBe(102);
    const filtered = (await get(sup, queue + '?search=Unique%20Needle').expect(200)).body;
    expect(filtered).toMatchObject({ total: 102, filteredTotal: 1, page: 1, hasMore: false });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]).toMatchObject({ title: 'Unique Needle', childId: b });
    const accent = (await get(sup, queue + '?search=Beatrice%20Queue').expect(200)).body;
    expect(accent).toMatchObject({ filteredTotal: 1 });
    expect(accent.items[0].childId).toBe(b);
    const fullName = (await get(sup, queue + '?search=Alice%20Queue').expect(200)).body;
    expect(fullName).toMatchObject({ filteredTotal: 101 });
    const displayedSpecialty = (await get(sup, queue + '?search=Occupational%20therapy').expect(200)).body;
    expect(displayedSpecialty).toMatchObject({ filteredTotal: 1 });
    expect(displayedSpecialty.items[0].id).toBe(filtered.items[0].id);
    // SQL search must treat %, _ and backslash as literal text, not wildcards.
    for (const literal of ['%', '_', '\\\\']) {
      const result = (await get(sup, queue + '?search=' + encodeURIComponent(literal)).expect(200)).body;
      expect(result).toMatchObject({ filteredTotal: 0, items: [] });
    }
    const authorMember = await h.prisma.membership.findUniqueOrThrow({ where: { id: member } });
    await h.prisma.user.update({
      where: { id: authorMember.userId }, data: { displayName: 'Óscar Reviewer' },
    });
    for (const nameQuery of ['Oscar%20Reviewer', '%C3%93scar%20Reviewer']) {
      const byAuthor = (await get(sup, queue + '?search=' + nameQuery).expect(200)).body;
      expect(byAuthor).toMatchObject({ total: 102, filteredTotal: 102 });
      expect(byAuthor.items[0].author).toBe('Óscar Reviewer');
    }
    const specialist = (await get(sup, queue + '?service=occupational&childId=' + b).expect(200)).body;
    expect(specialist).toMatchObject({ total: 102, filteredTotal: 1 });
    expect(specialist.items[0].title).toBe('Unique Needle');
    const wrong = (await get(sup, queue + '?childId=' + a + '&service=occupational').expect(200)).body;
    expect(wrong).toMatchObject({ total: 102, filteredTotal: 0, items: [] });
    await get(sup, queue + '?page=0').expect(400);
    await get(sup, queue + '?page=10001').expect(400);
    await get(sup, queue + '?childId=not-uuid').expect(400);
    await get(sup, queue + '?service=invalid-specialty').expect(400);
    await get(therapist, queue + '?search=Needle').expect(403);
  });

  it('hides archived-child review metadata and restores queue visibility without restoring therapist assignments', async () => {
    // Isolated, disposable synthetic fixture: preserving the original report
    // lifecycle test is essential because archive permanently ends assignments.
    const therapist = await staff('archive-therapist@prog.test', ['THERAPIST']);
    const sup = await staff('archive-supervisor@prog.test', ['CLINICAL_SUPERVISOR'], []);
    const kid = (await post(h, c('children'), admin, {
      firstName: 'Archived', lastName: 'Fixture', dateOfBirth: '2019-04-02', services: ['speech'],
    }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin, {
      membershipId: therapist.body.activeContext.membershipId, service: 'speech', isLead: true,
    }).expect(201);
    const report = await h.prisma.progressReport.create({ data: {
      centerId, childId: kid, membershipId: therapist.body.activeContext.membershipId,
      service: 'speech', title: 'Disposable pending review', status: 'IN_REVIEW',
      periodStart: new Date('2026-09-01T00:00:00Z'), periodEnd: new Date('2026-10-19T00:00:00Z'),
      createdAt: new Date(h.clock.t), updatedAt: new Date(h.clock.t),
    } });
    const queue = c('clinical/reports/review-queue');
    expect((await get(sup, queue).expect(200)).body).toMatchObject({ total: 1 });
    await post(h, c(`children/${kid}/archive`), admin, {
      reason: 'Disposable archive-scope regression',
    }).expect(200);
    expect((await get(sup, queue).expect(200)).body).toMatchObject({ total: 0, items: [] });
    expect((await h.prisma.progressReport.findUniqueOrThrow({ where: { id: report.id } })).status).toBe('IN_REVIEW');
    const ended = await h.prisma.careAssignment.count({
      where: { childId: kid, membershipId: therapist.body.activeContext.membershipId, endedAt: null },
    });
    expect(ended).toBe(0);
    await post(h, c(`children/${kid}/restore`), admin, {}).expect(200);
    expect((await get(sup, queue).expect(200)).body).toMatchObject({ total: 1 });
    await get(therapist, c(`clinical/reports/${report.id}`)).expect(404);
  });

});
