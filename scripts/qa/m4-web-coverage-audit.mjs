#!/usr/bin/env node
// M4-08 full Web Istanbul coverage provenance audit.
// Every actual Web source module must be present in the denominator, even at 0%.
// Emit only aggregate numeric statistics; never export raw per-file traces.
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const metrics = ['lines', 'branches', 'functions', 'statements'];
function listSources(root) {
  const found = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw Error('symlink_source_not_supported');
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) found.push(resolve(path));
    }
  }
  walk(root);
  return found.sort();
}
function counts(row, metric, allowZero = false) {
  const value = row?.[metric];
  if (!value || !Number.isSafeInteger(value.total) || (allowZero ? value.total < 0 : value.total <= 0) ||
      !Number.isSafeInteger(value.covered) || value.covered < 0 || value.covered > value.total ||
      Object.keys(value).some(k => !['total', 'covered', 'skipped', 'pct'].includes(k))) throw Error('invalid_'+metric);
  return { total: value.total, covered: value.covered };
}
// Independent source parser: type-only declarations and directives carry no
// executable statement coverage; runtime declarations must never be given an
// all-zero denominator merely to inflate percentages.
export function executableSource(path) {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.ES2022, true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : path.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TS);
  return source.statements.some(node =>
    ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) || ts.isEnumDeclaration(node) ||
    ts.isExportAssignment(node) || ts.isForStatement(node) ||
    ts.isIfStatement(node) || ts.isTryStatement(node) ||
    (ts.isExpressionStatement(node) && !ts.isStringLiteral(node.expression)));
}
export function auditWebCoverage({ summary, sourcePaths, webRoot, executablePaths }) {
  if (!summary?.total || !sourcePaths?.length) throw Error('missing_coverage_or_source');
  const root = resolve(webRoot);
  const expected = new Set(sourcePaths.map(p => resolve(p)));
  const executable = new Set((executablePaths ?? sourcePaths.filter(executableSource)).map(p => resolve(p)));
  if ([...executable].some(p => !expected.has(p))) throw Error('executable_outside_source_inventory');
  if (expected.size !== sourcePaths.length) throw Error('duplicate_source_path');
  const keys = Object.keys(summary).filter(k => k !== 'total');
  const actual = new Set();
  const totals = Object.fromEntries(metrics.map(m => [m, { total: 0, covered: 0 }]));
  for (const key of keys) {
    const path = resolve(key);
    if (actual.has(path)) throw Error('duplicate_instrumented_path');
    actual.add(path);
    if (!expected.has(path)) throw Error('unexpected_instrumented_source');
    const rel = relative(root, path);
    if (rel.startsWith('..' + sep) || rel === '..') throw Error('source_outside_web_root');
    if (executable.has(path) && (!Number.isSafeInteger(summary[key]?.statements?.total) || summary[key].statements.total === 0)) throw Error('executable_denominator_zero');
    for (const metric of metrics) {
      const value = counts(summary[key], metric, true);
      totals[metric].total += value.total;
      totals[metric].covered += value.covered;
    }
  }
  if (actual.size !== expected.size || [...expected].some(p => !actual.has(p))) throw Error('source_denominator_missing');
  const percentages = {};
  const below90 = [];
  for (const metric of metrics) {
    const total = counts(summary.total, metric);
    const calculated = totals[metric];
    if (total.total !== calculated.total || total.covered !== calculated.covered) throw Error('aggregate_mismatch_'+metric);
    const raw = total.covered * 100 / total.total;
    percentages[metric] = Math.round(raw * 100) / 100;
    if (raw < 90) below90.push(metric);
  }
  const unexecuted = keys.filter(k => summary[k].statements.covered === 0).length;
  return {
    schemaVersion: 1,
    kind: 'm4_web_full_source_instrumented_baseline_not_release_gate',
    sourceScope: 'apps/web/src/**/*.{ts,tsx,js,jsx,mjs}',
    sourceFileCount: expected.size,
    instrumentedFileCount: actual.size,
    zeroStatementCoverageFiles: unexecuted,
    percentages,
    below90,
    m4_08_gate: below90.length ? 'NOT_QUALIFIED' : 'METRIC_THRESHOLD_MET_REVIEW_REQUIRED',
    note: 'Real Istanbul instrumented source denominator, including unexecuted modules; not a clinical release or coverage exception approval',
  };
}
const direct = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  try {
    const root = resolve(process.cwd(), 'apps/web/src');
    if (!statSync(root).isDirectory()) throw Error('web_source_missing');
    const input = resolve(process.cwd(), '.workspace/m4-coverage/web-istanbul/coverage-summary.json');
    const data = JSON.parse(readFileSync(input, 'utf8'));
    const report = auditWebCoverage({ summary: data, sourcePaths: listSources(root), webRoot: root });
    const dir = resolve(process.cwd(), '.workspace/m4-coverage');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'm4-web-coverage-baseline.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    console.log('PASS: Web coverage audit includes every application source module; metrics remain separate from 90% acceptance');
    console.log(JSON.stringify(report));
  } catch (error) {
    console.error('FAIL: Web source-wide coverage could not be verified:', error.message);
    process.exitCode = 1;
  }
}
