#!/usr/bin/env node
// Numeric-only CI receipt guard: no HTTP bodies, cookies, names or raw SQL.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export function validateM4Performance(report) {
  const errors = [];
  if (!report || report.schemaVersion !== 1 ||
      report.environment !== 'ci_disposable_postgres_only' ||
      report.qualification !== 'measurement_not_production_capacity') {
    errors.push('Unqualified or non-disposable source'); return errors;
  }
  const keys = Object.keys(report).sort();
  if (keys.join(',') !== ['api','apiResponseSqlCalls','database','environment','process','qualification','schemaVersion'].sort().join(',')) errors.push('Unexpected top-level keys');
  for (const name of ['serial', 'concurrent8']) {
    const row = report.api?.[name];
    if (!row) { errors.push('Missing workload ' + name); continue; }
    for (const field of ['requests','p50Ms','p95Ms','p99Ms','throughputPerSecond']) {
      if (!Number.isFinite(row[field]) || row[field] < 0) errors.push('Invalid ' + name + '.' + field);
    }
    if (row.p50Ms > row.p95Ms || row.p95Ms > row.p99Ms) errors.push('Invalid percentiles');
    if (Object.keys(row).length !== 5) errors.push('Unexpected workload keys');
  }
  if (report.api?.serial?.requests !== 40 || report.api?.concurrent8?.requests !== 80) errors.push('Incomplete workload requests');
  if (report.apiResponseSqlCalls?.perRequest !== 2 || report.apiResponseSqlCalls?.evidence !== 'health.service.ts has two sequential prisma.$queryRaw queries; source-level count, not SQL trace') errors.push('Unverified SQL count declaration');
  if (report.database?.queryPlanPresent !== true ||
    report.database?.scope !== 'appointment scoped, bounded, time-ordered SELECT' ||
    !['Limit','Sort','Index Scan','Index Only Scan','Bitmap Heap Scan','Seq Scan'].includes(report.database?.planNode)) errors.push('Invalid PostgreSQL plan receipt');
  if (!Number.isInteger(report.process?.rssStartBytes) || !Number.isInteger(report.process?.observedRssPeakBytes) ||
      report.process.rssStartBytes <= 0 ||
      report.process.observedRssPeakBytes < report.process.rssStartBytes ||
      report.process.nodeMajor !== 20) errors.push('Invalid resource/runtime receipt');
  if (JSON.stringify(report).match(/password|authorization|bearer|cookie|postgresql:\/\//i)) errors.push('Forbidden receipt content');
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const path = process.argv[2];
    if (path !== '.workspace/m4-performance/m4-07-synthetic-api.json') throw Error('Expected repository-local numeric-only report');
    const errors = validateM4Performance(JSON.parse(readFileSync(path, 'utf8')));
    if (errors.length) { console.error('FAIL: synthetic performance receipt invalid:', errors.join('; ')); process.exitCode = 1; }
    else console.log('PASS: isolated synthetic API measurement receipt schema valid (not production load qualification)');
  } catch {
    console.error('FAIL: synthetic measurement receipt missing or invalid');
    process.exitCode = 1;
  }
}
