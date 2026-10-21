import { randomUUID } from 'node:crypto';
import { Harness, Signed, ORIGIN, cookieFrom, createUser, makeApp, post, resetDb, signIn } from './helpers';

describe('TB-EM-015 session execution (PostgreSQL)', () => {
  let h: Harness, therapist: Signed, other: Signed, dual: Signed, centerId: string, childId: string, templateId: string, appointmentId: string;
  const c = (p: string) => `/api/centers/${centerId}/clinical/${p}`;
  const patch = (s: Signed, id: string, body: object) => h.http().patch(c(`sessions/${id}`)).set('Origin', ORIGIN).set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send(body);
  const start = (s = therapist, extra = {}) => post(h, c(`children/${childId}/sessions`), s, { service: 'speech', sessionDate: '2026-10-19', actualStart: h.clock.now().toISOString(), startKey: randomUUID(), ...extra });
  const payload = (extra = {}) => ({ version: 1, mutationKey: randomUUID(), sections: { response: 'Reviewed synthetic note' }, activities: [], attendance: 'PRESENT', actualStart: h.clock.now().toISOString(), executionStatus: 'IN_PROGRESS', ...extra });
  const activity = (extra = {}) => ({ id: randomUUID(), templateId, minutes: 5, objective: 'Synthetic turn taking', completion: 'COMPLETED', outcome: 'ACHIEVED', assistance: 'SUBSTANTIAL_ASSISTANCE', observation: 'Factual synthetic observation', ...extra });
  beforeAll(async () => { h = await makeApp(); });
  afterAll(async () => { await h.close(); });
  beforeEach(async () => {
    await resetDb(h.prisma); h.clock.t = Date.parse('2026-10-19T10:00:00Z');
    const center = await h.prisma.center.create({ data: { name: 'Synthetic session center', slug: randomUUID(), timezone: 'UTC', country: 'Test', city: 'Test', specialties: ['speech', 'occupational'], trialEndsAt: new Date(h.clock.t + 86400000) } }); centerId = center.id;
    const sessions: Signed[] = [];
    for (const [i, specialties] of [['one', ['speech']], ['other', ['speech']], ['dual', ['speech', 'occupational']]] as const) {
      const u = await createUser(h.prisma, `${i}@session.test`);
      const m = await h.prisma.membership.create({ data: { centerId, userId: u.id, specialties: [...specialties], responsibilities: [], roles: { create: { role: 'THERAPIST' } } } });
      const s = await signIn(h, u.email); const selected = await post(h, '/api/auth/context', s, { membershipId: m.id, role: 'THERAPIST' }).expect(200); const token = cookieFrom(selected, 'tb_session')!; sessions.push({ token, cookie: `tb_session=${token}`, csrf: selected.body.csrfToken, body: selected.body });
    }
    [therapist, other, dual] = sessions;
    const members = await h.prisma.membership.findMany({ where: { centerId }, include: { user: true } });
    childId = (await h.prisma.child.create({ data: { centerId, firstName: 'Synthetic', lastName: 'Child', dateOfBirth: new Date('2020-01-01'), services: ['speech', 'occupational'], createdById: members[0].userId, createdAt: h.clock.now() } })).id;
    for (const m of members.filter(m => !m.user.email.startsWith('other'))) for (const service of m.specialties) await h.prisma.careAssignment.create({ data: { centerId, childId, membershipId: m.id, service, startedAt: h.clock.now() } });
    templateId = (await h.prisma.activityTemplate.create({ data: { centerId, title: 'Synthetic game', service: 'speech', ageBand: '3-6', minutes: 10, materials: ['Cards'], steps: ['Take turns'], safety: ['Synthetic only'], createdAt: h.clock.now() } })).id;
    appointmentId = (await h.prisma.appointment.create({ data: { centerId, childId, membershipId: members.find(m => m.user.email.startsWith('one'))!.id, service: 'speech', startsAt: h.clock.now(), endsAt: new Date(h.clock.t + 3600000), createdAt: h.clock.now(), createdById: members[0].userId } })).id;
  });
  it('starts scheduled and ad-hoc sessions, prevents duplicate starts, persists results and stable snapshots, reorders/removes and completes read-only unsigned', async () => {
    const key = randomUUID(); const id = (await start(therapist, { appointmentId, startKey: key }).expect(201)).body.id;
    expect((await start(therapist, { appointmentId, startKey: key }).expect(201)).body.id).toBe(id);
    const a = activity(), b = activity({ completion: 'SKIPPED', outcome: undefined, assistance: undefined });
    const body = payload({ activities: [a, b] });
    await patch(therapist, id, body).expect(200); await patch(therapist, id, body).expect(200);
    await h.prisma.activityTemplate.update({ where: { id: templateId }, data: { title: 'Changed library', version: 2 } });
    await patch(therapist, id, payload({ version: 2, activities: [b, a] })).expect(200);
    await patch(therapist, id, payload({ version: 3, activities: [a], actualEnd: h.clock.now().toISOString(), executionStatus: 'COMPLETED' })).expect(200);
    const ws = await h.http().get(c(`children/${childId}`)).set('Cookie', therapist.cookie).expect(200);
    expect(ws.body.notes[0]).toMatchObject({ executionStatus: 'COMPLETED', status: 'DRAFT', sections: { response: 'Reviewed synthetic note' }, activities: [{ outcome: 'ACHIEVED', assistance: 'SUBSTANTIAL_ASSISTANCE', snapshot: { title: 'Synthetic game', version: 1 }, position: 0 }] });
    await patch(therapist, id, payload({ version: 4 })).expect(409);
    await h.http().patch(c(`notes/${id}`)).set('Origin', ORIGIN).set('Cookie', therapist.cookie).set('X-CSRF-Token', therapist.csrf).send({ version: 4, sections: { focus: 'Bypass' } }).expect(409);
    await start().expect(201);
    expect(await h.prisma.observation.count()).toBe(0);
  });
  it('supports both specialties while denying other-child, wrong-specialty, revoked assignments and ownership', async () => {
    await start(other).expect(404); await start(therapist, { service: 'occupational' }).expect(404);
    await start(dual, { service: 'occupational' }).expect(201); await start(dual).expect(201);
    const id = (await start().expect(201)).body.id;
    await patch(dual, id, payload()).expect(403);
    await h.prisma.careAssignment.updateMany({ where: { centerId, service: 'speech' }, data: { endedAt: h.clock.now() } });
    await patch(therapist, id, payload()).expect(404); await start().expect(404);
  });
  it('rejects canceled appointments, expired trial, invalid goals and cross-tenant requests', async () => {
    await h.prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CANCELLED', statusReason: 'Synthetic cancellation' } }); await start(therapist, { appointmentId }).expect(409);
    const id = (await start().expect(201)).body.id;
    await patch(therapist, id, payload({ activities: [activity({ planVersionId: randomUUID(), goalKey: 'same-name' })] })).expect(422);
    await post(h, `/api/centers/${randomUUID()}/clinical/children/${childId}/sessions`, therapist, {}).expect(404);
    await h.prisma.center.update({ where: { id: centerId }, data: { trialEndsAt: h.clock.now() } }); await patch(therapist, id, payload()).expect(403); await start().expect(403);
  });
  it('serializes concurrent updates and validates independent results without false success', async () => {
    const id = (await start().expect(201)).body.id;
    const results = await Promise.all([patch(therapist, id, payload()), patch(therapist, id, payload())]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    await patch(therapist, id, payload({ version: 2, activities: [activity({ assistance: undefined })] })).expect(422);
    expect((await h.prisma.sessionNote.findUniqueOrThrow({ where: { id } })).version).toBe(2);
    await patch(therapist, id, payload({ version: 2, executionStatus: 'COMPLETED' })).expect(422);
  });
});
