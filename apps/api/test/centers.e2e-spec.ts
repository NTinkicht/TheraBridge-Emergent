import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { Harness, ORIGIN, PASSWORD, Signed, cookieFrom, createUser, freshPassword, makeApp, post, preAuth, resetDb, signIn } from './helpers';

const LOCAL = { DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' };
const DAY = 24 * 3_600_000;

describe('TB-EM-003/004 center provisioning and staff onboarding (real PostgreSQL)', () => {
  let h: Harness;
  let ops: Signed;
  let opsId: string;

  const get = (s: Pick<Signed, 'cookie'>, path: string) => h.http().get(path).set('Cookie', s.cookie);
  const patch = (s: Pick<Signed, 'cookie' | 'csrf'>, path: string, body: object) =>
    h.http().patch(path).set('Origin', ORIGIN).set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send(body);
  const mailbox = () => h.app.get(DevMailboxService);
  const lastToken = (to: string) => {
    const mail = mailbox().list().find((m) => m.to === to);
    return mail?.body.match(/#token=([A-Za-z0-9_-]+)/)?.[1];
  };
  const centerBody = (over: object = {}) => ({
    name: 'Lakeside Pediatric Therapy', timezone: 'Europe/Berlin', country: 'Germany', city: 'Berlin', specialties: ['speech', 'occupational'],
    firstAdmin: { email: 'lead@lakeside.therabridge.test', displayName: 'Ana Lead' }, ...over,
  });
  async function publicPost(path: string, body: object, ip?: string) {
    const p = await preAuth(h);
    const r = h.http().post(path).set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token);
    if (ip) r.set('X-Forwarded-For', ip);
    return r.send(body);
  }
  async function acceptNew(token: string, displayName = 'New Person', password = PASSWORD) {
    const res = await publicPost('/api/invitations/accept-new', { token, displayName, password });
    const t = cookieFrom(res, 'tb_session');
    return { res, s: t ? ({ token: t, cookie: `tb_session=${t}`, csrf: res.body.csrfToken, body: res.body } as Signed) : null };
  }
  async function provision(over: object = {}) {
    const res = await post(h, '/api/platform/centers', ops, centerBody(over)).expect(201);
    return res.body as { id: string; slug: string; adminInvitations: { id: string; status: string }[] };
  }
  async function activeAdmin() {
    const c = await provision();
    const { s } = await acceptNew(lastToken('lead@lakeside.therabridge.test')!, 'Ana Lead');
    return { centerId: c.id, admin: s! };
  }
  async function inviteAndJoin(centerId: string, admin: Signed, email: string, roles: string[], extra: object = {}) {
    const inv = await post(h, `/api/centers/${centerId}/invitations`, admin, { email, displayName: 'Staff Person', roles, ...extra }).expect(201);
    const { s } = await acceptNew(lastToken(email)!, 'Staff Person');
    return { invitationId: inv.body.id as string, s: s!, membershipId: s!.body.activeContext.membershipId as string };
  }

  beforeAll(async () => {
    h = await makeApp(LOCAL);
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(async () => {
    await resetDb(h.prisma);
    mailbox().list().length = 0;
    const u = await createUser(h.prisma, 'ops@centers.therabridge.test');
    opsId = u.id;
    await h.prisma.platformRoleAssignment.create({ data: { userId: u.id, source: 'synthetic_seed', reason: 'test' } });
    ops = await signIn(h, u.email);
  });

  describe('provisioning', () => {
    it('creates a center directly with a unique slug, setup checklist, history, audit and a first-admin invitation', async () => {
      const c = await provision();
      expect(c.slug).toBe('lakeside-pediatric-therapy');
      expect(c.adminInvitations).toHaveLength(1);
      expect(c.adminInvitations[0]).toMatchObject({ status: 'PENDING', email: 'lead@lakeside.therabridge.test' });
      expect(JSON.stringify(c)).not.toMatch(/tokenHash|token_hash|#token=/);
      expect(lastToken('lead@lakeside.therabridge.test')).toBeDefined();
      const row = await h.prisma.center.findUniqueOrThrow({ where: { id: c.id } });
      expect(row).toMatchObject({ source: 'DIRECT', createdById: opsId, country: 'Germany', status: 'ACTIVE' });
      const events = await h.prisma.centerEvent.findMany({ where: { centerId: c.id }, orderBy: { id: 'asc' } });
      expect(events.map((e) => e.type)).toEqual(['center.created', 'invitation.created']);
      expect(await h.prisma.auditEvent.count({ where: { type: 'center.provisioned' } })).toBe(1);
      const list = await get(ops, '/api/platform/centers?q=lakeside').expect(200);
      expect(list.body.items[0]).toMatchObject({ slug: 'lakeside-pediatric-therapy', adminStatus: 'INVITED', setup: { done: 0, total: 4 } });
    });

    it('prevents duplicate names and explicit slugs, and auto-suffixes generated slugs', async () => {
      await provision();
      await post(h, '/api/platform/centers', ops, centerBody({ name: 'LAKESIDE pediatric therapy', firstAdmin: { email: 'x@a.test', displayName: 'X Y' } })).expect(409);
      await post(h, '/api/platform/centers', ops, centerBody({ name: 'Other Center', slug: 'lakeside-pediatric-therapy', firstAdmin: { email: 'x@a.test', displayName: 'X Y' } })).expect(409);
      await h.prisma.center.create({ data: { slug: 'harbor-house', name: 'Old Harbor', timezone: 'UTC' } });
      const c = await provision({ name: 'Harbor House', firstAdmin: { email: 'h@a.test', displayName: 'H A' } });
      expect(c.slug).toBe('harbor-house-2');
      await post(h, '/api/platform/centers', ops, centerBody({ name: 'Bad', slug: 'Bad Slug!' })).expect(400);
      await post(h, '/api/platform/centers', ops, centerBody({ name: 'No admin', firstAdmin: undefined })).expect(400);
      expect(await h.prisma.center.count()).toBe(3);
    });

    it('provisions an approved application exactly once and records a provisioned application event', async () => {
      const app = await h.prisma.centerApplication.create({
        data: {
          reference: 'APP-TEST22', organizationName: 'Riverbend Kids', country: 'Canada', city: 'Ottawa', timezone: 'America/Toronto', contactName: 'Rae Bend',
          contactEmail: 'rae@riverbend.test', contactEmailNorm: 'rae@riverbend.test', specialties: ['speech'], therapistEstimate: 3, childEstimate: 20,
          submittedAt: new Date(), status: 'APPROVED', decidedAt: new Date(), decidedById: opsId, decisionRationale: 'Meets all criteria for onboarding.',
        },
      });
      const pending = await h.prisma.centerApplication.create({
        data: { reference: 'APP-TEST33', organizationName: 'Pending Co', country: 'Canada', city: 'Ottawa', timezone: 'America/Toronto', contactName: 'P C', contactEmail: 'p@c.test', contactEmailNorm: 'p@c.test', specialties: ['speech'], therapistEstimate: 1, childEstimate: 1, submittedAt: new Date() },
      });
      await post(h, '/api/platform/centers', ops, centerBody({ name: 'Pending Co', applicationId: pending.id })).expect(409);
      const c = await provision({ name: 'Riverbend Kids', applicationId: app.id, firstAdmin: { email: 'rae@riverbend.test', displayName: 'Rae Bend' } });
      await post(h, '/api/platform/centers', ops, centerBody({ name: 'Riverbend Again', applicationId: app.id })).expect(409);
      const detail = await get(ops, `/api/platform/applications/${app.id}`).expect(200);
      expect(detail.body.provisioning).toMatchObject({ status: 'PROVISIONED', center: { id: c.id } });
      expect(detail.body.events.map((e: { type: string }) => e.type)).toContain('provisioned');
      expect((await h.prisma.center.findUniqueOrThrow({ where: { id: c.id } })).source).toBe('APPLICATION');
    });

    it('is platform-only: center admins and anonymous users are denied', async () => {
      const { admin } = await activeAdmin();
      await post(h, '/api/platform/centers', admin, centerBody({ name: 'Sneaky' })).expect(403);
      await get(admin, '/api/platform/centers').expect(403);
      await h.http().get('/api/platform/centers').expect(401);
    });
  });

  describe('first administrator invitation lifecycle', () => {
    it('resend rotates the secret, revoke blocks acceptance, replace issues a new invitation to another person', async () => {
      const c = await provision();
      const invId = c.adminInvitations[0].id;
      const first = lastToken('lead@lakeside.therabridge.test')!;
      await post(h, `/api/platform/centers/${c.id}/admin-invitations/${invId}/resend`, ops).expect(200);
      const second = lastToken('lead@lakeside.therabridge.test')!;
      expect(second).not.toBe(first);
      expect((await publicPost('/api/invitations/inspect', { token: first })).status).toBe(404);
      expect((await publicPost('/api/invitations/inspect', { token: second })).body).toMatchObject({ status: 'PENDING', centerName: 'Lakeside Pediatric Therapy', roles: ['CENTER_ADMIN'], accountExists: false });
      await post(h, `/api/platform/centers/${c.id}/admin-invitations`, ops, { email: 'two@x.test', displayName: 'Two X' }).expect(409);
      const replaced = await post(h, `/api/platform/centers/${c.id}/admin-invitations/${invId}/replace`, ops, { email: 'new.lead@lakeside.therabridge.test', displayName: 'New Lead' }).expect(201);
      expect((await publicPost('/api/invitations/inspect', { token: second })).body).toEqual({ status: 'REPLACED' });
      expect((await acceptNew(second)).res.status).toBe(410);
      await post(h, `/api/platform/centers/${c.id}/admin-invitations/${replaced.body.id}/revoke`, ops).expect(200);
      expect((await acceptNew(lastToken('new.lead@lakeside.therabridge.test')!)).res.status).toBe(410);
      await post(h, `/api/platform/centers/${c.id}/admin-invitations/${replaced.body.id}/resend`, ops).expect(409);
      const fresh = await post(h, `/api/platform/centers/${c.id}/admin-invitations`, ops, { email: 'final@lakeside.therabridge.test', displayName: 'Final Lead' }).expect(201);
      expect(fresh.body.status).toBe('PENDING');
      const detail = await get(ops, `/api/platform/centers/${c.id}`).expect(200);
      expect(detail.body.adminInvitations.map((i: { status: string }) => i.status).sort()).toEqual(['PENDING', 'REPLACED', 'REVOKED']);
      expect(detail.body.events.map((e: { type: string }) => e.type)).toEqual(expect.arrayContaining(['invitation.resent', 'invitation.replaced', 'invitation.revoked']));
    });

    it('expired invitations cannot be accepted and show as EXPIRED; resend renews them', async () => {
      const c = await provision();
      h.clock.advance(8 * DAY);
      const token = lastToken('lead@lakeside.therabridge.test')!;
      expect((await publicPost('/api/invitations/inspect', { token })).body).toEqual({ status: 'EXPIRED' });
      expect((await acceptNew(token)).res.status).toBe(410);
      ops = await signIn(h, 'ops@centers.therabridge.test');
      const list = await get(ops, '/api/platform/centers').expect(200);
      expect(list.body.items[0].adminStatus).toBe('EXPIRED');
      await post(h, `/api/platform/centers/${c.id}/admin-invitations/${c.adminInvitations[0].id}/resend`, ops).expect(200);
      expect((await acceptNew(lastToken('lead@lakeside.therabridge.test')!)).res.status).toBe(200);
    });

    it('the new administrator activates an account, lands in the center workspace and the invitation is single-use', async () => {
      await provision();
      const token = lastToken('lead@lakeside.therabridge.test')!;
      const weak = await acceptNew(token, 'Ana Lead', 'short');
      expect(weak.res.status).toBe(422);
      const { res, s } = await acceptNew(token, 'Ana Lead');
      expect(res.status).toBe(200);
      expect(s!.body.activeContext).toMatchObject({ type: 'center', role: 'CENTER_ADMIN', centerName: 'Lakeside Pediatric Therapy' });
      expect(s!.body.permissions).toEqual(expect.arrayContaining(['center.staff.invite', 'center.setup.manage', 'center.settings.update']));
      expect((await acceptNew(token)).res.status).toBe(410);
      const again = await signIn(h, 'lead@lakeside.therabridge.test');
      expect(again.body.activeContext.role).toBe('CENTER_ADMIN');
      const audit = await h.prisma.auditEvent.findMany({ where: { type: 'invitation.accepted' } });
      expect(JSON.stringify(audit.map((a) => a.meta))).not.toContain(token);
    });

    it('an existing user must sign in as the invited email to accept', async () => {
      await createUser(h.prisma, 'lead@lakeside.therabridge.test');
      const other = await createUser(h.prisma, 'other@x.therabridge.test');
      void other;
      await provision();
      const token = lastToken('lead@lakeside.therabridge.test')!;
      expect((await publicPost('/api/invitations/inspect', { token })).body.accountExists).toBe(true);
      expect((await acceptNew(token)).res.status).toBe(409);
      const wrong = await signIn(h, 'other@x.therabridge.test');
      await post(h, '/api/invitations/accept', wrong, { token }).expect(403);
      const right = await signIn(h, 'lead@lakeside.therabridge.test');
      await h.http().post('/api/invitations/accept').set('Origin', ORIGIN).set('Cookie', right.cookie).send({ token }).expect(403);
      const ok = await post(h, '/api/invitations/accept', right, { token }).expect(200);
      expect(ok.body.activeContext).toMatchObject({ type: 'center', role: 'CENTER_ADMIN' });
      expect(cookieFrom(ok, 'tb_session')).not.toBe(right.token);
    });

    it('rate-limits public invitation endpoints per network', async () => {
      for (let i = 0; i < 30; i++) await publicPost('/api/invitations/inspect', { token: `x${'a'.repeat(30)}${i}` }, '203.0.113.9');
      expect((await publicPost('/api/invitations/inspect', { token: 'y'.repeat(43) }, '203.0.113.9')).status).toBe(429);
    });
  });

  describe('onboarding checklist and center settings', () => {
    it('persists setup progress from real actions and the manual review step', async () => {
      const { centerId, admin } = await activeAdmin();
      let setup = await get(admin, `/api/centers/${centerId}/setup`).expect(200);
      expect(setup.body).toMatchObject({ done: 0, total: 4 });
      const settings = await get(admin, `/api/centers/${centerId}/settings`).expect(200);
      await patch(admin, `/api/centers/${centerId}/settings`, { city: 'Potsdam', version: settings.body.version }).expect(200);
      await patch(admin, `/api/centers/${centerId}/settings`, { city: 'Hamburg', version: settings.body.version }).expect(409);
      await patch(admin, `/api/centers/${centerId}/me`, { title: 'Clinical director', phone: '+49 30 1234567' }).expect(200);
      await post(h, `/api/centers/${centerId}/invitations`, admin, { email: 't@lakeside.therabridge.test', displayName: 'Tia Therapist', roles: ['THERAPIST'] }).expect(201);
      await post(h, `/api/centers/${centerId}/setup/invite_team/complete`, admin).expect(422);
      await post(h, `/api/centers/${centerId}/setup/review_permissions/complete`, admin).expect(200);
      setup = await get(admin, `/api/centers/${centerId}/setup`).expect(200);
      expect(setup.body.done).toBe(4);
      expect(setup.body.steps.every((s: { completedBy: string }) => s.completedBy === 'Ana Lead')).toBe(true);
      const platform = await get(ops, `/api/platform/centers/${centerId}`).expect(200);
      expect(platform.body.setup.every((s: { completedAt: string | null }) => s.completedAt)).toBe(true);
      expect(platform.body.admins[0]).toMatchObject({ displayName: 'Ana Lead', status: 'ACTIVE' });
    });
  });

  describe('staff invitations, directory and access management', () => {
    it('invites multi-role staff with specialties; they activate into the correct workspace', async () => {
      const { centerId, admin } = await activeAdmin();
      await post(h, `/api/centers/${centerId}/invitations`, admin, { email: 'a@b.test', displayName: 'Bad Role', roles: ['CENTER_ADMIN'] }).expect(400);
      await post(h, `/api/centers/${centerId}/invitations`, admin, { email: 'a@b.test', displayName: 'Bad Role', roles: ['GUARDIAN'] }).expect(400);
      const multi = await inviteAndJoin(centerId, admin, 'sam@lakeside.therabridge.test', ['THERAPIST', 'CLINICAL_SUPERVISOR'], { specialties: ['speech', 'feeding'], responsibilities: ['supervision'], title: 'Lead SLP' });
      expect(multi.s.body.activeContext).toMatchObject({ role: 'CLINICAL_SUPERVISOR', centerId });
      expect(multi.s.body.contexts.filter((c: { type: string }) => c.type === 'center')).toHaveLength(2);
      const coord = await inviteAndJoin(centerId, admin, 'cora@lakeside.therabridge.test', ['COORDINATOR']);
      expect(coord.s.body.permissions).toEqual(expect.arrayContaining(['center.staff.read', 'center.summary.read']));
      await get(coord.s, `/api/centers/${centerId}/staff`).expect(200);
      await post(h, `/api/centers/${centerId}/invitations`, coord.s, { email: 'z@z.test', displayName: 'Zed Z', roles: ['THERAPIST'] }).expect(403);
      await get(multi.s, `/api/centers/${centerId}/staff`).expect(403);
      await get(multi.s, `/api/centers/${centerId}/summary`).expect(200);
      const me = await get(multi.s, `/api/centers/${centerId}/me`).expect(200);
      expect(me.body).toMatchObject({ title: 'Lead SLP', specialties: ['speech', 'feeding'], responsibilities: ['supervision'], roles: ['CLINICAL_SUPERVISOR', 'THERAPIST'] });

      const all = await get(admin, `/api/centers/${centerId}/staff`).expect(200);
      expect(all.body.total).toBe(3);
      expect((await get(admin, `/api/centers/${centerId}/staff?role=THERAPIST`).expect(200)).body.items.map((m: { email: string }) => m.email)).toEqual(['sam@lakeside.therabridge.test']);
      expect((await get(admin, `/api/centers/${centerId}/staff?specialty=feeding`).expect(200)).body.total).toBe(1);
      expect((await get(admin, `/api/centers/${centerId}/staff?q=cora`).expect(200)).body.total).toBe(1);
      const invites = await get(admin, `/api/centers/${centerId}/invitations`).expect(200);
      expect(invites.body.items.every((i: { status: string }) => i.status === 'ACCEPTED')).toBe(true);
      await post(h, `/api/centers/${centerId}/invitations`, admin, { email: 'cora@lakeside.therabridge.test', displayName: 'Cora', roles: ['THERAPIST'] }).expect(409);
    });

    it('prevents duplicate pending invitations and manages resend/revoke for staff', async () => {
      const { centerId, admin } = await activeAdmin();
      const inv = await post(h, `/api/centers/${centerId}/invitations`, admin, { email: 'dup@x.test', displayName: 'Dup Person', roles: ['THERAPIST'] }).expect(201);
      await post(h, `/api/centers/${centerId}/invitations`, admin, { email: 'DUP@x.test', displayName: 'Dup Person', roles: ['COORDINATOR'] }).expect(409);
      await post(h, `/api/centers/${centerId}/invitations/${inv.body.id}/resend`, admin).expect(200);
      await post(h, `/api/centers/${centerId}/invitations/${inv.body.id}/revoke`, admin).expect(200);
      expect((await acceptNew(lastToken('dup@x.test')!)).res.status).toBe(410);
      await post(h, `/api/centers/${centerId}/invitations`, admin, { email: 'dup@x.test', displayName: 'Dup Person', roles: ['THERAPIST'] }).expect(201);
    });

    it('edits roles and profile, suspends, reactivates and revokes with immediate effect and history', async () => {
      const { centerId, admin } = await activeAdmin();
      const t = await inviteAndJoin(centerId, admin, 'tom@lakeside.therabridge.test', ['THERAPIST']);
      const updated = await patch(admin, `/api/centers/${centerId}/staff/${t.membershipId}`, { roles: ['THERAPIST', 'COORDINATOR'], specialties: ['physical'], title: 'PT' }).expect(200);
      expect(updated.body).toMatchObject({ roles: ['COORDINATOR', 'THERAPIST'], specialties: ['physical'], title: 'PT' });
      await patch(admin, `/api/centers/${centerId}/staff/${t.membershipId}`, { roles: [] }).expect(422);
      await post(h, `/api/centers/${centerId}/staff/${t.membershipId}/suspend`, admin, { reason: '' }).expect(400);
      await post(h, `/api/centers/${centerId}/staff/${t.membershipId}/suspend`, admin, { reason: 'Credential check pending' }).expect(200);
      await get(t.s, `/api/centers/${centerId}/summary`).expect(401);
      await expect(signIn(h, 'tom@lakeside.therabridge.test')).resolves.toMatchObject({ body: { activeContext: null, contexts: [] } });
      await post(h, `/api/centers/${centerId}/staff/${t.membershipId}/suspend`, admin, { reason: 'again please' }).expect(409);
      await post(h, `/api/centers/${centerId}/staff/${t.membershipId}/reactivate`, admin).expect(200);
      const back = await signIn(h, 'tom@lakeside.therabridge.test');
      expect(back.body.contexts).toHaveLength(2);
      await post(h, `/api/centers/${centerId}/staff/${t.membershipId}/revoke`, admin, { reason: 'Left the center' }).expect(200);
      await post(h, `/api/centers/${centerId}/staff/${t.membershipId}/reactivate`, admin).expect(409);
      await patch(admin, `/api/centers/${centerId}/staff/${t.membershipId}`, { title: 'x' }).expect(409);
      expect((await get(admin, `/api/centers/${centerId}/staff?status=REVOKED`).expect(200)).body.total).toBe(1);
      const detail = await get(admin, `/api/centers/${centerId}/staff/${t.membershipId}`).expect(200);
      expect(detail.body.events.map((e: { type: string }) => e.type)).toEqual(expect.arrayContaining(['member.updated', 'member.suspended', 'member.reactivated', 'member.revoked', 'invitation.accepted']));
      // Re-invitation after revocation restores access with only the newly invited roles.
      await post(h, `/api/centers/${centerId}/invitations`, admin, { email: 'tom@lakeside.therabridge.test', displayName: 'Tom', roles: ['COORDINATOR'] }).expect(201);
      const tom = await signIn(h, 'tom@lakeside.therabridge.test');
      const ok = await post(h, '/api/invitations/accept', tom, { token: lastToken('tom@lakeside.therabridge.test') }).expect(200);
      expect(ok.body.contexts.map((c: { role: string }) => c.role)).toEqual(['COORDINATOR']);
    });

    it('protects the last administrator and the administrator’s own access', async () => {
      const { centerId, admin } = await activeAdmin();
      const own = admin.body.activeContext.membershipId;
      await post(h, `/api/centers/${centerId}/staff/${own}/suspend`, admin, { reason: 'self test' }).expect(422);
      await post(h, `/api/platform/centers/${centerId}/admin-invitations`, ops, { email: 'second@lakeside.therabridge.test', displayName: 'Second Admin' }).expect(201);
      const { s: second } = await acceptNew(lastToken('second@lakeside.therabridge.test')!, 'Second Admin');
      await post(h, `/api/centers/${centerId}/staff/${own}/suspend`, second!, { reason: 'handover test' }).expect(200);
      const secondId = second!.body.activeContext.membershipId;
      const third = await h.prisma.membership.findUniqueOrThrow({ where: { id: secondId } });
      expect(third.status).toBe('ACTIVE');
      // Only one active admin remains (second); nobody can remove them now except via self, which is blocked.
      const center = await h.prisma.membership.count({ where: { centerId, status: 'ACTIVE', roles: { some: { role: 'CENTER_ADMIN' } } } });
      expect(center).toBe(1);
      const kept = await patch(second!, `/api/centers/${centerId}/staff/${own}`, { roles: [] }).expect(200);
      expect(kept.body.roles).toEqual(['CENTER_ADMIN']);
    });

    it('keeps tenants isolated for every center route', async () => {
      const { centerId, admin } = await activeAdmin();
      const other = await provision({ name: 'Other Town Therapy', firstAdmin: { email: 'o@other.therabridge.test', displayName: 'Oli Other' } });
      const { s: otherAdmin } = await acceptNew(lastToken('o@other.therabridge.test')!, 'Oli Other');
      const t = await inviteAndJoin(centerId, admin, 'iso@lakeside.therabridge.test', ['THERAPIST']);
      for (const path of ['settings', 'setup', 'staff', 'invitations', 'me', `staff/${t.membershipId}`]) {
        await get(otherAdmin!, `/api/centers/${centerId}/${path}`).expect(404);
      }
      await post(h, `/api/centers/${centerId}/invitations`, otherAdmin!, { email: 'q@q.test', displayName: 'Q Q', roles: ['THERAPIST'] }).expect(404);
      await get(otherAdmin!, `/api/centers/${other.id}/staff/${t.membershipId}`).expect(404);
      await patch(otherAdmin!, `/api/centers/${other.id}/staff/${t.membershipId}`, { title: 'hijack' }).expect(404);
      await post(h, `/api/centers/${other.id}/invitations/${(await h.prisma.invitation.findFirstOrThrow({ where: { centerId } })).id}/revoke`, otherAdmin!).expect(404);
    });

    it('center history is append-only', async () => {
      const { centerId } = await activeAdmin();
      await expect(h.prisma.centerEvent.updateMany({ where: { centerId }, data: { type: 'tampered' } })).rejects.toThrow(/append-only/);
      await expect(h.prisma.centerEvent.deleteMany({ where: { centerId } })).rejects.toThrow(/append-only/);
    });
  });

  it('end-to-end: platform creation → admin activation → staff activation → correct workspace', async () => {
    const pw = freshPassword();
    const c = await provision({ name: 'Journey Center' });
    const { s: admin } = await acceptNew(lastToken('lead@lakeside.therabridge.test')!, 'Ana Lead', pw);
    expect(admin!.body.activeContext).toMatchObject({ centerId: c.id, role: 'CENTER_ADMIN' });
    await post(h, `/api/centers/${c.id}/invitations`, admin!, { email: 'journey.t@x.test', displayName: 'Jo Therapist', roles: ['THERAPIST'], specialties: ['speech'] }).expect(201);
    const { s: therapist } = await acceptNew(lastToken('journey.t@x.test')!, 'Jo Therapist', pw);
    expect(therapist!.body.activeContext).toMatchObject({ centerId: c.id, role: 'THERAPIST' });
    const summary = await get(therapist!, `/api/centers/${c.id}/summary`).expect(200);
    expect(summary.body.activeMembers).toBe(2);
    expect(therapist!.body.permissions).not.toContain('center.staff.read');
  });
});
