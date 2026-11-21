#!/usr/bin/env node
// Diagnostic-only, sanitized per-module coverage hotspots. Source-file names
// and numeric counters only. No clinical payloads, raw source, or runner paths.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const input = resolve(root, '.workspace/m4-coverage/web-istanbul/coverage-summary.json');
const output = resolve(root, '.workspace/m4-coverage/m4-web-hotspots.json');
const metrics = ['lines', 'branches', 'functions', 'statements'];
const sourceRoot = 'apps/web/src/';
function fail(message) { throw new Error('M4-08 hotspot audit: ' + message); }
export function report(summary) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary) || !summary.total) fail('missing total');
  const keys = Object.keys(summary).filter(x=>x!=='total');
  if (!keys.length) fail('empty denominator');
  const seen = new Set();
  const files = keys.map(key=>{
    const normalized = key.replaceAll('\\', '/');
    const marker = '/apps/web/src/';
    const relative = normalized.includes(marker)
      ? sourceRoot + normalized.slice(normalized.lastIndexOf(marker) + marker.length)
      : normalized.startsWith(sourceRoot) ? normalized : null;
    if (!relative || !/^apps\/web\/src\/[A-Za-z0-9_./@+()[\]-]+\.(?:tsx?|jsx?|mjs)$/.test(relative) ||
      relative.includes('/../') || relative.includes('//')) fail('invalid source path');
    if (seen.has(relative)) fail('duplicate source path');
    seen.add(relative);
    const coverage = {};
    for (const metric of metrics) {
      const data = summary[key]?.[metric];
      if (!data || !Number.isSafeInteger(data.total) || data.total < 0 ||
        !Number.isSafeInteger(data.covered) || data.covered < 0 || data.covered > data.total ||
        !Number.isFinite(data.pct) || data.pct < 0 || data.pct > 100) fail('malformed metric');
      coverage[metric] = {total:data.total,covered:data.covered};
    }
    return {path:relative,coverage,uncoveredLines:coverage.lines.total-coverage.lines.covered};
  });
  const totals = {};
  for (const metric of metrics) {
    const sum=files.reduce((a,f)=>({total:a.total+f.coverage[metric].total,covered:a.covered+f.coverage[metric].covered}),{total:0,covered:0});
    const stated=summary.total[metric];
    if (!stated || sum.total!==stated.total || sum.covered!==stated.covered || sum.total===0) fail('total mismatch');
    totals[metric]={total:sum.total,covered:sum.covered,pct:Number((100*sum.covered/sum.total).toFixed(2))};
  }
  files.sort((a,b)=>b.uncoveredLines-a.uncoveredLines || a.path.localeCompare(b.path));
  return {
    schemaVersion:1,kind:'m4_web_source_executed_hotspot_diagnostic_not_release_gate',
    sourceScope:'apps/web/src/**/*.{ts,tsx,js,jsx,mjs}',
    sourceFileCount:files.length,
    zeroStatementCoverageFiles:files.filter(f=>f.coverage.statements.covered===0).length,
    totals,
    // Additional numeric-only per-file shortfalls: source coverage counters,
    // not clinical data or original Istanbul execution traces.
    topUncoveredBranches:[...files].sort((a,b)=>
      (b.coverage.branches.total-b.coverage.branches.covered)-
      (a.coverage.branches.total-a.coverage.branches.covered) || a.path.localeCompare(b.path)
    ).slice(0,35).map(f=>({
      path:f.path,uncoveredBranches:f.coverage.branches.total-f.coverage.branches.covered,
      branchPercent:f.coverage.branches.total?Number((100*f.coverage.branches.covered/f.coverage.branches.total).toFixed(2)):100
    })),
    topUncoveredFunctions:[...files].sort((a,b)=>
      (b.coverage.functions.total-b.coverage.functions.covered)-
      (a.coverage.functions.total-a.coverage.functions.covered) || a.path.localeCompare(b.path)
    ).slice(0,35).map(f=>({
      path:f.path,uncoveredFunctions:f.coverage.functions.total-f.coverage.functions.covered
    })),
    topUncoveredStatements:[...files].sort((a,b)=>
      (b.coverage.statements.total-b.coverage.statements.covered)-
      (a.coverage.statements.total-a.coverage.statements.covered) || a.path.localeCompare(b.path)
    ).slice(0,35).map(f=>({
      path:f.path,uncoveredStatements:f.coverage.statements.total-f.coverage.statements.covered
    })),
    topUncoveredLines:files.slice(0,35).map(f=>({
      path:f.path,uncoveredLines:f.uncoveredLines,
      linePercent:f.coverage.lines.total?Number((100*f.coverage.lines.covered/f.coverage.lines.total).toFixed(2)):100,
      branchPercent:f.coverage.branches.total?Number((100*f.coverage.branches.covered/f.coverage.branches.total).toFixed(2)):100,
    })),
    note:'Diagnostic prioritization only. No exclusions, authorization or clinical PASS inferred.'
  };
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result = report(JSON.parse(readFileSync(input, 'utf8')));
  mkdirSync(dirname(output), {recursive:true});
  writeFileSync(output, JSON.stringify(result,null,2)+'\n', {mode:0o600});
  console.log('M4-08 sanitized Web hotspot evidence generated ('+result.sourceFileCount+' files); never a coverage pass.');
}
