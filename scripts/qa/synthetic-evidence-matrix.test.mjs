import test from 'node:test';
import assert from 'node:assert/strict';
import { createPendingSyntheticEvidence } from './synthetic-evidence-matrix.mjs';
import { qualifySyntheticViewportEvidence } from './synthetic-viewport-evidence.mjs';

test('generates all five widths and five states for every synthetic role and journey', () => {
  const roles = ['guardian', 'therapist'];
  const journeys = ['home', 'review'];
  const receipts = createPendingSyntheticEvidence({ roles, journeys });
  assert.equal(receipts.length, 100);
  assert.equal(new Set(receipts.map(r => r.role + ':' + r.journey + ':' + r.width + ':' + r.state)).size, 100);
  assert.equal(qualifySyntheticViewportEvidence(receipts, { roles, journeys }).status, 'NOT_QUALIFIED');
  assert.equal(receipts.every(r => Object.values(r.checks).every(v => v === 'NOT_RUN')), true);
});
test('rejects duplicate or malformed matrix dimensions', () => {
  for (const dimensions of [
    { roles: [], journeys: ['home'] },
    { roles: ['guardian', 'guardian'], journeys: ['home'] },
    { roles: ['guardian'], journeys: ['home', 'home'] },
    { roles: ['guardian'], journeys: ['../secret'] },
    { roles: ['guardian'], journeys: [null] }
  ]) assert.throws(() => createPendingSyntheticEvidence(dimensions), TypeError);
});
