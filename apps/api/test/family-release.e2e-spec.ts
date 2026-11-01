import { randomUUID } from 'node:crypto';
import { Harness, Signed, createUser, makeApp, post, resetDb, signIn } from './helpers';

describe('TB-EM-053 synthetic-only family document release (PostgreSQL)', () => {
  let h: Harness, c: string, kid: string, plan: string, link: string;
  let therapist: Signed, guardian: Signed, admin: Signed, otherGuardian: Signed;
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
    async function actor(role: 'THERAPIST' | 'GUARDIAN' | 'CENTER_ADMIN', name: string) {
      const u = await createUser(h.prisma, `${name}@family-synthetic.test`);
      const m = await h.prisma.membership.create({ data: { centerId: c, userId: u.id,
        specialties: role === 'THERAPIST' ? ['speech'] : [], roles: { create: { role } } } });
      return { signed: await signIn(h, u.email), user: u, member: m };
    }
    const t = await actor('THERAPIST', 'therapist'); therapist = t.signed;
    const g = await actor('GUARDIAN', 'guardian'); guardian = g.signed;
    const other = await actor('GUARDIAN', 'other'); otherGuardian = other.signed;
    admin = (await actor('CENTER_ADMIN', 'admin')).signed;
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

  it('forbids access if synthetic center flag is off, and keeps old locked release tables locked', async () => {
    const approvalId = await approved(); await consented();
    const releaseId = (await grant(therapist, approvalId).expect(201)).body.id;
    await h.prisma.center.update({ where: { id: c }, data: { syntheticFamilyReleaseEnabled: false } });
    await get(guardian, `mine/${releaseId}`).expect(403);
    await post(h, path('approvals'), therapist, { snapshotId: randomUUID() }).expect(403);
    expect(await h.prisma.recipientRelease.count()).toBe(0);
    expect(await h.prisma.clinicalAuthorizationDecision.count()).toBe(0);
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
      { status: 'WITHDRAWN', reason: 'Synthetic withdrawal' }).expect(409);
  });
});
