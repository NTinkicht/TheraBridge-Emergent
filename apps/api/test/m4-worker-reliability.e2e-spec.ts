import { NoticesService } from '../src/operations/notices.service';

// An isolated deterministic fake of Prisma's createManyAndReturn(skipDuplicates)
// for notification worker fault/duplicate behavior. This is a contract test,
// distinct from the real PostgreSQL API benchmark and existing DB regressions.
function makeWorker(failFirstDelivery = false) {
  const now = new Date('2026-11-09T10:00:00Z');
  const visit = { id: 'visit-synthetic', centerId: 'center-a', childId: 'child-a',
    membershipId: 'staff-a', startsAt: new Date('2026-11-10T08:00:00Z'),
    service: 'speech', room: 'Synthetic Room',
    center: { name: 'QA Centre', timezone: 'UTC' },
    child: { firstName: 'Synthetic', preferredName: null,
      guardians: [{ id: 'guardian-a', userId: 'user-a', displayName: 'Synthetic Guardian' }] } };
  const reservations = new Map<string, any>();
  const sent: string[] = [];
  let failures = 0;
  let queryCalls = 0;
  let attempted = 0;
  const prisma = {
    appointment: { findMany: async (args: any) => {
      queryCalls++;
      return args.select ? [{ id: visit.id }] : [visit];
    } },
    user: { findMany: async () => {
      queryCalls++;
      return [{ id: 'user-a', email: 'synthetic@example.invalid' }];
    } },
    membership: { findMany: async () => {
      queryCalls++;
      return [{ id: 'staff-a', user: { displayName: 'Synthetic Therapist' } }];
    } },
    appointmentNotice: {
      createManyAndReturn: async (args: any) => {
        queryCalls++;
        expect(args.skipDuplicates).toBe(true);
        const result: any[] = [];
        for (const row of args.data) {
          const key = [row.appointmentId, row.guardianLinkId, row.kind, row.startsAt.toISOString()].join(':');
          if (!reservations.has(key)) {
            const stored = { ...row, id: 'reserved-' + reservations.size };
            reservations.set(key, stored);
            result.push(stored);
          }
        }
        return result;
      },
      deleteMany: async (args: any) => {
        queryCalls++;
        for (const [key, row] of reservations) if (args.where.id.in.includes(row.id)) reservations.delete(key);
      },
    },
  };
  const mail = { send: ({ to }: { to: string }) => {
    attempted++;
    if (failFirstDelivery && failures++ === 0) throw new Error('synthetic outbound failure');
    sent.push(to);
  } };
  const worker = new NoticesService(prisma as any, mail as any, { now: () => now } as any);
  return { worker, sent, reservations, stats: () => ({ queryCalls, attempted }) };
}

describe('M4-07 synthetic background retry and duplicate-reservation contract', () => {
  it('serial and concurrently repeated sweeps deliver only one synthetic notification', async () => {
    const h = makeWorker();
    const [first, second] = await Promise.all([h.worker.runDue(), h.worker.runDue()]);
    expect(first.sent + second.sent).toBe(1);
    expect(h.sent).toEqual(['synthetic@example.invalid']);
    expect(h.reservations.size).toBe(1);
    expect((await h.worker.runDue()).sent).toBe(0);
    expect(h.stats().queryCalls).toBe(15); // 5 queries per sweep: bounded, not per guardian
  });
  it('failed first outbox attempt releases only pending reservation for a later sweep', async () => {
    const h = makeWorker(true);
    await expect(h.worker.runDue()).rejects.toThrow('synthetic outbound failure');
    expect(h.reservations.size).toBe(0);
    expect(h.sent).toHaveLength(0);
    expect((await h.worker.runDue()).sent).toBe(1);
    expect(h.reservations.size).toBe(1);
    expect(h.sent).toEqual(['synthetic@example.invalid']);
    expect((await h.worker.runDue()).sent).toBe(0);
  });
});
