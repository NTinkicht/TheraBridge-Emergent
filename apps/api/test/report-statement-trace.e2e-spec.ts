import { createHash } from 'node:crypto';
import type { Evidence } from '../src/clinical/reports.service';
import { suggestionSources } from '../src/clinical/report-source-catalog';
import { traceSavedStatements, type TraceDecision } from '../src/clinical/report-statement-trace';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reportId = '12345678-1234-4234-8234-123456789000';
const planVersionId = '12345678-1234-4234-8234-123456789001';
const observationId = '12345678-1234-4234-8234-123456789002';
const checkpointRef = 'goalCheckpoint:' + planVersionId + ':0';
const evidence = {
  period: { from: '2026-10-01', to: '2026-10-19' },
  assessments: [], plan: null, plans: [],
  goals: [{
    planId: '12345678-1234-4234-8234-123456789005', planTitle: 'Synthetic',
    planVersionId, key: 'words', title: 'Synthetic words', measure: 'percent',
    baseline: 20, target: 80, prior: null, status: 'insufficient',
    points: [{ date: '2026-10-10', value: 30, note: null, observationId }],
  }],
  checkpoints: [{
    ref: checkpointRef, planVersionId, goalKey: 'words', reviewedOn: '2026-10-18',
    fingerprint: 'f'.repeat(64),
  }],
  sessions: { drafts: 1, completedVisits: 0 },
} as unknown as Evidence;
const claim = 'One source value was 30 percent.';
const refs = ['observation:' + observationId, checkpointRef];
const prefix = 'Previous synthetic evidence note';
const text = prefix + '\n\n' + claim +
  '\n\nEvidence references (internal draft; goals):\n- Claim 1: ' + refs.join(', ');
const sources = suggestionSources(evidence, reportId, 'goals');
function linkedDecision(sectionText = text): TraceDecision {
  return {
    id: 'decision-1', section: 'goals', action: 'APPLIED',
    sectionHash: hash(sectionText), passageHash: hash(claim),
    claimMap: [{ index: 0, textHash: hash(claim), sourceRefs: refs }],
    sourceManifest: sources.map(s => ({ ref: s.ref, fingerprint: s.fingerprint })),
  };
}
describe('TB-EM-035 immutable source-linked statement trace', () => {
  it('reconstructs exactly hashed clinician text and exact frozen source identities', () => {
    expect(traceSavedStatements({ goals: text }, evidence, [linkedDecision()], reportId))
      .toEqual([expect.objectContaining({
        section: 'goals', status: 'LINKED_TO_SAVED_TEXT',
        passage: claim, claimValidation: 'REFERENCED_NOT_VERIFIED',
        claims: [expect.objectContaining({ text: claim, sources: expect.arrayContaining([
          expect.objectContaining({ ref: 'observation:' + observationId }),
          expect.objectContaining({ ref: checkpointRef }),
        ]) })],
      })]);
  });
  it('refuses to attach citations when saved text changed', () => {
    const t = traceSavedStatements({ goals: text + ' edited' }, evidence, [linkedDecision()], reportId);
    expect(t[0]).toMatchObject({ status: 'SECTION_EDITED', passage: null, claims: [] });
  });
  it('refuses source attribution when checkpoint fingerprint or recorded value changes', () => {
    const changedCheckpoint = { ...evidence, checkpoints: [{ ...evidence.checkpoints[0], fingerprint: 'a'.repeat(64) }] } as Evidence;
    expect(traceSavedStatements({ goals: text }, changedCheckpoint, [linkedDecision()], reportId)[0].status)
      .toBe('SOURCE_MISMATCH');
    const changedObservation = { ...evidence, goals: evidence.goals.map(g => ({
      ...g, points: g.points.map(p => ({ ...p, value: 31 })),
    })) } as Evidence;
    expect(traceSavedStatements({ goals: text }, changedObservation, [linkedDecision()], reportId)[0].status)
      .toBe('SOURCE_MISMATCH');
  });
  it('never invents sources for unavailable or malformed legacy evidence', () => {
    expect(traceSavedStatements({ goals: text }, {
      ...evidence, checkpoints: undefined,
    } as Evidence, [linkedDecision()], reportId)[0].status).toBe('SOURCE_MISMATCH');
    expect(traceSavedStatements({ goals: text }, evidence,
      [{ ...linkedDecision(), claimMap: [{ index: 0, textHash: hash('invented'), sourceRefs: refs }] }], reportId)[0].status)
      .toBe('PASSAGE_MISMATCH');
    expect(traceSavedStatements({ goals: text }, evidence,
      [{ ...linkedDecision(), sourceManifest: [{ ref: 'observation:not-found', fingerprint: 'x' }] }], reportId)[0].status)
      .toBe('SOURCE_MISMATCH');
    expect(traceSavedStatements({ goals: 'No links' }, evidence, [], reportId)).toEqual([]);
  });
  it('keeps two distinct original statements linked by their individual hashes', () => {
    const a = 'First synthetic 30 percent value.';
    const b = 'Clinician reviewed one saved checkpoint.';
    const joined = a + '\n\n' + b;
    const refs2 = [checkpointRef];
    const saved = prefix + '\n\n' + joined + '\n\nEvidence references (internal draft; goals):\n' +
      '- Claim 1: observation:' + observationId + '\n- Claim 2: ' + checkpointRef;
    const d: TraceDecision = { ...linkedDecision(saved), passageHash: hash(joined),
      claimMap: [
        { index: 0, textHash: hash(a), sourceRefs: ['observation:' + observationId] },
        { index: 1, textHash: hash(b), sourceRefs: refs2 },
      ],
    };
    const t = traceSavedStatements({ goals: saved }, evidence, [d], reportId);
    expect(t[0].status).toBe('LINKED_TO_SAVED_TEXT');
    expect(t[0].claims.map(c => c.text)).toEqual([a, b]);
  });
});
