#!/usr/bin/env node
/**
 * M5-02 Task-area IA inventory. SOURCE-DERIVED, NOT owner-accepted UX/66-91 traceability.
 * Grouping is a proposal only. Runtime permissions remain authoritative.
 */
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildAudit } from './m5-route-audit.mjs';

export const TASK_AREAS = Object.freeze([
  { id: 'overview', label: 'Overview', description: 'Return to your workspace' },
  { id: 'platform', label: 'Platform administration', description: 'Center applications and platform oversight' },
  { id: 'care', label: 'Care delivery', description: 'Children, scheduling, clinical work and reviews' },
  { id: 'collaboration', label: 'Collaboration & activities', description: 'Messages, practice feedback and shared activities' },
  { id: 'family', label: 'Family routines', description: 'Home practice, family progress and activities' },
  { id: 'center', label: 'Center administration', description: 'Setup, staffing, access and center information' },
  { id: 'account', label: 'My account', description: 'Profile and account security' },
]);

// Exact (route,permission) pairs: a single physical page can have distinct family
// and clinician affordances. No group can silently drop or weaken a permission.
export const NAV_TASK_AREA = Object.freeze({
  '/app|': 'overview',
  '/app/applications|platform.applications.read': 'platform',
  '/app/centers|platform.centers.read': 'platform',
  '/app/setup|center.setup.manage': 'center',
  '/app/children|center.children.read': 'care',
  '/app/schedule|center.schedule.read': 'care',
  '/app/messages|center.messages.use': 'collaboration',
  '/app/clinical|center.clinical.read': 'care',
  '/app/governance|center.clinical.read': 'care',
  '/app/access-review|center.governance.read': 'center',
  '/app/progress|center.clinical.read': 'care',
  '/app/practice-feedback|center.practice.read': 'collaboration',
  '/app/activities|center.activities.read': 'collaboration',
  '/app/activities|family.activities.read': 'family',
  '/app/practice|family.practice.read': 'family',
  '/app/family-progress|family.progress.demo': 'family',
  '/app/team|center.staff.read': 'center',
  '/app/center|center.settings.read': 'center',
  '/app/profile|center.profile.self': 'account',
  '/account/security|': 'account',
});
const key = nav => nav.href + '|' + (nav.permission ?? '');
const safe = value => typeof value === 'string' && /^\/[a-z0-9/_:.+-]*$/i.test(value) && !value.includes('//');

export function groupNavigation(navigation, routes, map = NAV_TASK_AREA) {
  if (!Array.isArray(navigation) || !Array.isArray(routes) ||
      navigation.length === 0 || routes.length === 0) throw new Error('Incomplete source inventory');
  const routeSet = new Set(routes.map(r => typeof r === 'string' ? r : r.route));
  const seen = new Set(), groups = new Map(TASK_AREAS.map(area => [area.id, []]));
  for (const nav of navigation) {
    if (!safe(nav.href) || !routeSet.has(nav.href) || (nav.permission !== null &&
      (typeof nav.permission !== 'string' || !/^[a-z][a-z0-9.]*$/.test(nav.permission))))
      throw new Error('Invalid route or permission: cannot propose grouped IA');
    const id = key(nav);
    if (seen.has(id)) throw new Error('Duplicate permission-specific navigation destination');
    seen.add(id);
    const area = map[id];
    if (!area || !groups.has(area)) throw new Error('Ungrouped navigation destination: ' + id);
    groups.get(area).push({ key: nav.key, href: nav.href, label: nav.label,
      permission: nav.permission, visibility: nav.permission ? 'PERMISSION_REQUIRED' : 'SESSION_SHELL',
      group: area });
  }
  // Detect stale explicit map entries, including deleted or renamed permissions.
  for (const id of Object.keys(map)) if (!seen.has(id)) throw new Error('Stale IA assignment: ' + id);
  return TASK_AREAS.map(area => ({ ...area, entries: groups.get(area.id) })).filter(area => area.entries.length);
}

export function visibleNavigation(groups, permissions) {
  if (!Array.isArray(permissions) || permissions.some(p => typeof p !== 'string')) throw new Error('Invalid permission set');
  const granted = new Set(permissions);
  return groups.map(group => ({
    ...group,
    entries: group.entries.filter(item => !item.permission || granted.has(item.permission)),
  })).filter(group => group.entries.length);
}

export function buildTaskArchitecture(audit) {
  if (audit?.schemaVersion !== 1 || audit?.evidenceType !== 'STATIC_SOURCE_NOT_SCREENSHOT' ||
      audit?.approvals?.clinical !== 'NO_GO_G2_G2b' ||
      audit?.approvals?.ux !== 'NOT_OBTAINED') throw new Error('Only unapproved source audits can seed an IA proposal');
  const groups = groupNavigation(audit.navigation, audit.routes);
  const primaryRoutes = new Set(audit.navigation.map(n => n.href));
  const omitted = audit.routes.filter(r => !primaryRoutes.has(r.route)).map(r => ({
    route: r.route,
    review: r.route.includes(':') ? 'DYNAMIC_DETAIL_OR_CONTEXT_REVIEW' : 'SECONDARY_OR_ENTRY_ROUTE_REVIEW',
  }));
  return {
    schemaVersion: 1,
    evidenceType: 'SOURCE_NAVIGATION_GROUPING_PROPOSAL_NOT_ACCEPTANCE',
    sourceEvidence: audit.evidenceType,
    privacy: 'SOURCE_ONLY_NO_ACCOUNT_SECRETS_OR_PATIENT_CONTENT',
    governance: { clinical: 'NO_GO_G2_G2b', uxSignoff: 'NOT_OBTAINED',
      accessibilitySignoff: 'NOT_OBTAINED', navigationDeployment: 'NOT_IMPLEMENTED' },
    summary: { existingNavEntries: audit.navigation.length,
      mappedNavEntries: groups.reduce((n,g) => n + g.entries.length,0),
      taskAreas: groups.length, canonicalPages: audit.routes.length,
      nonPrimaryRoutesForReview: omitted.length },
    taskAreas: groups, nonPrimaryRoutesForReview: omitted,
    controlledSourceGap: { expectedCapabilities: 66, expectedWorkflows: 91,
      expectedOwnerRequirements: 55, expectedHistoricalSteps: 1023,
      capabilityRowsMapped: 0, workflowRowsMapped: 0, ownerRowsMapped: 0,
      historicalStepsMapped: 0, status: 'BLOCKED_CANONICAL_SPEC_NOT_AVAILABLE',
      dependency: 'GH-266_AUTHORITATIVE_CONTROLLED_MATRIX_AND_VERSIONED_SPEC' },
    limits: ['Permission grouping does not grant route access or establish direct deep-link safety',
      'Unlinked source pages require independent inspection, not deletion',
      '66/91/55/1023 row-level traceability is not established',
      'No clickable prototype, human usability approval, visual audit or assistive-tech review'],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node m5-task-areas.mjs [output.json]');
    const output = process.argv[2];
    if (output && (output.startsWith('-') || output === '/')) throw new Error('Unsafe output path');
    const ia = buildTaskArchitecture(await buildAudit());
    if (output) await writeFile(output, JSON.stringify(ia, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ summary: ia.summary, blockedTraceability: ia.controlledSourceGap.status }));
  } catch (error) {
    console.error('M5-02 task-area inventory BLOCKED:', error.message);
    process.exitCode = 1;
  }
}
