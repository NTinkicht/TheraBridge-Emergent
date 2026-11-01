import { randomUUID } from 'node:crypto';
import { Harness, Signed, ORIGIN, createUser, makeApp, post, resetDb, signIn } from './helpers';

describe('TB-EM-053 synthetic-only family document release (PostgreSQL)', () => {
  let h: Harness, c: string, kid: string, plan: string, link: string;
  let therapist: Signed, guardian: Signed, admin: Signed, otherGuardian: Signed;
  let coordinator: Signed, otTherapist: Signed, supervisor: Signed, platform: Signed;
  const path = (p: string) => `/api/centers/${c}/family-releases/${p}`;
  const submit = (s: Signed, action: string, version: number) =>
    post(h, `/api/centers/${c}/governance/documents/PLAN/${plan}/transitions`, s,
      { action, version, reason: 'Synthetic review for TB-EM-053' });
  const get = (s: Signed, p: string) => h.http().get(path(p)).set('Cookie', s.cookie);
  const grant = (s: Signed, approvalId: string, guardianLinkId = link) =>
    post(h, path('grants'), s, { approvalId, guardianLinkId });
  let beforeFlag: string | undefined;

  beforeAll(async () => {
    beforeFlag = process.env.TB_FAMILY_RELEASE_SYNTHETIC;
    process.env.TB_FAMILY_RELEASE_SYNTHETIC = 'true';
    h = await makeApp();
  });
  afterAll(async () => {
    if (beforeFlag === undefined) delete process.env.TB_FAMILY_RELEASE_SYNTHETIC;
    else process.env.TB_FAMILY_RELEASE_SYNTHETIC = beforeFlag;
    await h.close();
  });
  beforeEach(async () => {
    await resetDb(h.prisma);
    c = (await h.prisma.center.create({ data: { slug: 'family-synthetic', name: 'Synthetic family release',
      timezone: 'UTC', syntheticFamilyReleaseEnabled: true } })).id;
    async function actor(role: 'THERAPIST' | 'GUARDIAN' | 'CENTER_ADMIN' | 'COORDINATOR' | 'CLINICAL_SUPERVISOR', name: string) {
      const u = await createUser(h.prisma, `${name}@family-synthetic.test`);
      const m = await h.prisma.membership.create({ data: { centerId: c, userId: u.id,
        specialties: role === 'THERAPIST' ? [name === 'ot' ? 'occupational' : 'speech'] : [], roles: { create: { role } } } });
      return { signed: await signIn(h, u.email), user: u, member: m };
    }
    const t = await actor('THERAPIST', 'therapist'); therapist = t.signed;
    const g = await actor('GUARDIAN', 'guardian'); guardian = g.signed;
    const other = await actor('GUARDIAN', 'other'); otherGuardian = other.signed;
    admin = (await actor('CENTER_ADMIN', 'admin')).signed;
    coordinator = (await actor('COORDINATOR', 'coordinator')).signed;
    supervisor = (await actor('CLINICAL_SUPERVISOR', 'supervisor')).signed;
    otTherapist = (await actor('THERAPIST', 'ot')).signed;
    const platformUser = await createUser(h.prisma, 'platform@family-synthetic.test');
    await h.prisma.platformRoleAssignment.create({ data: { userId: platformUser.id,
      source: 'synthetic_seed', reason: 'Seven-role release isolation test' } });
    platform = await signIn(h, platformUser.email);
    kid = (await h.prisma.child.create({ data: { centerId: c, firstName: 'Fictional',
      lastName: 'Child', dateOfBirth: new Date('2020-01-01'), services: ['speech'],
      createdById: t.user.id, createdAt: new Date() } })).id;
    await h.prisma.careAssignment.create({ data: { centerId: c, childId: kid,
      membershipId: t.member.id, service: 'speech', startedAt: new Date() } });
    link = (await h.prisma.guardianLink.create({ data: { centerId: c, childId: kid, userId: g.user.id,
      displayName: 'Fictional guardian', email: g.user.email, emailNorm: g.user.email.toLowerCase(),
      relationship: 'mother', familyReleaseRestriction: 'CLEAR', createdAt: new Date() } })).id;
    await h.prisma.guardianLink.create({ data: { centerId: c, childId: kid, userId: other.user.id,
      displayName: 'Other guardian', email: other.user.email, emailNorm: other.user.email.toLowerCase(),
      relationship: 'father', familyReleaseRestriction: 'RESTRICTED', createdAt: new Date() } });
    const p = await h.prisma.therapyPlan.create({ data: { centerId: c, childId: kid,
      service: 'speech', title: 'Fictional home plan', createdById: t.user.id, createdAt: new Date() } });
    plan = (await h.prisma.planVersion.create({ data: { planId: p.id, centerId: c, number: 1,
      summary: 'Fictional family guidance', goals: [{ key: 'turns', title: 'Practice taking turns',
        measure: 'count', baseline: 1, target: 3 }], authorId: t.user.id,
      createdAt: new Date(), updatedAt: new Date() } })).id;
  });

  async function approved() {
    const submitted = await submit(therapist, 'SUBMIT', 1).expect(201);
    return (await post(h, path('approvals'), therapist, { snapshotId: submitted.body.snapshotId }).expect(201)).body.id as string;
  }
  async function consented() {
    await post(h, path('consents'), guardian, { childId: kid, purpose: 'FAMILY_PLAN' }).expect(201);
  }

  it('allows only the specified guardian to read the exact approved synthetic rendering', async () => {
    const approvalId = await approved();
    await consented();
    const releaseId = (await grant(therapist, approvalId).expect(201)).body.id;
    const doc = await get(guardian, `mine/${releaseId}`).expect(200);
    expect(doc.headers['cache-control']).toContain('no-store');
    expect(doc.body.rendering.kind).toBe('PLAN');
    expect(doc.body.rendering.summary).toBe('Fictional family guidance');
    expect(JSON.stringify(doc.body)).not.toMatch(/evidence|reviewNotes|INTERNAL/);
    await get(otherGuardian, `mine/${releaseId}`).expect(404);
    await get(admin, `mine/${releaseId}`).expect(403);
    expect((await get(guardian, 'mine').expect(200)).body.items).toHaveLength(1);
    expect((await get(otherGuardian, 'mine').expect(200)).body.items).toHaveLength(0);
    for (const s of [coordinator, supervisor, otTherapist]) await get(s, `mine/${releaseId}`).expect(403);
    expect([403, 404]).toContain((await get(platform, `mine/${releaseId}`)).status);
  });

  it('uses the assigned specialty and clinician role rather than center administrative power', async () => {
    const approvalId = await approved(); await consented();
    await grant(admin, approvalId).expect(403);
    await grant(coordinator, approvalId).expect(403);
    await grant(otTherapist, approvalId).expect(403);
    // A clinical supervisor may approve submitted content but cannot gain guardian read access.
    await get(supervisor, 'mine').expect(403);
    await grant(therapist, approvalId).expect(201);
  });

  it('withdrawal revokes the active grant and later re-consent cannot resurrect it', async () => {
    const approvalId = await approved(); await consented();
    const releaseId = (await grant(therapist, approvalId).expect(201)).body.id;
    await post(h, path('consents/withdraw'), guardian, { childId: kid, purpose: 'FAMILY_PLAN' }).expect(201);
    await get(guardian, `mine/${releaseId}`).expect(404);
    await consented();
    await get(guardian, `mine/${releaseId}`).expect(404);
    await grant(therapist, approvalId).expect(409);
  });

  it('uses consent revision rather than transaction-start timestamps for latest consent', async () => {
    const approvalId = await approved();
    await consented();
    // A later-written withdrawal may have an earlier transaction-start timestamp.
    await h.prisma.syntheticFamilyConsent.updateMany({ where: { centerId: c, guardianLinkId: link },
      data: { createdAt: new Date('2026-11-01T12:00:00Z') } });
    await post(h, path('consents/withdraw'), guardian, { childId: kid, purpose: 'FAMILY_PLAN' }).expect(201);
    const rows = await h.prisma.syntheticFamilyConsent.findMany({ where: { centerId: c, guardianLinkId: link },
      orderBy: { revision: 'asc' } });
    expect(rows.map(r => r.revision)).toEqual([1, 2]);
    // Simulate reversed transaction-start ordering: the withdrawal has an older timestamp.
    await h.prisma.syntheticFamilyConsent.update({ where: { id: rows[0].id },
      data: { createdAt: new Date('2026-11-01T13:00:00Z') } });
    await h.prisma.syntheticFamilyConsent.update({ where: { id: rows[1].id },
      data: { createdAt: new Date('2026-11-01T11:00:00Z') } });
    await grant(therapist, approvalId).expect(403);
    await consented();
    expect((await h.prisma.syntheticFamilyConsent.findFirstOrThrow({
      where: { centerId: c, guardianLinkId: link }, orderBy: { revision: 'desc' } })).revision).toBe(3);
    await grant(therapist, approvalId).expect(201);
  });

  it('lets an assigned clinician reload superseded grants and revoke them', async () => {
    const approvalId = await approved(); await consented();
    const id = (await grant(therapist, approvalId).expect(201)).body.id;
    await post(h, path(`grants/${id}/change`), therapist,
      { status: 'SUPERSEDED', reason: 'Fictional replacement' }).expect(201);
    const listed = await get(therapist, `approvals/${approvalId}/grants`).expect(200);
    expect(listed.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id, guardianLinkId: link, status: 'SUPERSEDED' }),
    ]));
    await get(admin, `approvals/${approvalId}/grants`).expect(403);
    await get(otTherapist, `approvals/${approvalId}/grants`).expect(403);
    await post(h, path(`grants/${id}/change`), therapist,
      { status: 'REVOKED', reason: 'Fictional correction' }).expect(201);
    await get(guardian, `mine/${id}`).expect(404);
  });

  it('two concurrent duplicate grants converge on one recipient-scoped record', async () => {
    const approvalId = await approved(); await consented();
    const [first, second] = await Promise.all([grant(therapist, approvalId), grant(therapist, approvalId)]);
    expect(first.status).toBe(201); expect(second.status).toBe(201);
    expect(first.body.id).toBe(second.body.id);
    expect(await h.prisma.syntheticFamilyGrant.count({ where: { centerId: c, approvalId } })).toBe(1);
  });

  it('lets a newly restricted guardian withdraw consent, never regain document access', async () => {
    const approvalId = await approved(); await consented();
    const releaseId = (await grant(therapist, approvalId).expect(201)).body.id;
    await h.prisma.guardianLink.update({ where: { id: link }, data: { familyReleaseRestriction: 'RESTRICTED' } });
    await get(guardian, `mine/${releaseId}`).expect(404);
    await post(h, path('consents/withdraw'), guardian, { childId: kid, purpose: 'FAMILY_PLAN' }).expect(201);
    expect((await h.prisma.syntheticFamilyGrant.findUniqueOrThrow({ where: { id: releaseId } })).status).toBe('REVOKED');
  });

  it('never revives an old clinical approval after return, edit and resubmission', async () => {
    const approvalId = await approved(); await consented();
    const releaseId = (await grant(therapist, approvalId).expect(201)).body.id;
    await submit(supervisor, 'RETURN', 2).expect(201);
    await h.http().patch(`/api/centers/${c}/clinical/plan-versions/${plan}`)
      .set('Origin', ORIGIN).set('Cookie', therapist.cookie).set('X-CSRF-Token', therapist.csrf)
      .send({ version: 3, summary: 'Fictional revised family guidance', goals: [
        { key: 'turns', title: 'Practice turn-taking again', measure: 'count', baseline: 1, target: 3 },
      ], homeActivities: [] }).expect(200);
    const resubmitted = await submit(therapist, 'SUBMIT', 4).expect(201);
    expect(resubmitted.body.snapshotId).toBeDefined();
    await grant(therapist, approvalId).expect(409);
    await get(guardian, `mine/${releaseId}`).expect(404);
    const newApproval = (await post(h, path('approvals'), therapist,
      { snapshotId: resubmitted.body.snapshotId }).expect(201)).body.id;
    expect(newApproval).not.toBe(approvalId);
    await grant(therapist, newApproval).expect(201);
  });

  it('withdrawal permanently revokes superseded grants even after re-consent', async () => {
    const approvalId = await approved(); await consented();
    const releaseId = (await grant(therapist, approvalId).expect(201)).body.id;
    await post(h, path(`grants/${releaseId}/change`), therapist,
      { status: 'SUPERSEDED', reason: 'Fictional replacement' }).expect(201);
    await post(h, path('consents/withdraw'), guardian, { childId: kid, purpose: 'FAMILY_PLAN' }).expect(201);
    await consented();
    await get(guardian, `mine/${releaseId}`).expect(404);
    expect((await h.prisma.syntheticFamilyGrant.findUniqueOrThrow({ where: { id: releaseId } })).status).toBe('REVOKED');
    await grant(therapist, approvalId).expect(409);
  });

  it('forbids access if synthetic center flag is off, and keeps old locked release tables locked', async () => {
    const approvalId = await approved(); await consented();
    const releaseId = (await grant(therapist, approvalId).expect(201)).body.id;
    await h.prisma.center.update({ where: { id: c }, data: { syntheticFamilyReleaseEnabled: false } });
    await get(guardian, `mine/${releaseId}`).expect(403);
    await post(h, path('approvals'), therapist, { snapshotId: randomUUID() }).expect(403);
    expect(await h.prisma.recipientRelease.count()).toBe(0);
    expect(await h.prisma.clinicalAuthorizationDecision.count()).toBe(0);
  });

  it('rejects approval and new grants after child service removal without blocking withdrawal', async () => {
    const submitted = await submit(therapist, 'SUBMIT', 1).expect(201);
    await h.prisma.child.update({ where: { id: kid }, data: { services: [] } });
    await post(h, path('approvals'), therapist, { snapshotId: submitted.body.snapshotId }).expect(403);
    await h.prisma.child.update({ where: { id: kid }, data: { services: ['speech'] } });
    const approvalId = (await post(h, path('approvals'), therapist,
      { snapshotId: submitted.body.snapshotId }).expect(201)).body.id;
    await consented();
    const id = (await grant(therapist, approvalId).expect(201)).body.id;
    await h.prisma.child.update({ where: { id: kid }, data: { services: [] } });
    await grant(therapist, approvalId).expect(403);
    await post(h, path(`grants/${id}/change`), therapist,
      { status: 'REVOKED', reason: 'Service removed' }).expect(201);
    await get(guardian, `mine/${id}`).expect(404);
  });

  it('lets a clinician revoke a readable superseded grant', async () => {
    const approvalId = await approved(); await consented();
    const id = (await grant(therapist, approvalId).expect(201)).body.id;
    await post(h, path(`grants/${id}/change`), therapist,
      { status: 'SUPERSEDED', reason: 'Fictional replacement' }).expect(201);
    await get(guardian, `mine/${id}`).expect(200);
    await post(h, path(`grants/${id}/change`), therapist,
      { status: 'REVOKED', reason: 'Fictional safety correction' }).expect(201);
    await get(guardian, `mine/${id}`).expect(404);
  });

  it('denies release without consent and blocks revoked clinician assignment', async () => {
    const approvalId = await approved();
    await grant(therapist, approvalId).expect(403);
    await consented();
    await h.prisma.careAssignment.updateMany({ where: { centerId: c, childId: kid }, data: { endedAt: new Date() } });
    await grant(therapist, approvalId).expect(403);
  });

  it('withdrawing a release hides it, while supersession labels it as replaced', async () => {
    const approvalId = await approved(); await consented();
    const id = (await grant(therapist, approvalId).expect(201)).body.id;
    await post(h, path(`grants/${id}/change`), therapist,
      { status: 'SUPERSEDED', reason: 'Replaced by a revised fictional plan' }).expect(201);
    expect((await get(guardian, `mine/${id}`).expect(200)).body.replaced).toBe(true);
    await post(h, path(`grants/${id}/change`), therapist,
      { status: 'WITHDRAWN', reason: 'Synthetic withdrawal' }).expect(201);
    await get(guardian, `mine/${id}`).expect(404);
    expect((await h.prisma.syntheticFamilyGrant.findUniqueOrThrow({ where: { id } })).status).toBe('WITHDRAWN');
  });
});
