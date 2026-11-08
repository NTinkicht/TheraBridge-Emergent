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
});
