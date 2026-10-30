#!/usr/bin/env node
// TB-EM-051: self-contained DESIGN-ONLY safety contract. No GitHub/AI/network
// access, database credentials, application commands, patient data or mutation.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(resolve(root, path), 'utf8');
const policy = JSON.parse(read('docs/policy/TB-EM-051-AUTHORIZATION-GATES.json'));

function validateUnsignedDesign(p) {
  assert.equal(p.schemaVersion, 1);
  assert.equal(p.workUnit, 'TB-EM-051');
  assert.equal(p.status, 'DESIGN_CANDIDATE_UNAPPROVED');
  assert.equal(p.clinicalActivation, 'BLOCKED', 'Clinical activation must remain BLOCKED');
  assert.equal(p.approvalKind, 'HUMAN_SIGNATURE_REQUIRED');
  assert.equal(p.signedPolicyCount, 0, 'Signed policy count must remain zero');
  assert.equal(p.executableTransferEnabled, false, 'Executable transfer must remain disabled');
  assert.equal(p.implementationAuthorization, 'NOT_GRANTED');
  assert.equal(p.humanDecisionEvidence, 'NOT_SUBMITTED');
  assert.deepEqual(p.approvals, [], 'Approvals must remain empty');
  assert.deepEqual([...p.appliesTo].sort(), ['ci','development','preview','production','staging']);
  assert.equal(p.canonicalSpecCandidate.operation, 'transferCaseload');
  assert.equal(p.canonicalSpecCandidate.state, 'PROPOSED_NOT_IMPLEMENTABLE');
  assert.ok(Array.isArray(p.decisionGates) && p.decisionGates.length >= 9);
  const ids = p.decisionGates.map(d => d.id);
  assert.equal(new Set(ids).size, ids.length, 'Decision gate IDs must be unique');
  for (const id of ['D10_TRANSFER','OR15_ROLE_MATRIX','OR16_IDEMPOTENCY_AND_DENIAL',
    'D7_CONSENT','CLINICAL_RECORD_SCOPE','DNEW5_SAFEGUARDING',
    'D4_GUARDIAN_RESTRICTIONS','D1_SIGNING','SECURITY_AND_AUDIT']) {
    assert.ok(ids.includes(id), `Missing protected decision gate ${id}`);
  }
  for (const gate of p.decisionGates) {
    assert.equal(gate.state, 'UNSIGNED', `Unsigned-only work unit cannot activate ${gate.id}`);
    for (const field of ['requiredOwnerRole', 'question', 'source'])
      assert.ok(typeof gate[field] === 'string' && gate[field].length >= 12,
        `Missing accountable decision context for ${gate.id}:${field}`);
  }
  // Preserve the entire proposed denial and concurrency test contract.
  // Any future change to its scope must be explicit and independently reviewed.
  const requiredScenarios = [
    'DENY_UNSIGNED_ALL_ENVS',
    'DENY_UNRELATED_TENANT',
    'DENY_DEACTIVATED_SOURCE_OR_TARGET',
    'DENY_WRONG_SERVICE',
    'DENY_STALE_ASSIGNMENT_VERSION',
    'DENY_WITH_OPEN_ITEMS_UNRESOLVED',
    'DENY_IF_GUARDIAN_RESTRICTED',
    'DENY_IF_CONSENT_WITHDRAWN',
    'DENY_IF_SIGNER_AUTHORITY_ASSUMED',
    'DENY_IF_SAFEGUARDING_POLICY_MISSING',
    'CONCURRENT_REVOKE_VS_COMMIT',
    'ATOMIC_ALL_OR_NOTHING',
    'NO_CROSS_SPECIALTY_CONTENT',
    'NO_UNRELEASED_FAMILY_DOCUMENT',
    'IDEMPOTENCY_SCOPE_BEFORE_REPLAY',
    'RETRY_UNKNOWN_OUTCOME',
    'EMERGENCY_SUSPEND_QUARANTINE',
    'AUDIT_PROVENANCE_WITHOUT_CLINICAL_TEXT',
  ];
  assert.deepEqual([...p.proposedTestScenarios].sort(), [...requiredScenarios].sort(),
    'Test scenarios must preserve the full 18-case unsigned transfer acceptance contract');
  for (const phrase of ['Operational proposal acknowledged', 'A draft consent record',
    'Existing manual child assignment controls']) {
    assert.ok(p.explicitNonAuthorizations.includes(phrase),
      `Missing explicit no-authorization boundary: ${phrase}`);
  }
}
validateUnsignedDesign(policy);

