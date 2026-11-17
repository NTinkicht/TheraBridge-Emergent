const fs = require('node:fs');
const path = require('node:path');
describe('M5-B specialty identity and art direction source contracts', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src/styles/specialty-identity.ts'), 'utf8');
  const guide = fs.readFileSync(path.join(__dirname, '../../../docs/product/ILLUSTRATION_STANDARD_V1_DRAFT.md'), 'utf8');
  it('defines five named, labelled and icon-bearing families', () => {
    for (const key of ['speech', 'occupational', 'behavioral', 'physical', 'group'])
      expect(code).toMatch(new RegExp('  ' + key + ': .+label:.+icon:'));
    expect(code).toContain("specialtyVisualIdentityVersion = 'm5-b-v1'");
  });
  it('preserves the existing service identifiers without permission or schema migration', () => {
    expect(code).toContain("feeding: { family: 'occupational'");
    expect(code).toContain("developmental: { family: 'behavioral'");
    expect(code).toContain('hasOwnProperty.call');
  });
  it('requires human clinical review and fails closed for images', () => {
    expect(guide).toContain('NOT APPROVED');
    expect(guide).toContain('1:1 safe crop');
    expect(guide).toContain('REJECTED');
    expect(guide).toContain('G2/G2b');
  });
});

const { specialtyFamilies, specialtyIdentity, specialtyDisplayName, isRecognizedSpecialty } = require('../src/styles/specialty-identity');

describe('M5-B runtime specialty presentation regressions', () => {
  it('resolves all five official families to distinct labelled icons', () => {
    const families = Object.values(specialtyFamilies);
    expect(families).toHaveLength(5);
    expect(new Set(families.map(s => s.icon)).size).toBe(5);
    for (const s of families) {
      expect(s.label.length).toBeGreaterThan(6);
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(s.tint).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it('preserves existing storage identifiers and labels', () => {
    expect(specialtyIdentity('feeding').family).toBe('occupational');
    expect(specialtyDisplayName('feeding')).toBe('Feeding therapy');
    expect(specialtyIdentity('developmental').family).toBe('behavioral');
    expect(specialtyDisplayName('developmental')).toBe('Developmental therapy');
    expect(specialtyIdentity('group').family).toBe('group');
  });
  it('does not treat inherited property names or unknown services as authorized specialties', () => {
    expect(isRecognizedSpecialty('__proto__')).toBe(false);
    expect(isRecognizedSpecialty('constructor')).toBe(false);
    expect(isRecognizedSpecialty('unknown')).toBe(false);
    expect(specialtyDisplayName('unknown')).toBe('unknown');
  });
});
