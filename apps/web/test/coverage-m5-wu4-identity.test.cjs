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
