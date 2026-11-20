import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSyntheticTaskBenchmark, VIEWPORTS } from './synthetic-task-benchmark.mjs';
const make = (n, changes = {}) => Array.from({ length: n }, () => ({
  task: 'synthetic-navigation', viewport: 390, baselineMs: 1000, candidateMs: 650, success: true, ...changes
}));
test('five required viewport widths remain explicit', () => {
  assert.deepEqual(VIEWPORTS, [320, 390, 768, 1024, 1440]);
});
test('accepts sufficiently sampled 95% success and 30% median improvement', () => {
  const rows = make(20); rows[0].success = false;
  const result = evaluateSyntheticTaskBenchmark(rows);
  assert.equal(result.status, 'PASS');
  assert.equal(result.results[0].successRate, 0.95);
});
test('rejects under-sampling, insufficient success and insufficient improvement', () => {
  assert.equal(evaluateSyntheticTaskBenchmark(make(19)).status, 'NOT_QUALIFIED');
  const failed = make(20); failed[0].success = false; failed[1].success = false;
  assert.equal(evaluateSyntheticTaskBenchmark(failed).status, 'NOT_QUALIFIED');
  assert.equal(evaluateSyntheticTaskBenchmark(make(20, { candidateMs: 701 })).status, 'NOT_QUALIFIED');
  assert.throws(() => evaluateSyntheticTaskBenchmark(make(20), { minSamples: 1 }), /weakened/);
});
test('rejects identifiers, extra fields, NaN, unsupported viewport and invalid tasks', () => {
  for (const changes of [{ childId: 'secret' }, { baselineMs: NaN }, { candidateMs: 0 },
    { viewport: 375 }, { task: '../other' }, { success: 'true' }]) {
    assert.throws(() => evaluateSyntheticTaskBenchmark(make(20, changes)), TypeError);
  }
});
test('never excludes unsuccessful timings from median', () => {
  const rows = make(20); rows[0].success = false; rows[0].candidateMs = 20000;
  const result = evaluateSyntheticTaskBenchmark(rows);
  assert.equal(result.results[0].count, 20);
  assert.equal(result.results[0].successes, 19);
});

test('rejects accessor-backed observations without invoking a getter', () => {
  let calls = 0;
  const rows = make(20);
  Object.defineProperty(rows[0], 'baselineMs', {
    enumerable: true,
    get() { calls++; throw Error('must not execute'); }
  });
  assert.throws(() => evaluateSyntheticTaskBenchmark(rows), /accessor-backed/);
  assert.equal(calls, 0);
});
