/**
 * Staff-only illustration reference metadata. This contains no byte locator,
 * storage key, endpoint, patient information, or authority to approve media.
 * Authorization must be enforced by the calling server route, not by this file.
 */
import { ILLUSTRATION_REFERENCE_SLOTS, ILLUSTRATION_STYLE_VERSION } from './illustration-style.mjs';

export const PRIVATE_CATALOGUE_STATE = 'PRIVATE_CONCEPT_PREVIEW_ONLY';

export function privateReferenceCatalogue() {
  return Object.freeze(ILLUSTRATION_REFERENCE_SLOTS.map(slot => Object.freeze({
    id: slot.id,
    family: slot.family,
    scene: slot.scene,
    styleVersion: ILLUSTRATION_STYLE_VERSION,
    targetWidth: 1600,
    targetHeight: 1200,
    accessibleLabel: `${slot.family} — ${slot.scene.replaceAll('-', ' ')} (image pending review)`,
    mediaState: PRIVATE_CATALOGUE_STATE,
    previewAvailable: false,
    imageUrl: null,
    storageKey: null,
    altText: null,
    publishEnabled: false,
    guardianReadEnabled: false,
    clinicalReleaseEnabled: false,
  })));
}

export function filterPrivateReferenceCatalogue({family = '', scene = ''} = {}) {
  const all = privateReferenceCatalogue();
  if ((family && !all.some(item => item.family === family)) ||
      (scene && !all.some(item => item.scene === scene))) return Object.freeze([]);
  return Object.freeze(all.filter(item =>
    (!family || item.family === family) && (!scene || item.scene === scene)));
}
