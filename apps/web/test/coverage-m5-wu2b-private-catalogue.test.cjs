'use strict';
// M5 WU2-B: real source-execution coverage for the new private-only catalogue.
// Node's standalone node:test job is not part of the measured Web Istanbul
// numerator. Keep these tests in the mandatory coverage-*.test.cjs runner.
let catalogue, style;
beforeAll(async () => {
  [catalogue, style] = await Promise.all([
    import('../src/lib/private-illustration-catalogue.mjs'),
    import('../src/lib/illustration-style.mjs'),
  ]);
});
describe('M5 WU2-B private 25-slot metadata scope, filtering, accessibility and deny-publication', () => {
  test('all 25 references are immutable, unique and exactly follow canonical m5-b-v1 ordering', () => {
    const items = catalogue.privateReferenceCatalogue();
    expect(items).toHaveLength(25);
    expect(Object.isFrozen(items)).toBe(true);
    expect(items.map(x => x.id)).toEqual(style.ILLUSTRATION_REFERENCE_SLOTS.map(x => x.id));
    expect(new Set(items.map(x => x.id)).size).toBe(25);
    expect(catalogue.PRIVATE_CATALOGUE_STATE).toBe('PRIVATE_CONCEPT_PREVIEW_ONLY');
    for (const item of items) {
      const source = style.ILLUSTRATION_REFERENCE_SLOTS.find(x => x.id === item.id);
      expect(item.family).toBe(source.family);
      expect(item.scene).toBe(source.scene);
      expect(item.styleVersion).toBe('m5-b-v1');
      expect(item.mediaState).toBe(catalogue.PRIVATE_CATALOGUE_STATE);
      expect(item.targetWidth).toBe(1600);
      expect(item.targetHeight).toBe(1200);
      expect(item.accessibleLabel).toBe(
        `${source.family} — ${source.scene.replaceAll('-', ' ')} (image pending review)`);
      for (const key of ['imageUrl','storageKey','altText']) expect(item[key]).toBeNull();
      for (const key of ['previewAvailable','publishEnabled','guardianReadEnabled','clinicalReleaseEnabled'])
        expect(item[key]).toBe(false);
      expect(Object.isFrozen(item)).toBe(true);
    }
    expect(() => { items[0].imageUrl = 'https://untrusted.invalid/asset.png'; }).toThrow();
    expect(() => { items.push({}); }).toThrow();
  });
  test('unfiltered, each family, each scene and combined valid filters preserve fixed scope', () => {
    const all = catalogue.filterPrivateReferenceCatalogue();
    expect(all).toHaveLength(25);
    expect(Object.isFrozen(all)).toBe(true);
    expect(catalogue.filterPrivateReferenceCatalogue({})).toHaveLength(25);
    expect(catalogue.filterPrivateReferenceCatalogue({family:'',scene:''})).toHaveLength(25);
    for (const family of style.ILLUSTRATION_FAMILIES) {
      const set = catalogue.filterPrivateReferenceCatalogue({family});
      expect(set).toHaveLength(5);
      expect(set.every(x => x.family === family)).toBe(true);
      for (const scene of style.ILLUSTRATION_SCENE_ARCHETYPES) {
        const pair = catalogue.filterPrivateReferenceCatalogue({family,scene});
        expect(pair).toHaveLength(1);
        expect(pair[0].family).toBe(family);
        expect(pair[0].scene).toBe(scene);
        expect(pair[0].imageUrl).toBeNull();
      }
    }
    for (const scene of style.ILLUSTRATION_SCENE_ARCHETYPES) {
      const set = catalogue.filterPrivateReferenceCatalogue({scene});
      expect(set).toHaveLength(5);
      expect(set.every(x => x.scene === scene)).toBe(true);
    }
  });
  test('unsupported family and/or scene never expand the private scope', () => {
    const cases = [
      {family:'unknown'}, {scene:'unknown'}, {family:'unknown',scene:'home-support'},
      {family:'speech',scene:'unknown'}, {family:'unknown',scene:'unknown'},
      {family:'Speech'}, {scene:'../../assets'}, {scene:'home-support '},
      {family:'guardian'}, {family:'__proto__'}, {scene:'constructor'},
    ];
    for (const filter of cases) {
      const items = catalogue.filterPrivateReferenceCatalogue(filter);
      expect(items).toEqual([]);
      expect(Object.isFrozen(items)).toBe(true);
    }
  });
});
