/**
 * M5 major 3: synthetic catalogue projection contract.
 * This module deliberately has NO media URL resolver. It must never turn a
 * proposed illustration into a browser-accessible resource.
 */
export const ILLUSTRATION_STYLE_VERSION = 'm5-direction-b-illustration-v1';
export const CATALOGUE_MEDIA_STATE = 'UNAVAILABLE_PENDING_SIGNED_APPROVAL';

const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const text = (value) => typeof value === 'string' ? value.trim() : '';
const norm = (value) => text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const safeStrings = (value) => Array.isArray(value) ? value.filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean) : [];

/**
 * Input must already be returned by the server's authorized activity endpoint.
 * Never use this client-side projection to authorize an activity or image.
 * Reject accessor-backed objects rather than invoking attacker-controlled getters.
 */
export function projectCatalogueActivity(activity) {
  if (!activity || typeof activity !== 'object' || Array.isArray(activity)) return null;
  const keys = ['id','title','specialty','category','skill','materials','steps','safety','equipment'];
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(activity, key);
    if (descriptor && !own(descriptor, 'value')) return null;
  }
  const id = text(activity.id), title = text(activity.title);
  if (!id || !title || id.length > 128 || title.length > 250) return null;
  return Object.freeze({
    id, title,
    specialty: text(activity.specialty), category: text(activity.category), skill: text(activity.skill),
    materials: Object.freeze(safeStrings(activity.materials)),
    equipment: Object.freeze(safeStrings(activity.equipment)),
    steps: Object.freeze(safeStrings(activity.steps).map((instruction, index) =>
      Object.freeze({ number: index + 1, instruction }))),
    safety: Object.freeze(safeStrings(activity.safety)),
    illustration: Object.freeze({ state: CATALOGUE_MEDIA_STATE, src: null, alt: null, styleVersion: ILLUSTRATION_STYLE_VERSION }),
  });
}

/** Filters are presentation-only; authorization always occurs upstream. */
export function filterCatalogueActivities(activities, filters = {}) {
  if (!Array.isArray(activities)) return Object.freeze([]);
  const query = norm(filters.query), specialty = norm(filters.specialty),
    category = norm(filters.category), skill = norm(filters.skill), equipment = norm(filters.equipment);
  return Object.freeze(activities.map(projectCatalogueActivity).filter(Boolean).filter(item =>
    (!specialty || norm(item.specialty) === specialty) &&
    (!category || norm(item.category) === category) &&
    (!skill || norm(item.skill) === skill) &&
    (!equipment || item.equipment.some(e => norm(e) === equipment)) &&
    (!query || [item.title, item.specialty, item.category, item.skill, ...item.materials, ...item.equipment, ...item.steps.map(s => s.instruction)].some(v => norm(v).includes(query)))));
}
