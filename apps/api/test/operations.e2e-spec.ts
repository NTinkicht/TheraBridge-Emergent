import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { NoticesService } from '../src/operations/notices.service';
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
    expect(parent.body.permissions).toEqual(['family.portal.read', 'family.preferences.update', 'center.messages.use', 'family.activities.read', 'family.progress.demo', 'family.practice.read', 'family.practice.record', 'family.home_plan_request.read', 'family.home_plan_request.create']);
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
    const outsiderMembership = outsider.s.body.activeContext.membershipId;
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
    if (history.length) {
      expect(history[1]).toMatchObject({
        previousMembershipId: membershipId, nextMembershipId: null,
      });
      // Either serialized path may clear the same referent: the original
      // last-assignment ending path or the shared therapist lifecycle path.
      // Both require a versioned history entry and a null final referent.
      expect(['Last active care assignment ended', 'Therapist assignment ended']).toContain(history[1].reason);
    }
    expect(await h.prisma.careAssignment.count({
      where: { centerId, childId: kid, endedAt: null },
    })).toBe(0);
  });

  it('M2-H04 Codex P2: therapist discovery pages beyond 200, filters specialty before the cap and resolves exact assigned IDs', async () => {
    // Direct synthetic fixtures bypass the three-seat trial onboarding limit:
    // this tests directory scalability and tenant/specialty query behavior.
    const users = await h.prisma.user.createManyAndReturn({ data: Array.from({ length: 205 }, (_, i) => ({
      email: `directory-${i}@ops.test`, emailNormalized: `directory-${i}@ops.test`,
      displayName: `${i < 200 ? 'Alpha Occupational' : 'Zulu Speech'} ${String(i).padStart(3, '0')}`,
    })) });
    const memberships = await h.prisma.membership.createManyAndReturn({ data: users.map((u) => ({
      userId: u.id, centerId, status: 'ACTIVE' as const,
      specialties: [u.displayName.startsWith('Zulu') ? 'speech' : 'occupational'], responsibilities: [],
    })) });
    await h.prisma.roleAssignment.createMany({ data: memberships.map(m => ({ membershipId: m.id, role: 'THERAPIST' as const })) });
    const first = (await get(admin, c('therapists?limit=100')).expect(200)).body;
    expect(first.items).toHaveLength(100);
    expect(first.hasMore).toBe(true);
    expect(first.nextOffset).toBe(100);
    const last = (await get(admin, c('therapists?offset=200&limit=100')).expect(200)).body;
    expect(last.items).toHaveLength(5);
    expect(last.hasMore).toBe(false);
    const speech = (await get(admin, c('therapists?service=speech')).expect(200)).body;
    expect(speech.items).toHaveLength(5);
    expect(speech.items.every((t: { specialties: string[] }) => t.specialties.includes('speech'))).toBe(true);
    const target = speech.items[4].membershipId;
    const exact = (await get(admin, c(`therapists?ids=${target}`)).expect(200)).body;
    expect(exact.items.map((t: { membershipId: string }) => t.membershipId)).toEqual([target]);
    const searched = (await get(admin, c('therapists?service=speech&search=Zulu%20Speech%20204')).expect(200)).body;
    expect(searched.items).toHaveLength(1);
    await get(admin, c('therapists?offset=-1')).expect(400);
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

  it('M2-H05 Codex P2: room-only series update preserves a legacy later-fold booked instant', async () => {
    await h.prisma.center.update({ where: { id: centerId }, data: { timezone: 'Europe/Paris' } });
    const therapist = await staff('fold-therapist@ops.test', ['THERAPIST']);
    const membershipId = therapist.body.activeContext.membershipId as string;
    const kid = (await post(h, c('children'), admin, child()).expect(201)).body.id as string;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId, service: 'speech' }).expect(201);
    // Create a valid series, then model an already-booked fall-back occurrence
    // from the legacy later-fold conversion policy (01:30Z, not 00:30Z).
    const d = new Date(h.clock.now().getTime() + 2 * DAY).toISOString().slice(0, 10);
    const weekday = ((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const seriesId = (await post(h, c('series'), admin, {
      childId: kid, membershipId, service: 'speech', startDate: d,
      startTime: '10:00', durationMinutes: 60, weekdays: [weekday], intervalWeeks: 1, count: 1,
    }).expect(201)).body.id as string;
    const existing = await h.prisma.appointment.findFirstOrThrow({ where: { seriesId } });
    const occurrenceDate = new Date('2027-10-31T00:00:00Z');
    const laterFoldInstant = new Date('2027-10-31T01:30:00Z');
    await h.prisma.appointmentSeries.update({ where: { id: seriesId }, data: {
      startTime: '02:30', startDate: occurrenceDate, untilDate: occurrenceDate,
    } });
    await h.prisma.appointment.update({ where: { id: existing.id }, data: {
      startsAt: laterFoldInstant, endsAt: new Date('2027-10-31T02:30:00Z'), occurrenceDate,
    } });
    await patch(admin, c(`series/${seriesId}`), {
      fromDate: '2027-10-31', room: 'Updated room only', version: 1,
    }).expect(200);
    const saved = await h.prisma.appointment.findUniqueOrThrow({ where: { id: existing.id } });
    expect(saved.startsAt.toISOString()).toBe('2027-10-31T01:30:00.000Z');
    expect(saved.endsAt.toISOString()).toBe('2027-10-31T02:30:00.000Z');
    expect(saved.room).toBe('Updated room only');
    expect(saved.version).toBe(2);
    // An explicitly changed wall time DOES use the new earlier-fold policy.
    await patch(admin, c(`series/${seriesId}`), {
      fromDate: '2027-10-31', startTime: '02:45', version: 2,
    }).expect(200);
    const retimed = await h.prisma.appointment.findUniqueOrThrow({ where: { id: existing.id } });
    expect(retimed.startsAt.toISOString()).toBe('2027-10-31T00:45:00.000Z');
    expect(retimed.endsAt.toISOString()).toBe('2027-10-31T01:45:00.000Z');
  });

  it('M2-H04: therapist suspension atomically ends assigned series, visits and referent; notifies a connected guardian', async () => {
    const therapist = await staff('cascade-therapist@ops.test', ['THERAPIST']);
    const memberId = therapist.body.activeContext.membershipId as string;
    const kid = (await post(h, c('children'), admin, child()).expect(201)).body.id as string;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: memberId, service: 'speech', isLead: true }).expect(201);
    const detail = (await get(admin, c(`children/${kid}`)).expect(200)).body;
    await patch(admin, c(`children/${kid}/referent`), { membershipId: memberId, version: detail.version, reason: 'Current care contact' }).expect(200);
    await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Guardian Notice', email: 'cascade-parent@ops.test', relationship: 'parent', invite: true }).expect(201);
    await accept('cascade-parent@ops.test', 'Guardian Notice');
    const d = new Date(h.clock.now().getTime() + 2 * DAY).toISOString().slice(0, 10);
    const weekday = ((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const seriesId = (await post(h, c('series'), admin, { childId: kid, membershipId: memberId, service: 'speech', startDate: d, startTime: '10:00', durationMinutes: 60, weekdays: [weekday], intervalWeeks: 1, count: 3 }).expect(201)).body.id as string;
    expect(await h.prisma.appointment.count({ where: { seriesId, status: 'SCHEDULED' } })).toBe(3);
    const original = await h.prisma.appointment.findMany({ where: { seriesId }, orderBy: { startsAt: 'asc' } });
    await patch(admin, c(`series/${seriesId}`), { fromDate: d, startTime: '11:00', version: 1 }).expect(200);
    const shifted = await h.prisma.appointment.findMany({ where: { seriesId }, orderBy: { startsAt: 'asc' } });
    expect(shifted.map((a) => a.startsAt.getTime() - original.find((o) => o.id === a.id)!.startsAt.getTime())).toEqual([3_600_000, 3_600_000, 3_600_000]);
    expect(shifted.map((a) => a.version)).toEqual([2, 2, 2]);
    await post(h, c(`staff/${memberId}/suspend`), admin, { reason: 'Safety access suspension' }).expect(200);
    expect(await h.prisma.careAssignment.count({ where: { centerId, childId: kid, membershipId: memberId, endedAt: null } })).toBe(0);
    expect((await h.prisma.appointmentSeries.findUniqueOrThrow({ where: { id: seriesId } })).status).toBe('ENDED');
    expect(await h.prisma.appointment.count({ where: { seriesId, status: 'SCHEDULED' } })).toBe(0);
    expect((await h.prisma.child.findUniqueOrThrow({ where: { id: kid } })).referentMembershipId).toBeNull();
    expect(await h.prisma.childReferentHistory.count({ where: { childId: kid } })).toBe(2);
    expect(h.app.get(DevMailboxService).list().filter((m) => m.to === 'cascade-parent@ops.test' && m.subject.includes('Appointment cancelled')).length).toBeGreaterThan(0);
    // Active-only uniqueness: the same clinician may be assigned historically
    // again after administrator reactivation, but old series stay ended.
    await post(h, c(`staff/${memberId}/reactivate`), admin).expect(200);
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: memberId, service: 'speech' }).expect(201);
  });

  it('M2-H04: audit entries are immutable in PostgreSQL, not merely via API conventions', async () => {
    await post(h, c('children'), admin, child()).expect(201);
    const row = await h.prisma.auditEvent.findFirstOrThrow({ where: { type: 'child.registered' } });
    await expect(h.prisma.$executeRaw`UPDATE audit_event SET type = 'tampered' WHERE id = ${row.id}`).rejects.toThrow(/append-only/);
    await expect(h.prisma.$executeRaw`DELETE FROM audit_event WHERE id = ${row.id}`).rejects.toThrow(/append-only/);
  });

  it('M2-H04: a repeated 24-hour reminder sweep sends only one message and records one row', async () => {
    const therapist = await staff('sweep-therapist@ops.test', ['THERAPIST']);
    const kid = (await post(h, c('children'), admin, child()).expect(201)).body.id as string;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: therapist.body.activeContext.membershipId, service: 'speech' }).expect(201);
    await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Reminder Recipient', email: 'sweep-parent@ops.test', relationship: 'parent', invite: true }).expect(201);
    await accept('sweep-parent@ops.test', 'Reminder Recipient');
    const reminderStart = new Date(h.clock.now().getTime() + 12 * 3_600_000);
    const appointmentId = (await post(h, c('appointments'), admin, { childId: kid,
      membershipId: therapist.body.activeContext.membershipId, service: 'speech', startsAt: reminderStart.toISOString(), endsAt: new Date(reminderStart.getTime() + 3_600_000).toISOString() }).expect(201)).body.id as string;
    const notices = h.app.get(NoticesService);
    expect((await notices.runDue(h.clock.now())).sent).toBe(1);
    expect((await notices.runDue(h.clock.now())).sent).toBe(0);
    expect(await h.prisma.appointmentNotice.count({ where: { appointmentId, kind: 'reminder_24h' } })).toBe(1);
    expect(h.app.get(DevMailboxService).list().filter((m) => m.to === 'sweep-parent@ops.test' && m.subject.includes('Reminder:')).length).toBe(1);
  });

  it('M2-H04 review P2: transient outbox failure releases all undelivered reminder reservations for retry', async () => {
    const therapist = await staff('retry-therapist@ops.test', ['THERAPIST']);
    const kid = (await post(h, c('children'), admin, child()).expect(201)).body.id as string;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: therapist.body.activeContext.membershipId, service: 'speech' }).expect(201);
    await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Retry Recipient', email: 'retry-parent@ops.test', relationship: 'parent', invite: true }).expect(201);
    await accept('retry-parent@ops.test', 'Retry Recipient');
    for (const hours of [12, 15]) {
      const start = new Date(h.clock.now().getTime() + hours * 3_600_000);
      await post(h, c('appointments'), admin, { childId: kid, membershipId: therapist.body.activeContext.membershipId,
        service: 'speech', startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3_600_000).toISOString() }).expect(201);
    }
    const mail = h.app.get(DevMailboxService);
    const failure = jest.spyOn(mail, 'send').mockImplementationOnce(() => { throw new Error('Synthetic outbox temporarily unavailable'); });
    const notices = h.app.get(NoticesService);
    try {
      await expect(notices.runDue(h.clock.now())).rejects.toThrow(/outbox temporarily unavailable/);
      expect(await h.prisma.appointmentNotice.count({ where: { kind: 'reminder_24h' } })).toBe(0);
      expect((await notices.runDue(h.clock.now())).sent).toBe(2);
      expect((await notices.runDue(h.clock.now())).sent).toBe(0);
      expect(await h.prisma.appointmentNotice.count({ where: { kind: 'reminder_24h' } })).toBe(2);
      expect(mail.list().filter(m => m.to === 'retry-parent@ops.test' && m.subject.includes('Reminder:'))).toHaveLength(2);
    } finally { failure.mockRestore(); }
  });

  it('M2-H04: removing one therapist specialty preserves unrelated assignments and referent', async () => {
    const therapist = await staff('specialty-therapist@ops.test', ['THERAPIST']);
    const memberId = therapist.body.activeContext.membershipId as string;
    await patch(admin, c(`staff/${memberId}`), { specialties: ['speech', 'physical'] }).expect(200);
    const kid = (await post(h, c('children'), admin, child({ services: ['speech', 'physical'] })).expect(201)).body.id as string;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: memberId, service: 'speech' }).expect(201);
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: memberId, service: 'physical' }).expect(201);
    const before = (await get(admin, c(`children/${kid}`)).expect(200)).body;
    await patch(admin, c(`children/${kid}/referent`), { membershipId: memberId, version: before.version, reason: 'Assigned coordinator' }).expect(200);
    const speechId = (await post(h, c('appointments'), admin, { childId: kid, membershipId: memberId, service: 'speech', startsAt: at(1, 9), endsAt: at(1, 10) }).expect(201)).body.id;
    const physicalId = (await post(h, c('appointments'), admin, { childId: kid, membershipId: memberId, service: 'physical', startsAt: at(1, 10), endsAt: at(1, 11) }).expect(201)).body.id;
    await patch(admin, c(`staff/${memberId}`), { specialties: ['speech'] }).expect(200);
    expect((await h.prisma.appointment.findUniqueOrThrow({ where: { id: speechId } })).status).toBe('SCHEDULED');
    expect((await h.prisma.appointment.findUniqueOrThrow({ where: { id: physicalId } })).status).toBe('CANCELLED');
    expect(await h.prisma.careAssignment.count({ where: { centerId, childId: kid, membershipId: memberId, endedAt: null } })).toBe(1);
    expect((await h.prisma.child.findUniqueOrThrow({ where: { id: kid } })).referentMembershipId).toBe(memberId);
  });
});
