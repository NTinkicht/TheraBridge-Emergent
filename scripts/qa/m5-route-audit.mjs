#!/usr/bin/env node
/**
 * M5-01: deterministic SOURCE inventory, not a browser or accessibility audit.
 * Never reads a running deployment, passwords, session cookies, or patient data.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const VIEWPORTS = [320, 390, 768, 1024, 1440];
export const PERSONAS = [
  { id: 'platform-admin', role: 'PLATFORM_ADMIN', routes: ['/app', '/app/applications', '/app/centers', '/select-context', '/account/security'] },
  { id: 'center-admin', role: 'CENTER_ADMIN', routes: ['/app', '/app/setup', '/app/children', '/app/team', '/app/center'] },
  { id: 'coordinator', role: 'COORDINATOR', routes: ['/app', '/app/schedule', '/app/children', '/app/messages', '/app/activities'] },
  { id: 'speech-therapist', role: 'THERAPIST', specialty: 'speech', routes: ['/app', '/app/clinical', '/app/schedule', '/app/practice-feedback', '/app/activities'] },
  { id: 'ot-therapist', role: 'THERAPIST', specialty: 'occupational', routes: ['/app', '/app/clinical', '/app/schedule', '/app/practice-feedback', '/app/activities'] },
  { id: 'supervisor', role: 'CLINICAL_SUPERVISOR', routes: ['/app', '/app/clinical', '/app/governance', '/app/progress', '/app/messages'] },
  { id: 'guardian', role: 'GUARDIAN', routes: ['/app', '/app/practice', '/app/family-progress', '/app/activities', '/account/security'] },
];

async function enumerate(dir, prefix = '') {
  const result = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) continue; // Avoid following outside-source or cycle links.
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('_')) result.push(...await enumerate(join(dir, entry.name), rel));
    } else if (entry.isFile()) {
      result.push(rel);
    }
  }
  return result;
}

export function routeFromFile(file) {
  if (!/(^|\/)page\.(tsx|ts|jsx|js)$/.test(file)) return null;
  const segments = file.split('/').slice(0, -1);
  if (segments.some(s => s.startsWith('@') || s.startsWith('(.)') || s.startsWith('(..)') || s.startsWith('(...)'))) return null;
  const normalized = segments.filter(s => !(s.startsWith('(') && s.endsWith(')'))).map(s => {
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(s)) return ':' + s.slice(5, -2) + '*';
    if (/^\[\.\.\.[^\]]+\]$/.test(s)) return ':' + s.slice(4, -1) + '+';
    if (/^\[[^\]]+\]$/.test(s)) return ':' + s.slice(1, -1);
    return s;
  });
  return '/' + normalized.join('/');
}

export function parseNav(source) {
  const match = source.match(/const NAV:[\s\S]*?=\s*\[([\s\S]*?)\n\];/);
  if (!match) throw new Error('ProductShell NAV definition missing or changed: manual review required');
  const raw = match[1];
  // The navigation contract is intentionally literal-only. Unrecognized spreads,
  // references, comments, computed fields or nested expressions BLOCK rather than
  // silently disappearing from the source audit.
  const entries = [], expression = /\{([^{}]*)\}/g;
  let cursor = 0;
  for (const item of raw.matchAll(expression)) {
    if (!/^[\s,]*$/.test(raw.slice(cursor, item.index))) throw new Error('Unsupported NAV syntax outside literal item');
    cursor = item.index + item[0].length;
    const fields = new Map();
    for (const fragment of item[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const field = fragment.match(/^([A-Za-z]+)\s*:\s*(.+)$/s);
      if (!field || !['key', 'href', 'icon', 'label', 'short', 'permission'].includes(field[1]) ||
          fields.has(field[1])) throw new Error('Unsupported or duplicate NAV field');
      const name = field[1], value = field[2].trim();
      if (name === 'icon') {
        if (!/^[A-Za-z_$][\w$]*$/.test(value)) throw new Error('Unsupported NAV icon expression');
        fields.set(name, value);
      } else {
        const str = value.match(/^(['"])([^'"]*)\1$/);
        if (!str || !str[2] || str[2].includes('\\')) throw new Error('Unsupported NAV literal value for ' + name);
        fields.set(name, str[2]);
      }
    }
    if (!fields.has('key') || !fields.has('href') || !fields.has('label') ||
        !fields.has('short') || !fields.has('icon')) throw new Error('Incomplete NAV literal item');
    const href = fields.get('href');
    if (!/^\/[a-zA-Z0-9/_.-]*$/.test(href)) throw new Error('Unsafe NAV href');
    entries.push({ key: fields.get('key'), href, label: fields.get('label'),
      permission: fields.get('permission') ?? null });
  }
  if (!/^[\s,]*$/.test(raw.slice(cursor))) throw new Error('Unparsed NAV entries or spread syntax');
  if (!entries.length) throw new Error('Empty NAV extraction: cannot certify route inventory');
  return entries;
}

export function capturePlan(personas = PERSONAS, viewports = VIEWPORTS) {
  if (new Set(personas.map(p => p.id)).size !== personas.length ||
      viewports.some(v => !Number.isInteger(v) || v < 240 || v > 3000)) throw new Error('Invalid capture plan');
  return personas.flatMap(persona => viewports.flatMap(width => persona.routes.map((route, index) => ({
    persona: persona.id, role: persona.role, specialty: persona.specialty ?? null,
    viewportWidth: width, taskEntryNumber: index + 1, entryRoute: route,
    screenshotStatus: 'NOT_RUN', keyboardStatus: 'NOT_RUN',
    screenReaderStatus: 'NOT_RUN', navigationTimingStatus: 'NOT_RUN',
    taskCompletionStatus: 'NOT_RUN', ownerSignoff: 'NOT_OBTAINED',
  }))));
}

const sha256 = value => createHash('sha256').update(value).digest('hex');

export async function buildAudit({ appRoot = resolve('apps/web/src/app'), navPath = resolve('apps/web/src/components/auth/ProductShell.tsx') } = {}) {
  const files = await enumerate(appRoot);
  const pageFiles = files.filter(f => /(^|\/)page\.(tsx|ts|jsx|js)$/.test(f));
  const routes = [], specialPages = [], seen = new Map();
  for (const file of pageFiles) {
    const url = routeFromFile(file);
    if (!url) { specialPages.push({ file, reason: 'SLOT_OR_INTERCEPTING_ROUTE_REQUIRES_MANUAL_REVIEW' }); continue; }
    if (seen.has(url)) throw new Error('Duplicate canonical route ' + url + ': ' + seen.get(url) + ' and ' + file);
    seen.set(url, file);
    const source = await readFile(join(appRoot, ...file.split('/')), 'utf8');
    const directory = file.split('/').slice(0, -1).join('/');
    const prefix = directory ? directory + '/' : '';
    const ancestors = directory ? directory.split('/') : [];
    const ancestorPrefixes = ['', ...ancestors.map((_, i) => ancestors.slice(0, i + 1).join('/') + '/')];
    const neighboring = ancestorPrefixes.flatMap(p => ['layout', 'loading', 'error', 'not-found', 'template'].filter(n => files.some(f => f === p + n + '.tsx' || f === p + n + '.jsx')).map(n => p + n));
    routes.push({
      route: url, sourceFile: 'apps/web/src/app/' + file, sourceSha256: sha256(source),
      sourceLines: source.split('\n').length,
      staticHints: { jsxH1Tags: (source.match(/<h1\b/g) ?? []).length,
        buttonTags: (source.match(/<button\b/g) ?? []).length,
        formTags: (source.match(/<form\b/g) ?? []).length,
        uniqueTestIds: new Set([...source.matchAll(/data-testid=["'\\x60]([^"'\\x60]+)["'\\x60]/g)].map(m => m[1])).size,
        directWorkspacePermissions: [...new Set([...source.matchAll(/\bpermission="([^"]+)"/g)].map(m => m[1]))].sort(),
        clientComponent: /^\s*['"]use client['"]/.test(source),
      },
      routeSupportFiles: neighboring,
      requiresVisualReview: true,
      status: 'SOURCE_INDEXED_ONLY',
    });
  }
  if (!routes.length || !routes.some(r => r.route === '/app') || !routes.some(r => r.route === '/login')) {
    throw new Error('Critical app/login route absent; do not publish partial inventory');
  }
  const nav = parseNav(await readFile(navPath, 'utf8'));
  const missingNavRoutes = nav.filter(n => !seen.has(n.href));
  if (missingNavRoutes.length) throw new Error('ProductShell navigation targets missing page route: ' + missingNavRoutes.map(n => n.href).join(', '));
  const plans = capturePlan();
  const missingTaskEntries = [...new Set(plans.filter(p => !seen.has(p.entryRoute)).map(p => p.entryRoute))];
  if (missingTaskEntries.length) throw new Error('Persona task entry routes missing: ' + missingTaskEntries.join(', '));
  const hints = routes.filter(r => r.sourceLines > 350 || r.staticHints.buttonTags >= 8).map(r => ({
    route: r.route, reason: 'SOURCE_COMPLEXITY_TRIAGE_ONLY', sourceLines: r.sourceLines,
    buttonTags: r.staticHints.buttonTags,
  }));
  return {
    schemaVersion: 1,
    evidenceType: 'STATIC_SOURCE_NOT_SCREENSHOT',
    environment: 'CHECKED_OUT_SOURCE_ONLY',
    privacy: 'NO_ACCOUNT_SECRETS_NO_PATIENT_RECORDS',
    approvals: { ux: 'NOT_OBTAINED', accessibility: 'NOT_OBTAINED', clinical: 'NO_GO_G2_G2b' },
    summary: { canonicalPages: routes.length, specialPages: specialPages.length, navEntries: nav.length,
      personas: PERSONAS.length, viewports: VIEWPORTS.length, plannedEntryCaptures: plans.length, screenshotsCaptured: 0 },
    routes: routes.sort((a, b) => a.route.localeCompare(b.route)),
    specialPages, navigation: nav, sourceComplexityCandidates: hints, captureTargets: plans,
    evidenceLimitations: ['No browser capture or visual review', 'No role permission runtime assertion',
      'No real click count or task duration', 'No keyboard, screen-reader or low-bandwidth testing',
      'Client-side components and conditional UI may not appear in page source counts'],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const out = process.argv[2];
    if (process.argv.length > 3 || (out && (out.startsWith('-') || out === '/'))) throw new Error('Usage: node m5-route-audit.mjs [output.json]');
    const audit = await buildAudit();
    if (out) await writeFile(out, JSON.stringify(audit, null, 2) + '\n', { flag: 'w', mode: 0o600 });
    console.log(JSON.stringify({ evidenceType: audit.evidenceType, summary: audit.summary,
      limitations: audit.evidenceLimitations.length }));
  } catch (error) {
    console.error('M5-01 route inventory BLOCKED:', error.message);
    process.exitCode = 1;
  }
}
