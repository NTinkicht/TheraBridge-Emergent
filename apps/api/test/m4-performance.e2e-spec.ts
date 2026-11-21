import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Harness, makeApp } from './helpers';
import { upcomingChangedAppointmentIds } from '../src/operations/notices.service';

// M4-07: CI-only synthetic API/PostgreSQL measurements, not a production SLA.
// The test database is rejected by helpers.ts unless its name ends in "_test".
const round = (n: number) => Math.round(n * 100) / 100;
const percentile = (values: number[], p: number) => {
  if (!values.length) throw new Error('Empty measurements');
  const sorted = [...values].sort((a, b) => a - b);
  return round(sorted[Math.ceil((p / 100) * sorted.length) - 1]);
};
const metrics = (values: number[], elapsedMs: number) => ({
  requests: values.length,
  p50Ms: percentile(values, 50),
  p95Ms: percentile(values, 95),
  p99Ms: percentile(values, 99),
  throughputPerSecond: round(values.length * 1000 / elapsedMs),
});
const report = (data: object) => {
  const dir = join(process.cwd(), '../../.workspace/m4-performance');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'm4-07-synthetic-api.json'), JSON.stringify({
    schemaVersion: 1,
    environment: 'ci_disposable_postgres_only',
    qualification: 'measurement_not_production_capacity',
    ...data,
  }, null, 2) + '\n', { mode: 0o600 });
};

describe('M4-07 synthetic API/PostgreSQL measurement (not release SLA)', () => {
  let h: Harness;
  beforeAll(async () => { h = await makeApp({ DEPLOYMENT_ENV: 'ci' }); });
  afterAll(async () => { await h.close(); });

  it('records successful health + DB latency/throughput at serial and concurrent demand', async () => {
    const samples: Record<string, ReturnType<typeof metrics>> = {};
    const rssStart = process.memoryUsage().rss;
    let rssPeak = rssStart;
    for (const [label, count, concurrency] of [
      ['serial', 40, 1], ['concurrent8', 80, 8],
    ] as const) {
      const durations: number[] = [];
      const start = performance.now();
      for (let i = 0; i < count; i += concurrency) {
        await Promise.all(Array.from({ length: Math.min(concurrency, count - i) }, async () => {
          const t = performance.now();
          const res = await h.http().get('/api/health');
          durations.push(performance.now() - t);
          expect(res.status).toBe(200);
          expect(res.body.database.status).toBe('up');
          expect(res.body.migrations.applied).toBeGreaterThan(0);
        }));
        rssPeak = Math.max(rssPeak, process.memoryUsage().rss);
      }
      samples[label] = metrics(durations, performance.now() - start);
      expect(samples[label].requests).toBe(count);
      expect(samples[label].p95Ms).toBeGreaterThanOrEqual(0);
    }
    // Query-plan structure is actual PostgreSQL evidence; not a claim of a
    // particular index being selected on nearly-empty CI fixtures.
    const planRows = await h.prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': any[] }>>(
      'EXPLAIN (FORMAT JSON) SELECT id FROM appointment WHERE center_id = ' +
      "'00000000-0000-0000-0000-000000000000'::uuid" +
      ' AND starts_at > NOW() ORDER BY starts_at LIMIT 100'
    );
    const plan = planRows[0]?.['QUERY PLAN']?.[0]?.Plan;
    expect(plan).toBeTruthy();
    const statement = 'appointment scoped, bounded, time-ordered SELECT';
    report({
      api: samples,
      apiResponseSqlCalls: { perRequest: 2, evidence: 'health.service.ts has two sequential prisma.$queryRaw queries; source-level count, not SQL trace' },
      database: { queryPlanPresent: true, scope: statement, planNode: String(plan['Node Type']) },
      process: { rssStartBytes: rssStart, observedRssPeakBytes: rssPeak, nodeMajor: Number(process.versions.node.split('.')[0]) },
    });
    console.log('M4-07 synthetic health API measured', JSON.stringify({ api: samples, rssPeakBytes: rssPeak }));
  });

  it('records bounded notice selection scaling without timing-derived flaky pass/fail', () => {
    const now = new Date('2026-11-09T00:00:00Z');
    const soon = new Date('2026-11-23T00:00:00Z');
    const measure = (count: number) => {
      const rows = Array.from({ length: count }, (_, i) => ({
        id: 'synthetic-' + i, startsAt: new Date('2026-12-01T00:00:00Z'),
      }));
      const changed = rows.map((row, i) => ({
        id: row.id, before: new Date(i % 2 === 0 ? '2026-11-12T00:00:00Z' : '2026-12-02T00:00:00Z'),
      }));
      const t = performance.now();
      const ids = upcomingChangedAppointmentIds(rows, changed, now, soon);
      const elapsedMs = round(performance.now() - t);
      expect(ids.length).toBe(count / 2);
      expect(new Set(ids).size).toBe(ids.length);
      return { rows: count, changedItems: count, eligible: ids.length, elapsedMs };
    };
    const sizes = [5000, 10000].map(measure);
    console.log('M4-07 synthetic notice selection measured', JSON.stringify(sizes));
  });
});
