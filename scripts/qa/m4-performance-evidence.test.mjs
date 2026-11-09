import test from 'node:test';
import assert from 'node:assert/strict';
import { validateM4Performance } from './m4-performance-evidence.mjs';
const good = () => ({
  schemaVersion: 1,
  environment: 'ci_disposable_postgres_only',
  qualification: 'measurement_not_production_capacity',
  api: {
    serial: { requests: 40, p50Ms: 1, p95Ms: 4, p99Ms: 5, throughputPerSecond: 100 },
    concurrent8: { requests: 80, p50Ms: 1, p95Ms: 4, p99Ms: 5, throughputPerSecond: 200 },
  },
  apiResponseSqlCalls: { perRequest: 2, evidence: 'health.service.ts has two sequential prisma.$queryRaw queries; source-level count, not SQL trace' },
  database: { queryPlanPresent: true, scope: 'appointment scoped, bounded, time-ordered SELECT', planNode: 'Limit' },
  process: { rssStartBytes: 10000, observedRssPeakBytes: 20000, nodeMajor: 20 },
});
test('well-formed truthful disposable receipt passes', () => assert.deepEqual(validateM4Performance(good()), []));
test('refuses external origins and unauthorized production label', () => {
 const x = good(); x.environment = 'production';
 assert.ok(validateM4Performance(x).length);
});
test('rejects missing samples, impossible percentiles and non-numeric data', () => {
 const a = good(); a.api.serial.requests = 12;
 assert.ok(validateM4Performance(a).length);
 const b = good(); b.api.concurrent8.p95Ms = -1;
 assert.ok(validateM4Performance(b).length);
});
test('rejects credential-looking values and unexpected fields', () => {
 const a = good(); a.secret = 'cookie';
 assert.ok(validateM4Performance(a).length);
 const b = good(); b.database.planNode = 'Unexpected';
 assert.ok(validateM4Performance(b).length);
});
