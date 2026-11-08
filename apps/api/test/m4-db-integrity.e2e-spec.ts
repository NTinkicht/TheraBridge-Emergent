import { Harness, makeApp, resetDb } from './helpers';

describe('M4-06 database integrity protections (real PostgreSQL)', () => {
  let h: Harness;
  beforeAll(async () => { h = await makeApp(); });
  afterAll(async () => { await h.close(); });
  beforeEach(async () => { await resetDb(h.prisma); });

  it('preserves audit_event append-only trigger under ORM update and delete attempts', async () => {
    const row = await h.prisma.auditEvent.create({
      data: { type: 'm4.integrity.synthetic', meta: { marker: 'ci-only' } },
    });
    const trigger = await h.prisma.$queryRaw<{ tgname: string }[]>`
      SELECT tgname FROM pg_trigger
      WHERE tgrelid = 'audit_event'::regclass
        AND NOT tgisinternal AND tgname = 'audit_event_no_mutation'`;
    expect(trigger.map(x => x.tgname)).toContain('audit_event_no_mutation');
    await expect(h.prisma.auditEvent.update({
      where: { id: row.id }, data: { type: 'm4.illicit.rewrite' },
    })).rejects.toThrow();
    await expect(h.prisma.auditEvent.delete({ where: { id: row.id } })).rejects.toThrow();
    expect(await h.prisma.auditEvent.findUniqueOrThrow({ where: { id: row.id } }))
      .toMatchObject({ type: 'm4.integrity.synthetic', meta: { marker: 'ci-only' } });
    // Normal append remains available; this test does not authorize
    // production retention deletions or bypass the separate privacy policy.
    await h.prisma.auditEvent.create({ data: { type: 'm4.integrity.append', meta: {} } });
    expect(await h.prisma.auditEvent.count()).toBe(2);
  });

  it('M4-06 P1: rejects raw TRUNCATE while retaining normal audit INSERT', async () => {
    const initial = await h.prisma.auditEvent.create({
      data: { type: 'm4.audit.protected', meta: { synthetic: true } },
    });
    const triggers = await h.prisma.$queryRaw<{ tgname: string; enabled: string }[]>`
      SELECT tgname, tgenabled AS enabled FROM pg_trigger
      WHERE tgrelid = 'audit_event'::regclass AND NOT tgisinternal
        AND tgname = 'audit_event_no_truncate'`;
    expect(triggers).toEqual([{ tgname: 'audit_event_no_truncate', enabled: 'O' }]);
    await expect(h.prisma.$executeRawUnsafe('TRUNCATE TABLE audit_event')).rejects.toThrow();
    expect(await h.prisma.auditEvent.findUnique({ where: { id: initial.id } })).not.toBeNull();
    await h.prisma.auditEvent.create({ data: { type: 'm4.audit.append', meta: {} } });
    expect(await h.prisma.auditEvent.count()).toBe(2);
  });

  it('retains center, child and author constraints for clinical version records', async () => {
    const found = await h.prisma.$queryRaw<{ conname: string; validated: boolean }[]>`
      SELECT conname, convalidated AS validated FROM pg_constraint
      WHERE conrelid = 'plan_version'::regclass AND contype = 'f'
    `;
    const byName = new Map(found.map(x => [x.conname, x.validated]));
    for (const name of ['plan_version_center_fk', 'plan_version_author_fk']) {
      expect(byName.get(name)).toBe(true);
    }
  });

  it('retains tenant-scoped hot-path indexes on session and assignment tables', async () => {
    const indexes = await h.prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
        AND tablename IN ('care_assignment', 'appointment')
    `;
    const names = new Set(indexes.map(x => x.indexname));
    expect(names.has('care_assignment_center_member_active_idx')).toBe(true);
    expect(names.has('appointment_center_child_status_start_idx')).toBe(true);
  });
  it('M4-F01: audit protections survive concurrent mutation attempts and PUBLIC has no TRUNCATE grant', async () => {
    const row = await h.prisma.auditEvent.create({
      data: { type: 'm4.concurrent.protected', meta: { synthetic: true } },
    });
    const permissions = await h.prisma.$queryRaw<{ hasPublicTruncate: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_class c,
          LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
        WHERE c.oid = 'public.audit_event'::regclass
          AND a.grantee = 0 AND a.privilege_type = 'TRUNCATE'
      ) AS "hasPublicTruncate"
    `;
    expect(permissions).toEqual([{ hasPublicTruncate: false }]);
    const triggers = await h.prisma.$queryRaw<{ tgname: string; tgenabled: string }[]>`
      SELECT tgname, tgenabled FROM pg_trigger
      WHERE tgrelid = 'public.audit_event'::regclass
        AND tgname IN ('audit_event_no_mutation', 'audit_event_no_truncate')
    `;
    expect(triggers).toHaveLength(2);
    expect(triggers.every(t => t.tgenabled === 'O')).toBe(true);
    const attempts = await Promise.allSettled([
      h.prisma.auditEvent.update({ where: { id: row.id }, data: { type: 'm4.concurrent.rewrite' } }),
      h.prisma.auditEvent.delete({ where: { id: row.id } }),
    ]);
    expect(attempts.map(x => x.status)).toEqual(['rejected', 'rejected']);
    expect(await h.prisma.auditEvent.findUniqueOrThrow({ where: { id: row.id } }))
      .toMatchObject({ type: 'm4.concurrent.protected', meta: { synthetic: true } });
    await h.prisma.auditEvent.create({ data: { type: 'm4.concurrent.append.ok', meta: {} } });
    expect(await h.prisma.auditEvent.count()).toBe(2);
    // This does not certify the Render runtime DB account is non-owner:
    // that requires an independently provisioned least-privileged role.
  });

  it('M4-06 P3: forbidden audit mutation rolls back prior append in the same transaction', async () => {
    const existing = await h.prisma.auditEvent.create({
      data: { type: 'm4.rollback.original', meta: { synthetic: true } },
    });
    await expect(h.prisma.$transaction(async tx => {
      await tx.auditEvent.create({
        data: { type: 'm4.rollback.must_not_commit', meta: { synthetic: true } },
      });
      await tx.auditEvent.update({
        where: { id: existing.id },
        data: { type: 'm4.rollback.illicit_update' },
      });
    })).rejects.toThrow();
    const records = await h.prisma.auditEvent.findMany();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: existing.id,
      type: 'm4.rollback.original',
      meta: { synthetic: true },
    });
    // A failed write must not leave the transaction unusable for future
    // legitimate append-only audit events.
    await h.prisma.auditEvent.create({
      data: { type: 'm4.rollback.append_after_failure', meta: { synthetic: true } },
    });
    expect(await h.prisma.auditEvent.count()).toBe(2);
  });

});
