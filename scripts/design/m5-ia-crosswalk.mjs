#!/usr/bin/env node
/**
 * M5-02 authoritative requirement-to-task-area crosswalk (PROPOSAL ONLY).
 * Inventory grouping is not evidence of UI discoverability or role authorization.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { csvRows, defaultDirectory } from '../qa/check-roadmap-registers.mjs';
import { buildAudit, PERSONAS } from '../qa/m5-route-audit.mjs';

export const AREA = Object.freeze({
  workspace: 'Today & workspace',
  care: 'Children & care',
  sessions: 'Sessions & activities',
  family: 'Family & home',
  operations: 'Center operations',
  scheduling: 'Scheduling & messages',
  governance: 'Safety & governance',
  account: 'Account & access',
});
const featureAreas = Object.freeze({
  'Advanced child / clinical': 'care',
  'Reports / home plans / AI': 'care',
  'Therapist sessions / activities / STT': 'sessions',
  'Guardian/family': 'family',
  'Center/platform operations': 'operations',
  'Scheduling / coordination': 'scheduling',
  'Governance / safety': 'governance',
});
const workflowPrefixAreas = Object.freeze({
  S: 'account', T: 'sessions', P: 'family', A: 'operations', X: 'workspace',
});
const workflowSpecialAreas = Object.freeze({
  'WF-RR': 'governance', 'WF-RW': 'governance',
  'WF-CR': 'care', 'WF-GM': 'care', 'WF-SE': 'sessions',
  'WF-CT': 'operations', 'WF-SG': 'governance', 'WF-TP': 'sessions',
});
const navAreas = Object.freeze({
  home: 'workspace', applications: 'operations', centers: 'operations',
  setup: 'operations', children: 'care', schedule: 'scheduling',
  messages: 'scheduling', clinical: 'sessions', governance: 'governance',
  'access-review': 'governance', progress: 'care', 'practice-feedback': 'sessions',
  activities: 'sessions', practice: 'family', 'family-progress': 'family',
  team: 'operations', center: 'operations', profile: 'account', security: 'account',
});

const rowsAsObjects = (filename, directory) => {
  const { header, data } = csvRows(filename, directory);
  return data.map(row => Object.fromEntries(header.map((name, i) => [name, row[i]])));
};
const areaForWorkflow = id => {
  if (workflowSpecialAreas[id]) return workflowSpecialAreas[id];
  const prefix = /^WF-([A-Z]+)\d+$/.exec(id)?.[1];
  if (!prefix || !workflowPrefixAreas[prefix]) throw new Error('Unmapped canonical workflow ' + id);
  return workflowPrefixAreas[prefix];
};
const requireKnownArea = area => {
  if (!Object.hasOwn(AREA, area)) throw new Error('Unknown IA task area ' + area);
  return area;
};

export function validateIaCrosswalk(model) {
  if (model.schemaVersion !== 1 || model.evidenceType !== 'NAVIGATION_DESIGN_CANDIDATE_NOT_APPROVED' ||
      model.governance.clinical !== 'NO_GO_G2_G2b' || model.governance.ownerSignoff !== 'NOT_OBTAINED')
    throw new Error('IA crosswalk cannot claim implementation or clinical/owner approval');
  if (model.features.length !== 66 || model.workflows.length !== 91 || model.navigation.length !== 20 ||
      model.roleReview.length !== 7) throw new Error('Missing canonical 66/91/20/7 inventory items');
  const check = (rows, key) => {
    if (new Set(rows.map(row => row[key])).size !== rows.length) throw new Error('Duplicate IA identifier');
    for (const row of rows) {
      requireKnownArea(row.proposedArea);
      if (row.discoverability !== 'NOT_TESTED' || row.ownerSignoff !== 'NOT_OBTAINED')
        throw new Error('IA row falsely certifies discoverability');
      if (row.status === 'V2_EXCLUDED' && row.proposedAvailability !== 'V2_NOT_IN_V1_NAV')
        throw new Error('V2 excluded item promoted to navigation');
      if (row.status !== 'V2_EXCLUDED' && row.proposedAvailability !== 'DESIGN_ONLY_PERMISSION_REVIEW_REQUIRED')
        throw new Error('Draft workflow incorrectly granted permission');
    }
  };
  check(model.features, 'id');
  check(model.workflows, 'id');
  if (model.features.find(x => x.id === '39')?.status !== 'V2_EXCLUDED' ||
      model.workflows.find(x => x.id === 'WF-X6')?.status !== 'V2_EXCLUDED')
    throw new Error('School integration cannot become V1 navigation');
  for (const n of model.navigation) {
    requireKnownArea(n.proposedArea);
    if (n.authorization !== 'EXISTING_SERVER_SESSION_PERMISSION_FILTER' ||
        n.discoverability !== 'NOT_TESTED' ||
        !/^\/[a-z0-9/_-]*$/i.test(n.href) ||
        (n.permission !== null && !/^[a-z.]+$/.test(n.permission))) {
      throw new Error('Existing nav may not be presented as unrestricted or proven');
    }
  }
  if (new Set(model.roleReview.map(x => x.persona)).size !== 7 ||
      model.roleReview.some(x => x.permissionReview !== 'NOT_TESTED' ||
        x.accessDecision !== 'RUNTIME_SESSION_PERMISSIONS_ONLY'))
    throw new Error('Role matrix must not infer unverified grants');
  return true;
}

export async function buildIaCrosswalk({ directory = defaultDirectory, sourceAudit } = {}) {
  const features = rowsAsObjects('M4-01-66-FEATURE-CROSSWALK.csv', directory);
  const workflows = rowsAsObjects('M4-01-91-WORKFLOW-REGISTER.csv', directory);
  const audit = sourceAudit ?? await buildAudit();
  const records = {
    features: features.map(r => ({
      id: r.original_id, title: r.capability, sourceGroup: r.original_group,
      workUnit: r.new_work_unit, status: r.reconciliation_state,
      proposedArea: requireKnownArea(featureAreas[r.original_group]),
      proposedAvailability: r.reconciliation_state === 'V2_EXCLUDED' ?
        'V2_NOT_IN_V1_NAV' : 'DESIGN_ONLY_PERMISSION_REVIEW_REQUIRED',
      discoverability: 'NOT_TESTED', ownerSignoff: 'NOT_OBTAINED',
    })),
    workflows: workflows.map(r => ({
      id: r.workflow_id, title: r.controlled_workflow,
      workUnit: r.new_work_unit, status: r.reconciliation_state,
      proposedArea: requireKnownArea(areaForWorkflow(r.workflow_id)),
      proposedAvailability: r.reconciliation_state === 'V2_EXCLUDED' ?
        'V2_NOT_IN_V1_NAV' : 'DESIGN_ONLY_PERMISSION_REVIEW_REQUIRED',
      discoverability: 'NOT_TESTED', ownerSignoff: 'NOT_OBTAINED',
    })),
    navigation: audit.navigation.map(n => ({
      key: n.key, title: n.label, href: n.href, permission: n.permission,
      proposedArea: requireKnownArea(n.key === 'activities' && n.permission === 'family.activities.read'
        ? 'family' : navAreas[n.key]),
      authorization: 'EXISTING_SERVER_SESSION_PERMISSION_FILTER',
      discoverability: 'NOT_TESTED',
    })),
  };
  const model = {
    schemaVersion: 1,
    evidenceType: 'NAVIGATION_DESIGN_CANDIDATE_NOT_APPROVED',
    source: 'M4-01 canonical CSV inventories + current ProductShell NAV source',
    governance: { clinical: 'NO_GO_G2_G2b', ownerSignoff: 'NOT_OBTAINED',
      humanTaskTesting: 'NOT_RUN', visualReview: 'NOT_RUN' },
    areas: Object.entries(AREA).map(([key, label]) => ({ key, label })),
    ...records,
    roleReview: PERSONAS.map(p => ({
      persona: p.id, role: p.role, specialty: p.specialty ?? null,
      permissionReview: 'NOT_TESTED',
      accessDecision: 'RUNTIME_SESSION_PERMISSIONS_ONLY',
    })),
    summary: {
      proposedTaskAreas: Object.keys(AREA).length,
      originalFeatures: records.features.length,
      originalWorkflows: records.workflows.length,
      existingNavItems: records.navigation.length,
      personas: PERSONAS.length,
      excludedFromV1: 2,
      fullyProvenDiscoverable: 0,
      privacy: 'STRUCTURED_REQUIREMENT_NAMES_ONLY_NO_PATIENT_DATA',
    },
    knownGaps: [
      'Area grouping is a DESIGN PROPOSAL; no UI routes, permission grants or redirects added',
      'No exact workflow-to-screen success proof, signed step mappings or owner signoff',
      'Do not confuse 66/91 row coverage with functional discoverability',
      'Role-permission mapping requires runtime session and specialty checks before a nav refactor',
      'Family/theme/keyboard/screen-reader/low-bandwidth acceptance remains open',
    ],
  };
  validateIaCrosswalk(model);
  return model;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node m5-ia-crosswalk.mjs [output.json]');
    const model = await buildIaCrosswalk();
    if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(model, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify(model.summary));
  } catch (err) {
    console.error('M5-02 IA design crosswalk BLOCKED:', err.message);
    process.exitCode = 1;
  }
}