// Negative fixtures demonstrate the validator fails if a future change silently
// marks an approval, enables execution, or drops a policy gate.
const rejectedMutations = [
  { label: 'unauthorized executable transfer', expected: /Executable transfer/,
    mutate: p => { p.executableTransferEnabled = true; } },
  { label: 'invented signed-policy count', expected: /Signed policy count/,
    mutate: p => { p.signedPolicyCount = 1; } },
  { label: 'unauthorized gate approval', expected: /Unsigned-only work unit/,
    mutate: p => { p.decisionGates[0].state = 'APPROVED'; } },
  { label: 'missing required policy gate', expected: /Missing protected decision gate/,
    mutate: p => { p.decisionGates.shift(); } },
  { label: 'injected signature', expected: /Approvals must remain empty/,
    mutate: p => { p.approvals.push({id:'fictional-unapproved-signature'}); } },
  { label: 'clinical activation', expected: /Clinical activation must remain BLOCKED/,
    mutate: p => { p.clinicalActivation = 'ENABLED'; } },
  { label: 'silently dropped consent-withdrawal test', expected: /Test scenarios must preserve the full/,
    mutate: p => { p.proposedTestScenarios = p.proposedTestScenarios.filter(
      id => id !== 'DENY_IF_CONSENT_WITHDRAWN'); } },
];
for (const {label, expected, mutate} of rejectedMutations) {
  const corrupt = structuredClone(policy);
  mutate(corrupt);
  assert.throws(() => validateUnsignedDesign(corrupt), expected,
    `Unsafe synthetic policy mutation was not specifically rejected: ${label}`);
}

// Read-only source integrity check: operational acknowledgement and readiness
// must remain non-authorizing. A future REAL transfer needs an entirely new
// reviewed code path and signed human authority; no transfer is implemented here.
const service = read('apps/api/src/clinical/governance.service.ts');
const controller = read('apps/api/src/clinical/governance.controller.ts');
const auth = read('AGENTS.md');
const extract = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `Could not find required source region: ${start}`);
  return source.slice(a, b);
};
const readiness = extract(service,
  'async handoverReadiness(centerId:', 'async proposeHandover(');
const ack = extract(service, 'async acknowledgeHandover(', 'async cancelHandover(');
const view = extract(service, 'private handoverView(', 'async handovers(');
const legacyTransfer = service.slice(service.indexOf('async transfer(centerId:'));
assert.ok(legacyTransfer.includes('tx.caseloadTransferDraft.create('),
  'Legacy transfer-simulations must remain non-authorizing draft creation');
assert.ok(!legacyTransfer.includes('tx.careAssignment.update') &&
  !legacyTransfer.includes('tx.careAssignment.updateMany(') &&
  !legacyTransfer.includes('tx.careAssignment.create') &&
  !legacyTransfer.includes('tx.careAssignment.delete'),
  'Legacy simulated transfer unexpectedly mutates real assignments');
assert.ok(controller.includes("@Post('transfer-simulations')"));
assert.ok(!controller.includes("@Post('transfers')") &&
  !controller.includes("@Post('handover-proposals/:id/execute')"),
  'An executable transfer route appeared without clinical policy sign-off');
assert.ok(ack.includes('return this.handoverView('),
  'Operational acknowledgement no longer returns the protected handover view');
for (const text of [readiness, view]) {
  for (const invariant of ['assignmentChanged: false','accessGranted: false',
    'clinicalHandover: false','released: false']) {
    assert.ok(text.includes(invariant), `Non-authorizing response lost ${invariant}`);
  }
}
assert.ok(!ack.includes('tx.careAssignment.create(') &&
  !ack.includes('tx.careAssignment.update(') &&
  !ack.includes('tx.careAssignment.updateMany(') &&
  !ack.includes('tx.careAssignment.delete('),
  'Operational acknowledgement must never reassign a child');
for (const x of ['readyForTransfer: false', "code: 'SIGNED_CLINICAL_AUTHORIZATION'",
  "code: 'PURPOSE_SPECIFIC_CONSENT'", "code: 'CLINICAL_HANDOVER_SCOPE'"])
  assert.ok(readiness.includes(x), `Handover readiness lost ${x}`);
assert.equal((readiness.match(/met: false/g) ?? []).length, 3,
  'Each of the three clinical readiness gates must stay explicitly false');
assert.ok(auth.includes('signed owner decisions') && auth.includes('Denial by default'),
  'Owner decision precedence / default-deny instructions missing');

console.log('TB-EM-051 PASS: all 9 decision gates unsigned; full 18-case contract and 7 specific negative fixtures checked;');
console.log('legacy transfer simulation and operational/readiness paths remain non-authorizing.');
