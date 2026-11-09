#!/usr/bin/env node
// Strictly allowlisted numeric-only synthetic CI receipt. Reject untrusted
// nested structures before any upload; never print received values.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function exactKeys(input, allowed) {
  return input !== null && typeof input === 'object' && !Array.isArray(input) &&
    Object.keys(input).length === allowed.length &&
    allowed.every(key => Object.hasOwn(input, key));
}
function finiteNonnegative(n) { return typeof n === 'number' && Number.isFinite(n) && n >= 0; }
const sqlEvidence = 'health.service.ts has two sequential prisma.$queryRaw queries; source-level count, not SQL trace';

export function validateM4Performance(report) {
  const errors = [];
  if (!exactKeys(report, ['schemaVersion', 'environment', 'qualification', 'api', 'apiResponseSqlCalls', 'database', 'process'])) {
    return ['Unexpected top-level or missing keys'];
  }
  if (report.schemaVersion !== 1 || report.environment !== 'ci_disposable_postgres_only' ||
      report.qualification !== 'measurement_not_production_capacity') errors.push('Wrong synthetic-only source');
  if (!exactKeys(report.api, ['serial', 'concurrent8'])) {
    errors.push('Unexpected or missing workload keys');
  } else {
    for (const [label, count] of [['serial', 40], ['concurrent8', 80]]) {
      const row = report.api[label];
      if (!exactKeys(row, ['requests', 'p50Ms', 'p95Ms', 'p99Ms', 'throughputPerSecond'])) {
        errors.push('Unexpected or missing metric fields: ' + label); continue;
      }
      if (row.requests !== count || !Number.isInteger(row.requests)) errors.push('Invalid workload count');
      for (const field of ['p50Ms', 'p95Ms', 'p99Ms', 'throughputPerSecond']) {
        if (!finiteNonnegative(row[field])) errors.push('Invalid metric type or range');
      }
      if (!(row.p50Ms <= row.p95Ms && row.p95Ms <= row.p99Ms)) errors.push('Invalid ordered percentiles');
    }
  }
  if (!exactKeys(report.apiResponseSqlCalls, ['perRequest', 'evidence']) ||
      report.apiResponseSqlCalls.perRequest !== 2 || report.apiResponseSqlCalls.evidence !== sqlEvidence) {
    errors.push('Unexpected or unverified SQL count metadata');
  }
  if (!exactKeys(report.database, ['queryPlanPresent', 'scope', 'planNode']) ||
      report.database.queryPlanPresent !== true ||
      report.database.scope !== 'appointment scoped, bounded, time-ordered SELECT' ||
      !['Limit', 'Sort', 'Index Scan', 'Index Only Scan', 'Bitmap Heap Scan', 'Seq Scan'].includes(report.database.planNode)) {
    errors.push('Unexpected or invalid query plan metadata');
  }
  if (!exactKeys(report.process, ['rssStartBytes', 'observedRssPeakBytes', 'nodeMajor']) ||
      !Number.isSafeInteger(report.process.rssStartBytes) || report.process.rssStartBytes <= 0 ||
      !Number.isSafeInteger(report.process.observedRssPeakBytes) ||
      report.process.observedRssPeakBytes < report.process.rssStartBytes ||
      report.process.nodeMajor !== 20) {
    errors.push('Unexpected or invalid process metadata');
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const file = process.argv[2];
    if (file !== '.workspace/m4-performance/m4-07-synthetic-api.json') throw Error('Disallowed path');
    const report = JSON.parse(readFileSync(file, 'utf8'));
    const errors = validateM4Performance(report);
    if (errors.length) {
      console.error('FAIL: synthetic performance receipt rejected:', errors.join('; '));
      process.exitCode = 1;
    } else {
      console.log('PASS: synthetic-only numeric receipt schema validated (NOT production capacity)');
    }
  } catch {
    console.error('FAIL: synthetic performance receipt missing or invalid');
    process.exitCode = 1;
  }
}
