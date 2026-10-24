import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { Harness, ORIGIN, PASSWORD, Signed, cookieFrom, createUser, makeApp, post, preAuth, resetDb, signIn } from './helpers';

const DAY = 86_400_000;

describe('TB-EM-005 trials + TB-EM-006 center operations (real PostgreSQL)', () => {
  let h: Harness;
  let ops: Signed;
  let admin: Signed;
  let centerId: string;

  const get = (s: Pick<Signed, 'cookie'>, path: string) => h.http().get(path).set('Cookie', s.cookie);
  const patch = (s: Signed, path: string, body: object) => h.http().patch(path).set('Origin', ORIGIN).set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send(body);
  const token = (to: string) => h.app.get(DevMailboxService).list().find((m) => m.to === to)?.body.match(/#token=([A-Za-z0-9_-]+)/)?.[1];
  const c = (path: string) => `/api/centers/${centerId}/${path}`;
  async function accept(email: string, name = 'Person Name') {
    const p = await preAuth(h);
    const res = await h.http().post('/api/invitations/accept-new').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send({ token: token(email), displayName: name, password: PASSWORD });
    const t = cookieFrom(res, 'tb_session');
    return { res, s: { token: t!, cookie: `tb_session=${t}`, csrf: res.body.csrfToken, body: res.body } as Signed };
  }
  async function staff(email: string, roles: string[]) {
    await post(h, c('invitations'), admin, { email, displayName: 'Staff Person', roles, ...(roles.includes('THERAPIST') ? { specialties: ['speech'] } : {}) }).expect(201);
    return (await accept(email)).s;
  }
  const child = (over: object = {}) => ({ firstName: 'Mila', lastName: 'Stone', dateOfBirth: '2019-04-02', services: ['speech'], ...over });
  const at = (days: number, hour: number) => {
    const d = new Date(h.clock.now().getTime() + days * DAY);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  beforeAll(async () => {
    h = await makeApp({ DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' });
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(async () => {
    await resetDb(h.prisma);
    h.app.get(DevMailboxService).list().length = 0;
    const u = await createUser(h.prisma, 'ops@ops.therabridge.test');
    await h.prisma.platformRoleAssignment.create({ data: { userId: u.id, source: 'synthetic_seed', reason: 'test' } });
    ops = await signIn(h, u.email);
    const created = await post(h, '/api/platform/centers', ops, { name: 'Ops Center', timezone: 'Europe/Berlin', country: 'Germany', city: 'Berlin', specialties: ['speech'], firstAdmin: { email: 'lead@ops.test', displayName: 'Lead Admin' } }).expect(201);
    centerId = created.body.id;
    admin = (await accept('lead@ops.test', 'Lead Admin')).s;
  });

  it('trial: 30 days, 3 therapist seats including pending invitations, 1 child, expiry restrictions and extension', async () => {
    const t = await get(admin, c('trial')).expect(200);
    expect(t.body).toMatchObject({ onTrial: true, expired: false, daysLeft: 30, therapistSeats: { used: 0, limit: 3 }, children: { used: 0, limit: 1 } });
    await staff('t1@ops.test', ['THERAPIST']);
    await post(h, c('invitations'), admin, { email: 't2@ops.test', displayName: 'T Two', roles: ['THERAPIST'] }).expect(201);
    await post(h, c('invitations'), admin, { email: 't3@ops.test', displayName: 'T Three', roles: ['THERAPIST', 'COORDINATOR'] }).expect(201);
    const full = await post(h, c('invitations'), admin, { email: 't4@ops.test', displayName: 'T Four', roles: ['THERAPIST'] }).expect(409);
    expect(full.body.message).toMatch(/3 therapist seats/);
    await post(h, c('invitations'), admin, { email: 'coord@ops.test', displayName: 'Co Ord', roles: ['COORDINATOR'] }).expect(201);
    const coord = await h.prisma.invitation.findFirstOrThrow({ where: { email: 'coord@ops.test' } });
    void coord;
    const cs = (await accept('coord@ops.test')).s;
    await patch(admin, c(`staff/${cs.body.activeContext.membershipId}`), { roles: ['COORDINATOR', 'THERAPIST'] }).expect(409);

    await post(h, c('children'), admin, child()).expect(201);
    expect((await post(h, c('children'), admin, child({ firstName: 'Second' })).expect(409)).body.message).toMatch(/1 active child/);

    h.clock.advance(31 * DAY);
    admin = await signIn(h, 'lead@ops.test');
    expect((await get(admin, c('trial')).expect(200)).body).toMatchObject({ expired: true, daysLeft: 0 });
    await get(admin, c('children')).expect(200);
    expect((await post(h, c('invitations'), admin, { email: 'late@ops.test', displayName: 'Late One', roles: ['COORDINATOR'] }).expect(403)).body.message).toMatch(/trial has ended/);
    await post(h, `/api/platform/centers/${centerId}/trial/extend`, admin, { days: 14, reason: 'more time' }).expect(403);
    ops = await signIn(h, 'ops@ops.therabridge.test');
    const ext = await post(h, `/api/platform/centers/${centerId}/trial/extend`, ops, { days: 14, reason: 'Pilot evaluation needs more time' }).expect(200);
    expect(ext.body).toMatchObject({ expired: false, daysLeft: 14 });
    await post(h, c('invitations'), admin, { email: 'late@ops.test', displayName: 'Late One', roles: ['COORDINATOR'] }).expect(201);
    expect(await h.prisma.centerEvent.count({ where: { centerId, type: 'trial.extended' } })).toBe(1);
  });

  it('end-to-end: child → guardian invitation → therapist assignment → appointment → therapist day → parent portal', async () => {
    const coordinator = await staff('coord@ops.test', ['COORDINATOR']);
    const therapist = await staff('thera@ops.test', ['THERAPIST']);
    const therapistId = therapist.body.activeContext.membershipId;
    await post(h, c('children'), therapist, child()).expect(403);
    await post(h, c('children'), coordinator, child({ dateOfBirth: '2999-01-01' })).expect(422);
    const kid = (await post(h, c('children'), coordinator, child({ preferredName: 'Mimi' })).expect(201)).body.id;

    // Therapists only see assigned children.
    expect((await get(therapist, c('children')).expect(200)).body.items).toHaveLength(0);
    await get(therapist, c(`children/${kid}`)).expect(404);
    await post(h, c(`children/${kid}/assignments`), coordinator, { membershipId: coordinator.body.activeContext.membershipId, service: 'speech' }).expect(422);
    await post(h, c(`children/${kid}/assignments`), coordinator, { membershipId: therapistId, service: 'speech', isLead: true }).expect(201);
    await post(h, c(`children/${kid}/assignments`), coordinator, { membershipId: therapistId, service: 'speech' }).expect(409);
    expect((await get(therapist, c('children')).expect(200)).body.items[0]).toMatchObject({ preferredName: 'Mimi', team: [{ service: 'speech' }] });

    // Guardian invitation and acceptance into the family portal.
    const g = await post(h, c(`children/${kid}/guardians`), coordinator, { displayName: 'Rosa Stone', email: 'rosa@family.test', relationship: 'mother', isPrimary: true, invite: true }).expect(201);
    expect(g.body).toMatchObject({ invited: true, connected: false });
    await post(h, c(`children/${kid}/guardians`), coordinator, { displayName: 'Rosa Again', email: 'ROSA@family.test', relationship: 'mother' }).expect(409);
    const therapistView = await get(therapist, c(`children/${kid}`)).expect(200);
    expect(therapistView.body.guardians[0]).not.toHaveProperty('email');
    const parent = (await accept('rosa@family.test', 'Rosa Stone')).s;
    expect(parent.body.activeContext).toMatchObject({ role: 'GUARDIAN', centerId });
    expect(parent.body.permissions).toEqual(['family.portal.read', 'family.preferences.update', 'center.messages.use', 'family.activities.read', 'family.progress.demo', 'family.practice.read', 'family.practice.record']);
    await get(parent, c('children')).expect(403);
    const detail = await get(coordinator, c(`children/${kid}`)).expect(200);
    expect(detail.body.guardians[0]).toMatchObject({ portalStatus: 'CONNECTED', isPrimary: true });

    // Scheduling with conflict prevention.
    const slot = { childId: kid, membershipId: therapistId, service: 'speech', startsAt: at(1, 9), endsAt: at(1, 10), room: 'Room 2' };
    await post(h, c('appointments'), therapist, slot).expect(403);
    await post(h, c('appointments'), coordinator, { ...slot, service: 'physical' }).expect(422);
    await post(h, c('appointments'), coordinator, { ...slot, startsAt: at(1, 10), endsAt: at(1, 9) }).expect(422);
    const appt = (await post(h, c('appointments'), coordinator, slot).expect(201)).body.id;
    expect((await post(h, c('appointments'), coordinator, { ...slot, startsAt: at(1, 9) .replace(':00:00', ':30:00'), endsAt: at(1, 11) }).expect(409)).body.message).toMatch(/therapist already/);
    await post(h, c('appointments'), coordinator, { ...slot, startsAt: at(1, 10), endsAt: at(1, 11) }).expect(201);
    const list = await get(therapist, c(`appointments?from=${at(0, 0)}&to=${at(7, 0)}`)).expect(200);
    expect(list.body.items).toHaveLength(2);
    await patch(coordinator, c(`appointments/${appt}`), { startsAt: at(2, 9), endsAt: at(2, 10), version: 1 }).expect(200);
    await patch(coordinator, c(`appointments/${appt}`), { startsAt: at(2, 9), endsAt: at(2, 10), version: 1 }).expect(409);

    // The parent sees their child, the care team and upcoming appointments only.
    const fam = await get(parent, c('family')).expect(200);
    expect(fam.body.children).toHaveLength(1);
    expect(fam.body.children[0]).toMatchObject({ name: 'Mimi', team: [{ name: 'Person Name', service: 'speech', isLead: true }] });
    expect(fam.body.children[0].upcoming).toHaveLength(2);
    expect(JSON.stringify(fam.body)).not.toMatch(/email|dateOfBirth/);

    // Attendance: only after start, therapist only on own appointments, cancel needs a manager and a reason.
    await post(h, c(`appointments/${appt}/status`), therapist, { status: 'COMPLETED' }).expect(422);
    await post(h, c(`appointments/${appt}/status`), therapist, { status: 'CANCELLED', reason: 'sick day' }).expect(403);
    await post(h, c(`appointments/${appt}/status`), coordinator, { status: 'CANCELLED' }).expect(422);
    h.clock.advance(2 * DAY + 10 * 3_600_000);
    const later = await signIn(h, 'thera@ops.test', PASSWORD);
    await post(h, c(`appointments/${appt}/status`), later, { status: 'COMPLETED' }).expect(200);
    await post(h, c(`appointments/${appt}/status`), later, { status: 'NO_SHOW', reason: 'again' }).expect(409);

    // Dashboard counts.
    const coord2 = await signIn(h, 'coord@ops.test', PASSWORD);
    const dash = await get(coord2, c('dashboard')).expect(200);
    expect(dash.body.counts).toMatchObject({ activeChildren: 1, unassigned: 0, noGuardian: 0, therapists: 1 });
    expect(dash.body.trial.children).toEqual({ used: 1, limit: 1 });

    // Removing the guardian ends portal access immediately; archiving cancels future visits.
    const rosa = await signIn(h, 'rosa@family.test', PASSWORD);
    await post(h, c(`children/${kid}/guardians/${g.body.id}/remove`), coord2, { reason: 'Custody update' }).expect(200);
    expect((await get(rosa, c('family')).expect(200)).body.children).toHaveLength(0);
    await post(h, c(`children/${kid}/archive`), coord2, { reason: 'Moved away' }).expect(200);
    expect((await get(coord2, c('children?status=ARCHIVED')).expect(200)).body.items).toHaveLength(1);
    const events = await h.prisma.centerEvent.findMany({ where: { centerId }, select: { type: true } });
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['child.registered', 'guardian.added', 'assignment.started', 'appointment.scheduled', 'appointment.rescheduled', 'appointment.completed', 'guardian.removed', 'child.archived']));
  });

  it('audits explicit child-wide referents without granting clinical access', async () => {
    const therapist = await staff('ref-first@ops.test', ['THERAPIST']);
    const colleague = await staff('ref-second@ops.test', ['THERAPIST']);
    const coordinator = await staff('ref-coord@ops.test', ['COORDINATOR']);
    const kid = (await post(h, c('children'), admin, child()).expect(201)).body.id;
    const first = therapist.body.activeContext.membershipId;
    const second = colleague.body.activeContext.membershipId;
    const assignmentId = (await post(h, c('children/' + kid + '/assignments'), admin,
      { membershipId: first, service: 'speech', isLead: false }).expect(201)).body.id;
    await post(h, c('children/' + kid + '/assignments'), admin,
      { membershipId: second, service: 'speech', isLead: true }).expect(201);
    const before = (await get(admin, c('children/' + kid)).expect(200)).body;
    expect(before).toMatchObject({ referent: null, referentRevision: 0, referentStatus: 'NOT_DESIGNATED' });
    const url = c('children/' + kid + '/referent');
    const proposal = { membershipId: first, version: before.version, reason: 'Choose care coordinator' };
    await patch(coordinator, url, proposal).expect(403);
    await patch(therapist, url, proposal).expect(403);
    await patch(admin, url, { ...proposal, reason: 'x' }).expect(400);
    const a = (await patch(admin, url, proposal).expect(200)).body;
    expect(a).toMatchObject({ referentRevision: 1, version: before.version + 1 });
    const detail = (await get(admin, c('children/' + kid)).expect(200)).body;
    expect(detail.referent).toMatchObject({ membershipId: first });
    const ws = (await get(therapist, c('clinical/children/' + kid)).expect(200)).body;
    expect(ws.childWideReferent).toMatchObject({ displayName: 'Person Name' });
    expect(ws.childWideReferentStatus).toBe('VISIBLE');
    await patch(admin, url, { membershipId: second, version: before.version, reason: 'Stale version' }).expect(409);
    const b = (await patch(admin, url, { membershipId: second, version: detail.version, reason: 'Transfer coordination' }).expect(200)).body;
    expect(b.referentRevision).toBe(2);
    const history = await h.prisma.childReferentHistory.findMany({
      where: { centerId, childId: kid }, orderBy: { revision: 'asc' },
    });
    expect(history.map(x => x.revision)).toEqual([1, 2]);
    expect(history[1]).toMatchObject({ previousMembershipId: first, nextMembershipId: second });
    await expect(h.prisma.$executeRawUnsafe("UPDATE child_referent_history SET reason='bad' WHERE id='" + history[0].id + "'"))
      .rejects.toThrow(/immutable/);
    await expect(h.prisma.$executeRawUnsafe("DELETE FROM child_referent_history WHERE id='" + history[0].id + "'"))
      .rejects.toThrow(/immutable/);
    await post(h, c('children/' + kid + '/assignments/' + assignmentId + '/end'), admin).expect(200);
    expect((await get(admin, c('children/' + kid)).expect(200)).body.referent.membershipId).toBe(second);
    await h.prisma.membership.update({ where: { id: second }, data: { specialties: [] } });
    // The DB trigger is the final guard, even for a direct SQL mutation.
    await expect(h.prisma.$executeRaw`UPDATE "child"
      SET "referent_membership_id" = ${second}::uuid WHERE id = ${kid}::uuid`)
      .rejects.toThrow(/referent must be/);
    const revoked = (await get(admin, c('children/' + kid)).expect(200)).body;
    expect(revoked).toMatchObject({ referentStatus: 'UNAVAILABLE', referent: null });
    await get(coordinator, c('clinical/children/' + kid)).expect(403);
    const cleared = (await patch(admin, url, { membershipId: null, version: revoked.version, reason: 'Clear invalid referent' }).expect(200)).body;
    expect(cleared.referentRevision).toBe(3);
    expect((await get(admin, c('children/' + kid)).expect(200)).body.referent).toBeNull();
    expect(await h.prisma.childReferentHistory.count({ where: { childId: kid } })).toBe(3);
    const otherCenter = (await post(h, '/api/platform/centers', ops, {
      name: 'Referent Invalid Centre', timezone: 'UTC', country: 'France', city: 'Lyon',
      specialties: ['speech'], firstAdmin: { email: 'other-ref@ops.test', displayName: 'External Admin' },
    }).expect(201)).body.id;
    const outsider = await accept('other-ref@ops.test');
    const outsiderMembership = outsider.body.activeContext.membershipId;
    await expect(h.prisma.$executeRaw`UPDATE "child"
      SET "referent_membership_id" = ${outsiderMembership}::uuid WHERE id = ${kid}::uuid`)
      .rejects.toThrow(/referent must be/);
    const actorUserId = (await h.prisma.membership.findUniqueOrThrow({
      where: { id: admin.body.activeContext.membershipId }, select: { userId: true },
    })).userId;
    // The history scope trigger independently rejects wrong-centre inserts.
    await expect(h.prisma.childReferentHistory.create({ data: {
      centerId: otherCenter, childId: kid, actorUserId,
      nextMembershipId: outsiderMembership, reason: 'Forged cross-centre audit',
      revision: 4, createdAt: h.clock.now(),
    } })).rejects.toThrow(/scope mismatch/);
    expect(await h.prisma.childReferentHistory.count({ where: { childId: kid } })).toBe(3);
  });

  it('archives against a simultaneous referent designation without orphaned state or stale history', async () => {
    const therapist = await staff('race-archiving-therapist@ops.test', ['THERAPIST']);
    const kid = (await post(h, c('children'), admin, child()).expect(201)).body.id;
    const membershipId = therapist.body.activeContext.membershipId;
    await post(h, c('children/' + kid + '/assignments'), admin,
      { membershipId, service: 'speech', isLead: true }).expect(201);
    const detail = (await get(admin, c('children/' + kid)).expect(200)).body;
    const [archive, designate] = await Promise.all([
      post(h, c('children/' + kid + '/archive'), admin, { reason: 'Synthetic archive race' }),
      patch(admin, c('children/' + kid + '/referent'), {
        membershipId, version: detail.version, reason: 'Simultaneous designation test',
      }),
    ]);
    expect(archive.status).toBe(200);
    expect([200, 404, 409]).toContain(designate.status);
    const archived = (await get(admin, c('children/' + kid)).expect(200)).body;
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.referent).toBeNull();
    const archivedRow = await h.prisma.child.findUniqueOrThrow({ where: { id: kid } });
    // Do not assert only the operations projection: archived detail() always
    // hides names, even if a broken race leaves a dangling DB designation.
    expect(archivedRow.referentMembershipId).toBeNull();
    expect(archivedRow.referentRevision).toBe(designate.status === 200 ? 2 : 0);
    expect(archived.referentRevision).toBe(archivedRow.referentRevision);
    const history = await h.prisma.childReferentHistory.findMany({
      where: { centerId, childId: kid }, orderBy: { revision: 'asc' },
    });
    expect(history).toHaveLength(archived.referentRevision);
    if (history.length) {
      expect(history.map(x => x.revision)).toEqual([1, 2]);
      expect(history[1]).toMatchObject({
        previousMembershipId: membershipId, nextMembershipId: null,
        reason: 'Child archived',
      });
    }
    // Restoring the child must not resurrect the former designation.
    await post(h, c('children/' + kid + '/restore'), admin).expect(200);
    const restored = (await get(admin, c('children/' + kid)).expect(200)).body;
    expect(restored.referent).toBeNull();
    expect(restored.referentStatus).toBe('NOT_DESIGNATED');
    expect(await h.prisma.careAssignment.count({
      where: { centerId, childId: kid, endedAt: null },
    })).toBe(0);
  });

  it('serializes concurrent referent designation and last assignment ending without deadlock', async () => {
    const therapist = await staff('race-ending-therapist@ops.test', ['THERAPIST']);
    const kid = (await post(h, c('children'), admin, child()).expect(201)).body.id;
    const membershipId = therapist.body.activeContext.membershipId;
    const aid = (await post(h, c('children/' + kid + '/assignments'), admin,
      { membershipId, service: 'speech', isLead: true }).expect(201)).body.id;
    const current = (await get(admin, c('children/' + kid)).expect(200)).body;
    const [ended, designated] = await Promise.all([
      post(h, c('children/' + kid + '/assignments/' + aid + '/end'), admin),
      patch(admin, c('children/' + kid + '/referent'), {
        membershipId, version: current.version, reason: 'Simultaneous assignment termination test',
      }),
    ]);
    expect(ended.status).toBe(200);
    expect([200, 409, 422]).toContain(designated.status);
    const childAfter = (await get(admin, c('children/' + kid)).expect(200)).body;
    expect(childAfter.referent).toBeNull();
    expect(childAfter.referentStatus).toBe('NOT_DESIGNATED');
    const afterRow = await h.prisma.child.findUniqueOrThrow({ where: { id: kid } });
    expect(afterRow.referentMembershipId).toBeNull();
    expect(afterRow.referentRevision).toBe(designated.status === 200 ? 2 : 0);
    expect(childAfter.referentRevision).toBe(afterRow.referentRevision);
    const history = await h.prisma.childReferentHistory.findMany({
      where: { centerId, childId: kid }, orderBy: { revision: 'asc' },
    });
    expect(history.map(x => x.revision)).toEqual(
      designated.status === 200 ? [1, 2] : [],
    );
    if (history.length) expect(history[1]).toMatchObject({
      previousMembershipId: membershipId, nextMembershipId: null,
      reason: 'Last active care assignment ended',
    });
    expect(await h.prisma.careAssignment.count({
      where: { centerId, childId: kid, endedAt: null },
    })).toBe(0);
  });

  it('isolates centers and hides other families', async () => {
    const kid = (await post(h, c('children'), admin, child()).expect(201)).body.id;
    await post(h, '/api/platform/centers', ops, { name: 'Other Ops', timezone: 'UTC', country: 'France', city: 'Lyon', specialties: ['speech'], firstAdmin: { email: 'o@other.test', displayName: 'Other Admin' } }).expect(201);
    const other = (await accept('o@other.test', 'Other Admin')).s;
    for (const p of [`children/${kid}`, 'children', 'dashboard', 'trial', `appointments?from=${at(0, 0)}&to=${at(1, 0)}`]) await get(other, c(p)).expect(404);
    await post(h, c(`children/${kid}/guardians`), other, { displayName: 'Evil', email: 'e@e.test', relationship: 'other' }).expect(404);
    const otherCenter = other.body.activeContext.centerId;
    await post(h, `/api/centers/${otherCenter}/children/${kid}/assignments`, other, { membershipId: admin.body.activeContext.membershipId, service: 'speech' }).expect(404);
    await post(h, `/api/centers/${otherCenter}/appointments`, other, { childId: kid, membershipId: admin.body.activeContext.membershipId, service: 'speech', startsAt: at(1, 9), endsAt: at(1, 10) }).expect(404);
  });
});
