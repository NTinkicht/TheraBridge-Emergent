import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { zonedToUtc } from '../src/common/zoned';
import { expand } from '../src/operations/series.service';
import { Harness, ORIGIN, PASSWORD, Signed, cookieFrom, createUser, makeApp, post, preAuth, resetDb, signIn } from './helpers';

const DAY = 86_400_000;
// Monday 19 Oct 2026, 10:00 in Berlin. Clocks go back on Sunday 25 Oct 2026.
const START = Date.parse('2026-10-19T08:00:00Z');

describe('TB-EM-007 parent experience round 2 + scheduling enhancements (real PostgreSQL)', () => {
  let h: Harness;
  let ops: Signed;
  let admin: Signed;
  let centerId: string;

  const get = (s: Pick<Signed, 'cookie'>, path: string) => h.http().get(path).set('Cookie', s.cookie);
  const patch = (s: Signed, path: string, body: object) => h.http().patch(path).set('Origin', ORIGIN).set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send(body);
  const mails = () => h.app.get(DevMailboxService).list();
  const token = (to: string) => mails().find((m) => m.to === to)?.body.match(/#token=([A-Za-z0-9_-]+)/)?.[1];
  const c = (path: string) => `/api/centers/${centerId}/${path}`;
  async function accept(email: string, name = 'Person Name') {
    const p = await preAuth(h);
    const res = await h.http().post('/api/invitations/accept-new').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send({ token: token(email), displayName: name, password: PASSWORD });
    const t = cookieFrom(res, 'tb_session');
    return { token: t!, cookie: `tb_session=${t}`, csrf: res.body.csrfToken, body: res.body } as Signed;
  }
  async function staff(email: string, roles: string[], specialties: string[] = ['speech']) {
    await post(h, c('invitations'), admin, { email, displayName: 'Staff Person', roles, ...(specialties.length ? { specialties } : {}) }).expect(201);
    return accept(email, `Staff ${email.split('@')[0]}`);
  }
  async function family() {
    const therapist = await staff('thera@ops.test', ['THERAPIST']);
    const tid = therapist.body.activeContext.membershipId;
    const kid = (await post(h, c('children'), admin, { firstName: 'Mila', lastName: 'Stone', preferredName: 'Mimi', dateOfBirth: '2019-04-02', services: ['speech'] }).expect(201)).body.id;
    await post(h, c(`children/${kid}/assignments`), admin, { membershipId: tid, service: 'speech', isLead: true }).expect(201);
    const link = (await post(h, c(`children/${kid}/guardians`), admin, { displayName: 'Rosa Stone', email: 'rosa@family.test', relationship: 'mother', isPrimary: true, invite: true }).expect(201)).body.id;
    const parent = await accept('rosa@family.test', 'Rosa Stone');
    return { therapist, tid, kid, link, parent };
  }

  beforeAll(async () => {
    h = await makeApp({ DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' });
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(async () => {
    h.clock.t = START;
    await resetDb(h.prisma);
    mails().length = 0;
    const u = await createUser(h.prisma, 'ops@ops.therabridge.test');
    await h.prisma.platformRoleAssignment.create({ data: { userId: u.id, source: 'synthetic_seed', reason: 'test' } });
    ops = await signIn(h, u.email);
    centerId = (await post(h, '/api/platform/centers', ops, { name: 'Ops Center', timezone: 'Europe/Berlin', country: 'Germany', city: 'Berlin', specialties: ['speech'], firstAdmin: { email: 'lead@ops.test', displayName: 'Lead Admin' } }).expect(201)).body.id;
    admin = await accept('lead@ops.test', 'Lead Admin');
  });

  it('center time zone conversion handles daylight-saving transitions and recurrence expansion', () => {
    expect(zonedToUtc('2026-10-20', '09:00', 'Europe/Berlin').toISOString()).toBe('2026-10-20T07:00:00.000Z');
    expect(zonedToUtc('2026-10-27', '09:00', 'Europe/Berlin').toISOString()).toBe('2026-10-27T08:00:00.000Z');
    expect(zonedToUtc('2027-03-28', '02:30', 'Europe/Berlin').toISOString()).toBe('2027-03-28T01:30:00.000Z');
    expect(zonedToUtc('2026-10-25', '02:30', 'Europe/Berlin').toISOString()).toBe('2026-10-25T01:30:00.000Z');
    expect(zonedToUtc('2026-11-01', '09:00', 'America/New_York').toISOString()).toBe('2026-11-01T14:00:00.000Z');
    expect(expand('2026-10-20', '2026-11-30', [2, 4], 2)).toEqual(['2026-10-20', '2026-10-22', '2026-11-03', '2026-11-05', '2026-11-17', '2026-11-19']);
    expect(expand('2026-10-20', '2027-04-20', [1, 2, 3, 4, 5], 1, 4)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
  });

  it('recurring series: assignment/specialty filtering, conflicts, DST-stable times, exceptions, this-and-following, cancellation', async () => {
    const { therapist, tid, kid } = await family();
    const plain = await staff('plain@ops.test', ['THERAPIST'], []);
    expect((await post(h, c(`children/${kid}/assignments`), admin, { membershipId: plain.body.activeContext.membershipId, service: 'speech' }).expect(422)).body.message).toMatch(/specialty/);
    const series = { childId: kid, membershipId: tid, service: 'speech', startDate: '2026-10-20', startTime: '09:00', durationMinutes: 45, weekdays: [2], intervalWeeks: 1, count: 3, room: 'Room 2' };
    await post(h, c('series'), therapist, series).expect(403);
    await post(h, c('series'), admin, { ...series, startDate: '2026-10-12' }).expect(422);
    await post(h, c('series'), admin, { ...series, count: undefined, untilDate: '2027-06-01' }).expect(422);
    await post(h, c('series'), admin, { ...series, membershipId: plain.body.activeContext.membershipId }).expect(422);
    await post(h, c('appointments'), admin, { childId: kid, membershipId: tid, service: 'speech', startsAt: '2026-11-03T08:00:00.000Z', endsAt: '2026-11-03T08:45:00.000Z' }).expect(201);

    const clash = await post(h, c('series'), admin, series).expect(409);
    expect(clash.body.conflicts).toEqual([{ date: '2026-11-03', reason: expect.stringMatching(/therapist already/) }]);
    const made = await post(h, c('series'), admin, { ...series, skipConflicts: true }).expect(201);
    expect(made.body).toMatchObject({ created: 2, skipped: [{ date: '2026-11-03' }] });
    const detail = await get(admin, c(`series/${made.body.id}`)).expect(200);
    // 09:00 local both weeks: 07:00Z in summer time, 08:00Z after clocks go back.
    expect(detail.body.occurrences.map((o: { startsAt: string }) => o.startsAt)).toEqual(['2026-10-20T07:00:00.000Z', '2026-10-27T08:00:00.000Z']);
    await get(therapist, c(`series/${made.body.id}`)).expect(200);
    await get(plain, c(`series/${made.body.id}`)).expect(404);

    // Moving one visit makes it an exception that "this and following" leaves alone.
    const [first, second] = detail.body.occurrences;
    await patch(admin, c(`appointments/${second.id}`), { startsAt: '2026-10-28T08:00:00.000Z', endsAt: '2026-10-28T08:45:00.000Z', version: 1 }).expect(200);
    await patch(admin, c(`series/${made.body.id}`), { fromDate: '2026-10-20', startTime: '10:00', version: 1, membershipId: plain.body.activeContext.membershipId }).expect(422);
    expect((await patch(admin, c(`series/${made.body.id}`), { fromDate: '2026-10-20', startTime: '10:00', version: 1 }).expect(200)).body).toEqual({ updated: 1 });
    await patch(admin, c(`series/${made.body.id}`), { fromDate: '2026-10-20', startTime: '11:00', version: 1 }).expect(409);
    const after = await get(admin, c(`series/${made.body.id}`)).expect(200);
    expect(after.body.occurrences.find((o: { id: string }) => o.id === first.id)).toMatchObject({ startsAt: '2026-10-20T08:00:00.000Z', isException: false });
    expect(after.body.occurrences.find((o: { id: string }) => o.id === second.id)).toMatchObject({ startsAt: '2026-10-28T08:00:00.000Z', isException: true });

    const list = await get(admin, c(`appointments?from=2026-10-19T00:00:00.000Z&to=2026-11-09T00:00:00.000Z&childId=${kid}`)).expect(200);
    expect(list.body.items).toHaveLength(3);
    expect(list.body.items.filter((a: { seriesId: string | null }) => a.seriesId)).toHaveLength(2);

    await post(h, c(`series/${made.body.id}/cancel`), admin, { fromDate: '2026-10-20' }).expect(400);
    expect((await post(h, c(`series/${made.body.id}/cancel`), admin, { fromDate: '2026-10-20', reason: 'Family moving away' }).expect(200)).body).toEqual({ cancelled: 2 });
    expect((await get(admin, c(`series/${made.body.id}`)).expect(200)).body.status).toBe('ENDED');
    await post(h, c(`series/${made.body.id}/cancel`), admin, { fromDate: '2026-10-20', reason: 'again please' }).expect(409);
    const events = (await h.prisma.centerEvent.findMany({ where: { centerId }, select: { type: true } })).map((e) => e.type);
    expect(events).toEqual(expect.arrayContaining(['series.scheduled', 'series.updated', 'series.cancelled', 'appointment.rescheduled']));
    // The parent was told about the near-term changes through the restricted outbox.
    expect(mails().filter((m) => m.to === 'rosa@family.test').map((m) => m.subject)).toEqual(expect.arrayContaining([expect.stringMatching(/^Appointment moved/), expect.stringMatching(/^Appointment cancelled/)]));
  });

  it('reminders: 24-hour outbox reminders are idempotent, respect opt-out, and the family sees status and attendance history', async () => {
    const { therapist, tid, kid, parent } = await family();
    const book = (startsAt: string, endsAt: string) => post(h, c('appointments'), admin, { childId: kid, membershipId: tid, service: 'speech', startsAt, endsAt, room: 'Room 4' }).expect(201).then((r) => r.body.id as string);
    const a1 = await book('2026-10-20T07:00:00.000Z', '2026-10-20T07:45:00.000Z');
    const a2 = await book('2026-10-23T07:00:00.000Z', '2026-10-23T07:45:00.000Z');
    await post(h, '/api/platform/reminders/run', admin).expect(403);
    mails().length = 0;
    expect((await post(h, '/api/platform/reminders/run', ops).expect(200)).body).toEqual({ sent: 1 });
    expect((await post(h, '/api/platform/reminders/run', ops).expect(200)).body).toEqual({ sent: 0 });
    const mail = mails().find((m) => m.to === 'rosa@family.test')!;
    expect(mail.subject).toMatch(/^Reminder: appointment tomorrow · Ops Center/);
    expect(mail.body).toMatch(/Mimi’s Speech therapy with Staff thera on Tuesday, October 20 at 9:00 AM \(Europe\/Berlin time\)\. Room: Room 4\./);
    expect(mail.body).not.toMatch(/token|password|2019/);
    const day = await get(admin, c('appointments?from=2026-10-19T00:00:00.000Z&to=2026-10-26T00:00:00.000Z')).expect(200);
    expect(day.body.items.find((a: { id: string }) => a.id === a1).reminderSentAt).toBeTruthy();

    // Opt-out is per guardian and per child, and only for the guardian's own link.
    const stranger = await staff('stranger@ops.test', ['COORDINATOR'], []);
    await post(h, c('family/preferences'), stranger, { childId: kid, reminders: false }).expect(403);
    expect((await post(h, c('family/preferences'), parent, { childId: kid, reminders: false }).expect(200)).body).toEqual({ childId: kid, remindersEnabled: false });
    h.clock.advance(3 * DAY);
    ops = await signIn(h, 'ops@ops.therabridge.test');
    admin = await signIn(h, 'lead@ops.test');
    const rosa = await signIn(h, 'rosa@family.test');
    expect((await post(h, '/api/platform/reminders/run', ops).expect(200)).body).toEqual({ sent: 0 });
    await post(h, c('family/preferences'), rosa, { childId: kid, reminders: true }).expect(200);
    expect((await post(h, '/api/platform/reminders/run', ops).expect(200)).body).toEqual({ sent: 1 });

    // Attendance and cancellation show clearly to the family; staff reasons stay internal.
    const t2 = await signIn(h, 'thera@ops.test');
    await post(h, c(`appointments/${a1}/status`), t2, { status: 'COMPLETED' }).expect(200);
    await post(h, c(`appointments/${a2}/status`), admin, { status: 'CANCELLED', reason: 'Therapist training day' }).expect(200);
    void therapist;
    void parent;
    const fam = await get(rosa, c('family')).expect(200);
    const kidView = fam.body.children[0];
    expect(kidView.remindersEnabled).toBe(true);
    expect(kidView.history).toEqual([expect.objectContaining({ id: a1, status: 'COMPLETED' })]);
    expect(kidView.upcoming).toEqual([expect.objectContaining({ id: a2, status: 'CANCELLED', room: null })]);
    expect(kidView.attendance).toEqual({ attended: 1, noShow: 0, cancelled: 0, days: 120 });
    expect(JSON.stringify(fam.body)).not.toMatch(/training day|email|dateOfBirth/);
  });

  it('messages: guardian ↔ care team, role scoping, close/reopen, immediate revocation and tenant isolation', async () => {
    const { therapist, kid, link, parent } = await family();
    const other = await staff('other@ops.test', ['THERAPIST']);
    const supervisor = await staff('super@ops.test', ['CLINICAL_SUPERVISOR'], []);
    await post(h, c('threads'), parent, { childId: kid, category: 'clinical', subject: 'Hello', body: 'Hi' }).expect(400);
    await post(h, c('threads'), parent, { childId: kid, category: 'scheduling', subject: 'Hi', body: 'x'.repeat(2001) }).expect(400);
    const t = (await post(h, c('threads'), parent, { childId: kid, category: 'scheduling', subject: 'Running late on Tuesday', body: 'We may arrive ten minutes late.' }).expect(201)).body.id;

    const inbox = await get(admin, c('threads')).expect(200);
    expect(inbox.body).toMatchObject({ unread: 1, items: [{ id: t, subject: 'Running late on Tuesday', lastFrom: 'FAMILY', unread: true, child: 'Mimi Stone' }] });
    expect((await get(therapist, c('threads')).expect(200)).body.items).toHaveLength(1);
    expect((await get(other, c('threads')).expect(200)).body.items).toHaveLength(0);
    await get(other, c(`threads/${t}`)).expect(404);
    await post(h, c(`threads/${t}/messages`), other, { body: 'sneaky' }).expect(404);
    expect((await get(supervisor, c('threads')).expect(200)).body.items).toHaveLength(1);
    await post(h, c('threads'), other, { childId: kid, category: 'other', subject: 'Not mine', body: 'x' }).expect(404);

    h.clock.advance(60_000);
    const replied = await post(h, c(`threads/${t}/messages`), therapist, { body: 'No problem, see you then.' }).expect(201);
    expect(replied.body.messages.map((m: { authorKind: string; mine: boolean }) => [m.authorKind, m.mine])).toEqual([['FAMILY', false], ['STAFF', true]]);
    expect((await get(admin, c('threads')).expect(200)).body.unread).toBe(1);
    const famInbox = await get(parent, c('threads')).expect(200);
    expect(famInbox.body.items[0]).toMatchObject({ unread: true, lastFrom: 'STAFF', preview: 'No problem, see you then.' });
    const opened = await get(parent, c(`threads/${t}`)).expect(200);
    expect(opened.body).toMatchObject({ canManage: false, messages: [{ author: 'Rosa Stone' }, { author: 'Staff thera' }] });
    expect((await get(parent, c('threads')).expect(200)).body.unread).toBe(0);

    await post(h, c(`threads/${t}/close`), therapist, {}).expect(403);
    await post(h, c(`threads/${t}/close`), admin, {}).expect(200);
    expect((await post(h, c(`threads/${t}/messages`), parent, { body: 'One more thing' }).expect(409)).body.message).toMatch(/closed/);
    await post(h, c(`threads/${t}/reopen`), admin, {}).expect(200);
    await post(h, c(`threads/${t}/messages`), parent, { body: 'One more thing' }).expect(201);
    await expect(h.prisma.$executeRawUnsafe(`UPDATE "message" SET body = 'edited'`)).rejects.toThrow(/append-only/);

    // Another center cannot reach the thread; removing the guardian ends access immediately.
    await post(h, '/api/platform/centers', ops, { name: 'Other Ops', timezone: 'UTC', country: 'France', city: 'Lyon', specialties: ['speech'], firstAdmin: { email: 'o@other.test', displayName: 'Other Admin' } }).expect(201);
    const outsider = await accept('o@other.test', 'Other Admin');
    await get(outsider, c(`threads/${t}`)).expect(404);
    await get(outsider, `/api/centers/${outsider.body.activeContext.centerId}/threads/${t}`).expect(404);
    await post(h, c(`children/${kid}/guardians/${link}/remove`), admin, { reason: 'Custody update' }).expect(200);
    expect((await get(parent, c('threads')).expect(200)).body.items).toHaveLength(0);
    await get(parent, c(`threads/${t}`)).expect(404);
    await post(h, c(`threads/${t}/messages`), parent, { body: 'still here?' }).expect(404);
    await post(h, c('threads'), parent, { childId: kid, category: 'other', subject: 'New one', body: 'x' }).expect(404);
    const events = (await h.prisma.centerEvent.findMany({ where: { centerId }, select: { type: true, meta: true } }));
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['message.thread_opened', 'message.sent', 'message.thread_closed', 'message.thread_reopened']));
    expect(JSON.stringify(events)).not.toMatch(/ten minutes late|One more thing/);
  });
});
