// Synthetic-only M5 integrated browser evidence gate. This validates receipts, not WCAG conformance.
export const REQUIRED_WIDTHS = Object.freeze([320, 390, 768, 1024, 1440]);
export const REQUIRED_STATES = Object.freeze(['loading', 'empty', 'error', 'blocked', 'success']);
const REQUIRED_CHECKS = Object.freeze(['keyboard', 'screenReaderManual', 'contrastManual', 'focus', 'overflow']);
const safeName = value => typeof value === 'string' && /^[a-z][a-z0-9-]{1,63}$/.test(value);
const data = (obj, key) => {
  const descriptor = Object.getOwnPropertyDescriptor(obj, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError('missing or accessor-backed evidence field');
  return descriptor.value;
};
/**
 * Explicitly denies qualification if any role/journey/viewport/state/check is absent.
 * Manual results must be recorded by a real tester; this function never manufactures them.
 * Receipts must contain only non-identifying synthetic test metadata.
 */
export function qualifySyntheticViewportEvidence(receipts, { roles, journeys } = {}) {
  if (!Array.isArray(receipts) || !Array.isArray(roles) || !Array.isArray(journeys) ||
      !roles.length || !journeys.length || !roles.every(safeName) || !journeys.every(safeName) ||
      new Set(roles).size !== roles.length || new Set(journeys).size !== journeys.length) {
    throw new TypeError('explicit unique synthetic roles and journeys required');
  }
  const expected = new Set(roles.flatMap(role => journeys.flatMap(journey =>
    REQUIRED_WIDTHS.flatMap(width => REQUIRED_STATES.map(state => [role, journey, width, state].join(':'))))));
  const seen = new Set();
  const failures = [];
  for (const receipt of receipts) {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt) ||
        Object.getPrototypeOf(receipt) !== Object.prototype ||
        Object.keys(receipt).sort().join(',') !== 'checks,journey,role,state,width') {
      throw new TypeError('unexpected or sensitive evidence fields');
    }
    const role = data(receipt, 'role'), journey = data(receipt, 'journey');
    const width = data(receipt, 'width'), state = data(receipt, 'state');
    const checks = data(receipt, 'checks');
    const key = [role, journey, width, state].join(':');
    if (!expected.has(key) || seen.has(key)) throw new TypeError('unexpected or duplicate evidence combination');
    seen.add(key);
    if (!checks || typeof checks !== 'object' || Array.isArray(checks) ||
        Object.getPrototypeOf(checks) !== Object.prototype ||
        Object.keys(checks).sort().join(',') !== [...REQUIRED_CHECKS].sort().join(',')) {
      throw new TypeError('missing or extra manual check fields');
    }
    for (const check of REQUIRED_CHECKS) {
      const result = data(checks, check);
      if (!['PASS', 'FAIL', 'NOT_RUN'].includes(result)) throw new TypeError('invalid check result');
      if (result !== 'PASS') failures.push({ key, check, result });
    }
  }
  const missing = [...expected].filter(key => !seen.has(key));
  return { status: !missing.length && !failures.length ? 'PASS' : 'NOT_QUALIFIED',
    syntheticOnly: true, expectedCount: expected.size, observedCount: seen.size, missing, failures };
}
