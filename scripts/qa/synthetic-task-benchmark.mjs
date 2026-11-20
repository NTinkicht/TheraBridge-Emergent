// M5-11 synthetic-only acceptance measurement. No participant identifiers or clinical content.
export const VIEWPORTS = Object.freeze([320, 390, 768, 1024, 1440]);
export const MIN_SUCCESS_RATE = 0.95;
export const MIN_TIME_IMPROVEMENT = 0.30;
export const MIN_PAIRED_SAMPLES = 20;

function finiteDuration(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
/**
 * Each record is { task, viewport, baselineMs, candidateMs, success }.
 * Data must be synthetic. Reject unknown keys to prevent accidentally persisting
 * names, clinical records, identifiers or screenshots into benchmark receipts.
 */
export function evaluateSyntheticTaskBenchmark(records, { minSamples = MIN_PAIRED_SAMPLES } = {}) {
  if (!Number.isSafeInteger(minSamples) || minSamples < MIN_PAIRED_SAMPLES) throw new TypeError('minimum sample size cannot be weakened');
  if (!Array.isArray(records) || records.length === 0) throw new TypeError('nonempty synthetic records required');
  const groups = new Map();
  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        Object.keys(record).sort().join(',') !== 'baselineMs,candidateMs,success,task,viewport') {
      throw new TypeError('unexpected or sensitive benchmark fields');
    }
    // Read only own data descriptors: accessor-backed observations must never execute.
    const descriptors = Object.getOwnPropertyDescriptors(record);
    const fields = ['task', 'viewport', 'baselineMs', 'candidateMs', 'success'];
    if (fields.some(field => !Object.hasOwn(descriptors[field], 'value'))) {
      throw new TypeError('accessor-backed benchmark observation');
    }
    const task = descriptors.task.value;
    const viewport = descriptors.viewport.value;
    const baselineMs = descriptors.baselineMs.value;
    const candidateMs = descriptors.candidateMs.value;
    const success = descriptors.success.value;
    if (typeof task !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/.test(task) ||
        !VIEWPORTS.includes(viewport) || !finiteDuration(baselineMs) ||
        !finiteDuration(candidateMs) || typeof success !== 'boolean') {
      throw new TypeError('invalid synthetic benchmark observation');
    }
    const key = task + ':' + viewport;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ baselineMs, candidateMs, success });
  }
  const results = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, observations]) => {
    const count = observations.length;
    const successes = observations.filter(o => o.success).length;
    const successRate = successes / count;
    // Use paired samples and compare medians; do not cherry-pick successful runs.
    const baselineMedianMs = median(observations.map(o => o.baselineMs));
    const candidateMedianMs = median(observations.map(o => o.candidateMs));
    const improvement = (baselineMedianMs - candidateMedianMs) / baselineMedianMs;
    const sufficient = count >= minSamples;
    return { key, count, successes, successRate, baselineMedianMs, candidateMedianMs,
      improvement, sufficient, pass: sufficient && successRate >= MIN_SUCCESS_RATE && improvement >= MIN_TIME_IMPROVEMENT };
  });
  return { status: results.every(r => r.pass) ? 'PASS' : 'NOT_QUALIFIED', syntheticOnly: true,
    thresholds: { minSamples, minSuccessRate: MIN_SUCCESS_RATE, minTimeImprovement: MIN_TIME_IMPROVEMENT },
    results };
}
