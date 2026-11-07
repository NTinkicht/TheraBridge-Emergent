#!/usr/bin/env node
/**
 * M4-01 roadmap register integrity validation. This checks *inventory structure
 * and honest evidence states*, not implementation or clinical authorization.
 *
 * Usage: node scripts/qa/check-roadmap-registers.mjs [directory]
 * Node built-in only. Optional directory enables isolated negative-path tests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const defaultDirectory = path.join(root, 'docs/roadmap');
export const acceptedStates = new Set([
  'PENDING_VERIFICATION', 'VERIFIED_IMPLEMENTED', 'PARTIAL', 'MISSING',
  'POLICY_BLOCKED', 'SUPERSEDED', 'DUPLICATE', 'V2_EXCLUDED'
]);
export const unitPattern = /^(?:M(?:4|5|6|7|8|9|10|11)-\d{2}|V2-DEFERRED)$/;

export function csvRows(filename, directory = defaultDirectory) {
  const source = fs.readFileSync(path.join(directory, filename), 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"') {
      if (value !== '') throw new Error(filename + ': invalid quote in unquoted field');
      quoted = true;
    } else if (c === ',') { row.push(value); value = ''; }
    else if (c === '\n') {
      row.push(value.replace(/\r$/, ''));
      if (row.some(Boolean)) rows.push(row);
      row = []; value = '';
    } else value += c;
  }
  if (quoted) throw new Error(filename + ': unterminated quoted CSV cell');
  if (value.length || row.length) { row.push(value); if (row.some(Boolean)) rows.push(row); }
  const [header, ...data] = rows;
  if (!header) throw new Error(filename + ': empty file');
  for (const [i, r] of data.entries()) {
    if (r.length !== header.length) throw new Error(filename + ': malformed CSV row ' + (i + 2));
  }
  return { header, data };
}

function requireColumn(file, header, name) {
  const idx = header.indexOf(name);
  if (idx === -1) throw new Error(file + ': missing column ' + name);
  return idx;
}

export function validateDirectory(directory = defaultDirectory) {
  const files = [
    ['M4-01-66-FEATURE-CROSSWALK.csv', 66, 'original_id'],
    ['M4-01-91-WORKFLOW-REGISTER.csv', 91, 'workflow_id'],
    ['M4-01-55-OWNER-REQUIREMENTS.csv', 55, 'requirement_id']
  ];
  const result = new Map();
  for (const [filename, expected, key] of files) {
    const { header, data } = csvRows(filename, directory);
    const idIdx = requireColumn(filename, header, key);
    const stateIdx = requireColumn(filename, header, 'reconciliation_state');
    const unitIdx = requireColumn(filename, header, 'new_work_unit');
    const acceptanceIdx = requireColumn(filename, header, 'acceptance_evidence');
    if (data.length !== expected) throw new Error(filename + ': expected ' + expected + ' rows, got ' + data.length);
    const ids = data.map(r => r[idIdx]);
    if (new Set(ids).size !== expected) throw new Error(filename + ': repeated identifiers');
    for (const r of data) {
      const [id, unit, state, evidence] = [r[idIdx], r[unitIdx], r[stateIdx], r[acceptanceIdx]];
      if (!acceptedStates.has(state)) throw new Error(filename + ': ' + id + ' invalid state ' + state);
      if (!unitPattern.test(unit)) throw new Error(filename + ': ' + id + ' invalid work unit ' + unit);
      if (unit === 'M4-01') throw new Error(filename + ': ' + id + ' no implementation owner');
      if (state === 'VERIFIED_IMPLEMENTED' && !evidence.trim()) {
        throw new Error(filename + ': ' + id + ' marked verified without acceptance evidence');
      }
      if ((unit === 'V2-DEFERRED') !== (state === 'V2_EXCLUDED')) {
        throw new Error(filename + ': ' + id + ' V2 deferral/state mismatch');
      }
    }
    if (key === 'original_id' && ids.some((id, i) => Number(id) !== i + 1)) throw new Error(filename + ': nonsequential feature IDs');
    if (key === 'requirement_id' && ids.some((id, i) => id !== 'OB-' + String(i + 1).padStart(2, '0'))) throw new Error(filename + ': nonsequential owner IDs');
    result.set(filename, { header, data });
  }
  const workflows = result.get(files[1][0]), features = result.get(files[0][0]);
  const workflowId = workflows.header.indexOf('workflow_id');
  const wfX6 = workflows.data.find(r => r[workflowId] === 'WF-X6');
  if (!wfX6 || wfX6[workflows.header.indexOf('v1_scope')] !== 'V2 EXCLUDED' ||
      wfX6[workflows.header.indexOf('new_work_unit')] !== 'V2-DEFERRED') {
    throw new Error('WF-X6 must remain V2 excluded');
  }
  const fId = features.header.indexOf('original_id'), fUnit = features.header.indexOf('new_work_unit');
  const school = features.data.find(r => r[fId] === '39');
  if (!school || school[fUnit] !== 'V2-DEFERRED') {
    throw new Error('Feature #39 school integration must remain V2-DEFERRED to match WF-X6');
  }
  return files.map(([filename, n]) => filename + ': ' + n + ' unique entries OK');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    for (const line of validateDirectory(process.argv[2] ? path.resolve(process.argv[2]) : defaultDirectory)) {
      console.log(line);
    }
    console.log('M4-01 structural / evidence-integrity checks PASSED (not clinical qualification)');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
