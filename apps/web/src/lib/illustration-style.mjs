/**
 * TheraBridge Direction B illustration identity — concept stage only.
 * One version and one matrix for EVERY activity-media surface. The version is
 * also asserted against the server in CI; this file is never approval evidence.
 */
export const ILLUSTRATION_STYLE_VERSION = 'm5-b-v1';
export const ILLUSTRATION_STYLE_STATE = 'CANDIDATE_NOT_APPROVED';
export const ILLUSTRATION_SCENE_ARCHETYPES = Object.freeze([
  'therapist-guided','independent-practice','home-support',
  'materials-sequence','safety-access',
]);
export const ILLUSTRATION_FAMILIES = Object.freeze([
  'speech','occupational','behavioral','physical','group',
]);
export const ILLUSTRATION_ARTBOARD = Object.freeze({
  width: 1600, height: 1200, safeSquare: Object.freeze({
    x: 200, y: 0, width: 1200, height: 1200,
  }),
});
export const ILLUSTRATION_REFERENCE_SLOTS = Object.freeze(
  ILLUSTRATION_SCENE_ARCHETYPES.flatMap((scene, i) =>
    ILLUSTRATION_FAMILIES.map((family, j) => Object.freeze({
      id: `WU2A-S${i+1}-${family.toUpperCase()}`,
      scene, family, conceptOnly: true,
      approved: false, imageUrl: null, publishEnabled: false,
    }))
  )
);
