// M5 PR4 synthetic acceptance matrix: prepare pending receipts, never manufacture PASS.
import { REQUIRED_WIDTHS, REQUIRED_STATES } from './synthetic-viewport-evidence.mjs';
const SAFE = /^[a-z][a-z0-9-]{1,63}$/;
const CHECKS = ['keyboard', 'screenReaderManual', 'contrastManual', 'focus', 'overflow'];
export function createPendingSyntheticEvidence({ roles, journeys } = {}) {
  for (const values of [roles, journeys]) {
    if (!Array.isArray(values) || values.length === 0 ||
        values.some(value => typeof value !== 'string' || !SAFE.test(value)) ||
        new Set(values).size !== values.length) {
      throw new TypeError('unique synthetic role and journey names required');
    }
  }
  return roles.flatMap(role => journeys.flatMap(journey =>
    REQUIRED_WIDTHS.flatMap(width => REQUIRED_STATES.map(state => ({
      role, journey, width, state,
      checks: Object.fromEntries(CHECKS.map(check => [check, 'NOT_RUN']))
    })))));
}
