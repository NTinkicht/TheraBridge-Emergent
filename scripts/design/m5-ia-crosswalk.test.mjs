import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIaCrosswalk, validateIaCrosswalk } from './m5-ia-crosswalk.mjs';

test('every canonical feature, workflow and current nav entry is proposed exactly once without policy activation', async () => {
  const m = await buildIaCrosswalk();
  assert.equal(m.features.length, 66);
  assert.equal(m.workflows.length, 91);
  assert.equal(m.navigation.length, 20);
  assert.equal(m.roleReview.length, 7);
  assert.equal(m.summary.fullyProvenDiscoverable, 0);
  assert.equal(m.features.find(f => f.id === '39').proposedAvailability, 'V2_NOT_IN_V1_NAV');
  assert.equal(m.workflows.find(f => f.id === 'WF-X6').proposedAvailability, 'V2_NOT_IN_V1_NAV');
  assert.equal(validateIaCrosswalk(m), true);
});
test('repeated identifiers and false usability/clinical approvals fail closed', async () => {
  const m = await buildIaCrosswalk();
  for (const mutate of [
    x => { x.features[0].id = x.features[1].id; },
    x => { x.workflows.pop(); },
    x => { x.governance.clinical = 'GO'; },
    x => { x.features[3].discoverability = 'PASS'; },
    x => { x.workflows.find(w => w.id === 'WF-X6').proposedAvailability = 'LIVE'; },
    x => { x.navigation[0].authorization = 'ALLOW_ALL'; },
    x => { x.roleReview[0].permissionReview = 'PASS'; },
  ]) {
    const x = structuredClone(m);
    mutate(x);
    assert.throws(() => validateIaCrosswalk(x), /missing|Missing|duplicate|Duplicate|falsely|false|cannot|unrestricted|promoted|Role/i);
  }
});
test('family and clinical shared activities remain separate permission-conditioned nav entries', async () => {
  const m = await buildIaCrosswalk();
  const entries = m.navigation.filter(n => n.key === 'activities');
  assert.equal(entries.length, 2);
  assert.deepEqual(new Set(entries.map(x => x.permission)),
    new Set(['family.activities.read', 'center.activities.read']));
});
