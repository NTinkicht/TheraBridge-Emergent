// M5 PR4 synthetic acceptance matrix: prepare pending receipts, never manufacture PASS.
import { REQUIRED_WIDTHS, REQUIRED_STATES, requireSyntheticDimension } from './synthetic-viewport-evidence.mjs';
const CHECKS = ['keyboard', 'screenReaderManual', 'contrastManual', 'focus', 'overflow'];
export function createPendingSyntheticEvidence({ roles, journeys } = {}) {
  const roleNames = requireSyntheticDimension(roles);
  const journeyNames = requireSyntheticDimension(journeys);
  return roleNames.flatMap(role => journeyNames.flatMap(journey =>
    REQUIRED_WIDTHS.flatMap(width => REQUIRED_STATES.map(state => ({
      role, journey, width, state,
      checks: Object.fromEntries(CHECKS.map(check => [check, 'NOT_RUN']))
    })))));
}
