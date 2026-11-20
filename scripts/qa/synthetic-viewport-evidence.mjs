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

/** Own-data-only, dense, bounded synthetic dimensions. Never trust .every on sparse arrays. */
export function requireSyntheticDimension(values) {
  if (!Array.isArray(values)) throw new TypeError('explicit synthetic dimension array required');
  const length = data(values, 'length');
  if (!Number.isSafeInteger(length) || length < 1 || length > 128) {
    throw new TypeError('nonempty bounded synthetic dimension required');
  }
  const names = [];
  for (let i = 0; i < length; i++) {
    const name = data(values, String(i));
    if (!safeName(name)) throw new TypeError('invalid or sparse synthetic dimension');
    names.push(name);
  }
  if (new Set(names).size !== names.length) throw new TypeError('duplicate synthetic dimension');
  return Object.freeze(names);
}
/**
 * Explicitly denies qualification if any role/journey/viewport/state/check is absent.
 * Manual results must be recorded by a real tester; this function never manufactures them.
 * Receipts must contain only non-identifying synthetic test metadata.
 */
export function qualifySyntheticViewportEvidence(receipts, { roles, journeys } = {}) {
  if (!Array.isArray(receipts)) throw new TypeError('explicit synthetic receipts array required');
  const roleNames = requireSyntheticDimension(roles);
  const journeyNames = requireSyntheticDimension(journeys);
  const expected = new Set(roleNames.flatMap(role => journeyNames.flatMap(journey =>
    REQUIRED_WIDTHS.flatMap(width => REQUIRED_STATES.map(state => [role, journey, width, state].join(':'))))));
  if (expected.size === 0) throw new TypeError('empty evidence matrix cannot qualify');
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
    // Validate *before* any string concatenation: object toString/valueOf can mutate receipt checks.
    if (!safeName(role) || !safeName(journey) ||
        typeof width !== 'number' || !REQUIRED_WIDTHS.includes(width) ||
        typeof state !== 'string' || !REQUIRED_STATES.includes(state)) {
      throw new TypeError('invalid evidence primitive type or value');
    }
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
