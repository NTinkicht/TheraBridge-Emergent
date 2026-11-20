/**
 * M5 major 3: synthetic-only, deny-by-default catalogue projection.
 * This module intentionally has no media URL resolver or authorization role.
 */
export const ILLUSTRATION_STYLE_VERSION = 'm5-direction-b-illustration-v1';
export const CATALOGUE_MEDIA_STATE = 'UNAVAILABLE_PENDING_SIGNED_APPROVAL';

const text = value => typeof value === 'string' ? value.trim() : '';
const norm = value => text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const descriptorValue = (object, key) => {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor) return undefined;
  if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) throw new TypeError('accessor rejected');
  return descriptor.value;
};
const safeStrings = value => {
  if (!Array.isArray(value)) return [];
  const length = descriptorValue(value, 'length');
  if (!Number.isSafeInteger(length) || length > 100) throw new TypeError('invalid list length');
  const result = [];
  for (let index = 0; index < length; index++) {
    const entry = descriptorValue(value, String(index));
    if (entry === undefined) continue;
    if (typeof entry !== 'string') throw new TypeError('invalid list entry');
    const trimmed = entry.trim();
    if (trimmed) result.push(trimmed);
  }
  return result;
};

/** Caller must supply server-authorized records; this projection never authorizes. */
export function projectCatalogueActivity(activity) {
  try {
    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) return null;
    const id = text(descriptorValue(activity, 'id'));
    const title = text(descriptorValue(activity, 'title'));
    if (!id || !title || id.length > 128 || title.length > 250) return null;
    const specialty = text(descriptorValue(activity, 'specialty'));
    const category = text(descriptorValue(activity, 'category'));
    const skill = text(descriptorValue(activity, 'skill'));
    const materials = Object.freeze(safeStrings(descriptorValue(activity, 'materials')));
    const equipment = Object.freeze(safeStrings(descriptorValue(activity, 'equipment')));
    const safety = Object.freeze(safeStrings(descriptorValue(activity, 'safety')));
    const steps = Object.freeze(safeStrings(descriptorValue(activity, 'steps')).map((instruction, index) =>
      Object.freeze({ number: index + 1, instruction })));
    return Object.freeze({
      id, title, specialty, category, skill, materials, equipment, steps, safety,
      illustration: Object.freeze({
        state: CATALOGUE_MEDIA_STATE, src: null, alt: null,
        styleVersion: ILLUSTRATION_STYLE_VERSION,
      }),
    });
  } catch {
    return null;
  }
}

/** Presentation-only filters. One malformed record cannot hide authorized siblings. */
export function filterCatalogueActivities(activities, filters = {}) {
  try {
    if (!Array.isArray(activities)) return Object.freeze([]);
    const query = norm(descriptorValue(filters, 'query'));
    const specialty = norm(descriptorValue(filters, 'specialty'));
    const category = norm(descriptorValue(filters, 'category'));
    const skill = norm(descriptorValue(filters, 'skill'));
    const equipment = norm(descriptorValue(filters, 'equipment'));
    const count = descriptorValue(activities, 'length');
    if (!Number.isSafeInteger(count) || count > 10000) return Object.freeze([]);
    const output = [];
    for (let i = 0; i < count; i++) {
      let candidate;
      try { candidate = projectCatalogueActivity(descriptorValue(activities, String(i))); }
      catch { continue; }
      if (!candidate) continue;
      if (specialty && norm(candidate.specialty) !== specialty) continue;
      if (category && norm(candidate.category) !== category) continue;
      if (skill && norm(candidate.skill) !== skill) continue;
      if (equipment && !candidate.equipment.some(e => norm(e) === equipment)) continue;
      if (query && ![candidate.title, candidate.specialty, candidate.category, candidate.skill,
        ...candidate.materials, ...candidate.equipment,
        ...candidate.steps.map(s => s.instruction)].some(v => norm(v).includes(query))) continue;
      output.push(candidate);
    }
    return Object.freeze(output);
  } catch {
    return Object.freeze([]);
  }
}
