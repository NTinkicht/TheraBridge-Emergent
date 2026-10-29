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
  async function member(name: string, role: 'CENTER_ADMIN' | 'THERAPIST' | 'CLINICAL_SUPERVISOR', specialties: string[] = []) {
    const user = await createUser(h.prisma, name + '@handover.test');
    const m = await h.prisma.membership.create({ data: {
      centerId, userId: user.id, specialties, roles: { create: { role } },
    } });
    return { id: m.id, who: await signIn(h, user.email) };
  }
  const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(r => { resolve = r; });
    return { promise, resolve };
  };
  // Verify actual row-lock contention rather than assuming a particular timing.
  async function waitForBlock(query: string) {
    for (let i = 0; i < 150; i++) {
      const rows = await h.prisma.$queryRaw<{ waiting: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM pg_stat_activity
          WHERE datname = current_database() AND pid <> pg_backend_pid()
            AND wait_event_type = 'Lock' AND query ILIKE ${`%${query}%`}) AS waiting`;
      if (rows[0].waiting) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`No PostgreSQL row-lock wait observed for ${query}`);
  }
  async function waitForBlockedCount(query: string, minimum: number) {
    for (let i = 0; i < 150; i++) {
      const rows = await h.prisma.$queryRaw<{ blocked: number }[]>`
        SELECT COUNT(*)::int AS blocked FROM pg_stat_activity
        WHERE datname = current_database() AND pid <> pg_backend_pid()
          AND wait_event_type = 'Lock' AND query ILIKE ${`%${query}%`}`;
      if (rows[0].blocked >= minimum) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Expected ${minimum} PostgreSQL lock waits on ${query}`);
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
  it('legacy governance access lists only simulation drafts, not operational handover proposals', async () => {
    const proposal = (await start(admin, body()).expect(201)).body;
    const legacy = (await h.http().get(c('access')).set('Cookie',admin.cookie).expect(200)).body;
    expect(legacy.transfers).toEqual([]);
    expect((await get(admin).expect(200)).body.items[0].id).toBe(proposal.id);
  });

  it('keeps every open proposal visible beyond 101 newer cancelled records', async () => {
    const pending = (await start(admin, body()).expect(201)).body;
    const user = admin.body.user.id as string;
    await h.prisma.caseloadTransferDraft.createMany({ data: Array.from({length:101}, (_,i)=>({
      centerId, childId, fromMembershipId: fromId, toMembershipId: targetId, service:'speech',
      reason:'STAFF_CHANGE', status:'CANCELLED', createdById:user,
      createdAt:new Date(h.clock.now().getTime() + (i+1)*1000),
    })) });
    const manager=(await get(admin).expect(200)).body.items;
    const recipient=(await get(target).expect(200)).body.items;
    expect(manager[0].id).toBe(pending.id);
    expect(recipient[0].id).toBe(pending.id);
    expect(manager.filter((p: { status:string }) => p.status === 'CANCELLED')).toHaveLength(100);
    await ack(target,pending.id).expect(201);
  });

  it('ending the source assignment invalidates the pending acknowledgement', async () => {
    const proposal=(await start(admin,body()).expect(201)).body;
    await h.prisma.careAssignment.updateMany({ where: { centerId, childId, membershipId: fromId,
      endedAt:null }, data: { endedAt:h.clock.now() } });
    await ack(target,proposal.id).expect(409);
    expect((await h.prisma.caseloadTransferDraft.findUniqueOrThrow({where:{id:proposal.id}})).status).toBe('PENDING_ACK');
    expect(await h.prisma.centerEvent.count({where:{type:'handover.operational_acknowledged'}})).toBe(0);
  });

  it.each(['specialty','assignment'] as const)(
    'does not acknowledge after concurrent %s revocation commits', async change => {
      const proposal = (await start(admin,body()).expect(201)).body;
      const started = deferred(), release = deferred();
      const removing = h.prisma.$transaction(async tx => {
        if (change === 'specialty') await tx.membership.update({
          where:{id:targetId}, data:{specialties:[]},
        });
        else await tx.careAssignment.updateMany({
          where:{centerId,childId,membershipId:fromId,endedAt:null},
          data:{endedAt:h.clock.now()},
        });
        started.resolve();
        await release.promise;
      });
      await started.promise;
      const responding=ack(target,proposal.id).then(r=>r);
      try { await waitForBlock(change === 'specialty' ? 'membership' : 'care_assignment'); }
      finally { release.resolve(); }
      await removing;
      expect((await responding).status).toBe(409);
      expect((await h.prisma.caseloadTransferDraft.findUniqueOrThrow({where:{id:proposal.id}})).status).toBe('PENDING_ACK');
      expect(await h.prisma.centerEvent.count({where:{type:'handover.operational_acknowledged'}})).toBe(0);
    }
  );

  it('serializes cancellation and acknowledgement when both compete for the center row', async () => {
    const proposal = (await start(admin,body()).expect(201)).body;
    const locked = deferred(), release = deferred();
    const holder = h.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "center" WHERE id = ${centerId}::uuid FOR UPDATE`;
      locked.resolve();
      await release.promise;
    });
    await locked.promise;
    // Queue cancellation first; verify it is blocked before enqueuing acknowledgement.
    const cancelling = cancel(admin, proposal.id).then(res => res);
    try {
      await waitForBlockedCount('SELECT id FROM "center"', 1);
      const acknowledging = ack(target, proposal.id).then(res => res);
      try { await waitForBlockedCount('SELECT id FROM "center"', 2); }
      finally { release.resolve(); }
      await holder;
      const [cancelResult, ackResult] = await Promise.all([cancelling, acknowledging]);
      expect(cancelResult.status).toBe(201);
      expect(ackResult.status).toBe(404);
    } finally {
      release.resolve();
      await holder;
    }
    expect((await h.prisma.caseloadTransferDraft.findUniqueOrThrow({where:{id:proposal.id}})).status).toBe('CANCELLED');
    expect(await h.prisma.centerEvent.count({where:{type:'handover.cancelled'}})).toBe(1);
    expect(await h.prisma.centerEvent.count({where:{type:'handover.operational_acknowledged'}})).toBe(0);
    expect(await h.prisma.careAssignment.count({where:{centerId,childId,endedAt:null}})).toBe(1);
  });

  it('cancellation is terminal, tenant scoped and cannot be acknowledged', async () => {
    const proposal = (await start(admin,body()).expect(201)).body;
    await cancel(admin,proposal.id).expect(201);
    await cancel(admin,proposal.id).expect(404);
    await ack(target,proposal.id).expect(404);
    expect(await h.prisma.careAssignment.count({where:{endedAt:null}})).toBe(1);
    expect(await h.prisma.centerEvent.count({where:{type:'handover.operational_acknowledged'}})).toBe(0);
  });

  it('TB-EM-050 manager readiness is read-only, always blocked and isolated from recipient', async () => {
    const proposal = (await start(admin, body()).expect(201)).body;
    const path = c(`handover-proposals/${proposal.id}/readiness`);
    const read = (who: Signed, url = path) => h.http().get(url).set('Cookie', who.cookie);
    const initial = (await read(admin).expect(200)).body;
    expect(initial).toMatchObject({ proposalId: proposal.id, childId, service:'speech',
      status:'PENDING_ACK', synthetic:true, readonly:true, readyForTransfer:false,
      assignmentChanged:false, accessGranted:false, clinicalHandover:false, released:false });
    expect(initial.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({code:'PROPOSAL_OPEN',met:true}),
      expect.objectContaining({code:'INCOMING_RECEIPT',met:false}),
      expect.objectContaining({code:'SIGNED_CLINICAL_AUTHORIZATION',met:false}),
      expect.objectContaining({code:'PURPOSE_SPECIFIC_CONSENT',met:false}),
      expect.objectContaining({code:'CLINICAL_HANDOVER_SCOPE',met:false}),
    ]));
    await read(target).expect(403);
    await read(therapist).expect(403);
    await read(outsider).expect(403);
    const supervisor = await member('supervisor', 'CLINICAL_SUPERVISOR');
    await read(supervisor.who).expect(403);
    expect(Number.isFinite(Date.parse(initial.checkedAt))).toBe(true);
    await read(admin,c(`handover-proposals/${randomUUID()}/readiness`)).expect(404);
    expect(await h.prisma.centerEvent.count({where:{type:{startsWith:'handover.readiness'}}})).toBe(0);
    await ack(target, proposal.id).expect(201);
    const acknowledged=(await read(admin).expect(200)).body;
    expect(acknowledged.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({code:'INCOMING_RECEIPT',met:true}),
      expect.objectContaining({code:'SIGNED_CLINICAL_AUTHORIZATION',met:false}),
    ]));
    expect(acknowledged.readyForTransfer).toBe(false);
    await h.prisma.child.update({ where: { id: childId }, data: { status: 'ARCHIVED' } });
    const archived = (await read(admin).expect(200)).body;
    expect(archived.status).toBe('ACKNOWLEDGED');
    expect(archived.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({code:'CHILD_SERVICE_ACTIVE',met:false}),
      expect.objectContaining({code:'INCOMING_RECEIPT',met:true}),
      expect.objectContaining({code:'SIGNED_CLINICAL_AUTHORIZATION',met:false}),
    ]));
    expect(archived.readyForTransfer).toBe(false);
    await h.prisma.child.update({ where: { id: childId }, data: { status: 'ACTIVE' } });
    await h.prisma.membership.update({where:{id:targetId},data:{specialties:[]}});
    const noSpecialty=(await read(admin).expect(200)).body;
    expect(noSpecialty.checks).toContainEqual(expect.objectContaining({
      code:'RECIPIENT_QUALIFIED',met:false,
    }));
    await h.prisma.careAssignment.updateMany({where:{centerId,childId,membershipId:fromId,endedAt:null},
      data:{endedAt:h.clock.now()}});
    const invalid=(await read(admin).expect(200)).body;
    expect(invalid.checks).toContainEqual(expect.objectContaining({
      code:'SOURCE_ASSIGNMENT_ACTIVE',met:false,
    }));
    await cancel(admin,proposal.id).expect(201);
    expect((await read(admin).expect(200)).body.checks).toContainEqual(expect.objectContaining({
      code:'PROPOSAL_OPEN',met:false,
    }));
    expect(await h.prisma.careAssignment.count({where:{centerId,childId,endedAt:null}})).toBe(0);
    process.env.HANDOVER_DEMO='false';
    try { await read(admin).expect(403); }
    finally { process.env.HANDOVER_DEMO='true'; }
  });

  it('TB-EM-050 readiness does not reveal cross-center proposals to another manager', async () => {
    const proposal = (await start(admin,body()).expect(201)).body;
    const otherCenter=(await h.prisma.center.create({data:{
      name:'Other synthetic center',slug:'other-readiness-center',timezone:'Asia/Dubai',
    }})).id;
    const secondAdmin=await createUser(h.prisma,'second-admin@handover.test');
    await h.prisma.membership.create({data:{
      centerId:otherCenter,userId:secondAdmin.id,roles:{create:{role:'CENTER_ADMIN'}},
    }});
    const signed=await signIn(h,secondAdmin.email);
    const response=await h.http().get(`/api/centers/${otherCenter}/governance/handover-proposals/${proposal.id}/readiness`)
      .set('Cookie',signed.cookie).expect(404);
    expect(response.body).not.toHaveProperty('childId');
    expect(response.body).not.toHaveProperty('checks');
  });

  it('serializes competing proposals without creating multiple open handovers', async () => {
    const [a,b] = await Promise.all([start(admin,body()), start(admin,body())]);
    expect([a.status,b.status].sort()).toEqual([201,409]);
    expect(await h.prisma.caseloadTransferDraft.count({ where: { status:'PENDING_ACK' } })).toBe(1);
  });
});
