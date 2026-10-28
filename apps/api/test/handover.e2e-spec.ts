import { randomUUID } from 'node:crypto';
import { Harness, Signed, ORIGIN, createUser, makeApp, post, resetDb, signIn } from './helpers';

describe('TB-EM-049 synthetic operational handover proposal (PostgreSQL)', () => {
  let h: Harness, centerId: string, childId: string, fromId: string, targetId: string;
  let admin: Signed, therapist: Signed, target: Signed, outsider: Signed;
  let savedFlag: string | undefined;
  const c = (p: string) => `/api/centers/${centerId}/governance/${p}`;
  const get = (who: Signed) => h.http().get(c('handover-proposals')).set('Cookie', who.cookie);
  const start = (who: Signed, body: object) => post(h, c('handover-proposals'), who, body);
  const ack = (who: Signed, id: string) => post(h, c(`handover-proposals/${id}/acknowledge`), who, {});
  const cancel = (who: Signed, id: string) => post(h, c(`handover-proposals/${id}/cancel`), who, {});
  const body = () => ({ childId, fromMembershipId: fromId, toMembershipId: targetId,
    service: 'speech', reasonCode: 'STAFF_CHANGE' });
  async function member(name: string, role: 'CENTER_ADMIN' | 'THERAPIST', specialties: string[] = []) {
    const user = await createUser(h.prisma, name + '@handover.test');
    const m = await h.prisma.membership.create({ data: {
      centerId, userId: user.id, specialties, roles: { create: { role } },
    } });
    return { id: m.id, who: await signIn(h, user.email) };
  }
  beforeAll(async () => {
    savedFlag = process.env.HANDOVER_DEMO; process.env.HANDOVER_DEMO = 'true';
    h = await makeApp({ DEPLOYMENT_ENV: 'local' });
  });
  afterAll(async () => {
    await h.close();
    if (savedFlag === undefined) delete process.env.HANDOVER_DEMO;
    else process.env.HANDOVER_DEMO = savedFlag;
  });
  beforeEach(async () => {
    await resetDb(h.prisma);
    centerId = (await h.prisma.center.create({ data: {
      name: 'Synthetic transfer center', slug: 'handover-demo', timezone: 'Asia/Dubai',
    } })).id;
    const a = await member('admin','CENTER_ADMIN'); admin = a.who;
    const f = await member('from','THERAPIST',['speech']); fromId = f.id; therapist = f.who;
    const t = await member('incoming','THERAPIST',['speech']); targetId = t.id; target = t.who;
    const o = await member('outsider','THERAPIST',['speech']); outsider = o.who;
    childId = (await h.prisma.child.create({ data: {
      centerId, firstName: 'Synthetic', lastName: 'Child', dateOfBirth: new Date('2020-01-01'),
      services: ['speech'], createdById: admin.body.user.id, createdAt: h.clock.now(),
    } })).id;
    await h.prisma.careAssignment.create({ data: {
      centerId, childId, membershipId: fromId, service: 'speech', startedAt: h.clock.now(),
    } });
  });
  it('proposes, restricts recipient inbox, acknowledges without changing any assignment, and cancels', async () => {
    await start(therapist, body()).expect(403);
    await start(target, body()).expect(403);
    const p = (await start(admin, body()).expect(201)).body;
    expect(p).toMatchObject({ service: 'speech', reasonCode: 'STAFF_CHANGE', status: 'PENDING_ACK',
      synthetic: true, released: false, clinicalHandover: false, accessGranted: false, assignmentChanged: false });
    expect(await h.prisma.careAssignment.count({ where: { endedAt: null } })).toBe(1);
    await start(admin, body()).expect(409);
    expect((await get(target).expect(200)).body.items[0]).toMatchObject({
      id: p.id, status: 'PENDING_ACK', accessGranted: false, clinicalHandover: false });
    expect(JSON.stringify((await get(target).expect(200)).body)).not.toContain(childId);
    expect((await get(outsider).expect(200)).body.items).toEqual([]);
    expect((await get(admin).expect(200)).body.items[0].childId).toBe(childId);
    await ack(outsider, p.id).expect(404);
    await ack(therapist, p.id).expect(404);
    await ack(admin, p.id).expect(403);
    const confirmed=(await ack(target,p.id).expect(201)).body;
    expect(confirmed).toMatchObject({ id:p.id, status:'ACKNOWLEDGED', assignmentChanged:false });
    await ack(target,p.id).expect(404);
    expect(await h.prisma.careAssignment.count({ where: { endedAt: null } })).toBe(1);
    expect(await h.prisma.centerEvent.count({ where: { type: 'handover.operational_acknowledged' } })).toBe(1);
    await cancel(target, p.id).expect(403);
    expect((await cancel(admin,p.id).expect(201)).body.status).toBe('CANCELLED');
    expect((await get(target).expect(200)).body.items[0].status).toBe('CANCELLED');
    expect(await h.prisma.careAssignment.count({ where: { endedAt: null } })).toBe(1);
  });
  it('rejects invalid target, unassigned source, extra clinical text, changed scope, and demo-off writes', async () => {
    await start(admin, { ...body(), reasonCode: 'REAL_CLINICAL_TRANSFER' }).expect(400);
    await start(admin, { ...body(), clinicalSummary: 'Do not transmit clinical text' }).expect(400);
    await start(admin, { ...body(), fromMembershipId: targetId }).expect(404);
    await start(admin, { ...body(), toMembershipId: fromId }).expect(422);
    await start(admin, { ...body(), toMembershipId: randomUUID() }).expect(422);
    const valid = (await start(admin, body()).expect(201)).body;
    await h.prisma.membership.update({ where: { id: targetId }, data: { specialties: [] } });
    await ack(target, valid.id).expect(409);
    expect((await h.prisma.caseloadTransferDraft.findUniqueOrThrow({ where: { id: valid.id } })).status).toBe('PENDING_ACK');
    process.env.HANDOVER_DEMO='false';
    try {
      expect((await get(admin).expect(200)).body.items).toEqual([]);
      await start(admin,body()).expect(403);
      await ack(target,valid.id).expect(403);
      await cancel(admin,valid.id).expect(403);
    } finally { process.env.HANDOVER_DEMO='true'; }
    expect(await h.prisma.centerEvent.count({ where: { type: 'handover.operational_acknowledged' } })).toBe(0);
  });
  it('serializes competing proposals without creating multiple open handovers', async () => {
    const [a,b] = await Promise.all([start(admin,body()), start(admin,body())]);
    expect([a.status,b.status].sort()).toEqual([201,409]);
    expect(await h.prisma.caseloadTransferDraft.count({ where: { status:'PENDING_ACK' } })).toBe(1);
  });
});
