const fs = require('node:fs');
const path = require('node:path');
const comp = fs.readFileSync(path.join(__dirname,'../src/components/clinical/ActivityMediaDraftPanel.tsx'),'utf8');
const page = fs.readFileSync(path.join(__dirname,'../src/app/app/activities/page.tsx'),'utf8');
describe('WU4-C private, draft-only illustration UX boundary', () => {
  it('renders only for authorized center activity managers; never on family cards', () => {
    expect(page).toContain("session.permissions.includes('center.activities.manage') && t.library === 'center'");
    expect(page).not.toContain('<ActivityMediaDraftPanel key={c.id}');
  });
  it('never exposes an image URL, upload control, publish action or generated preview', () => {
    expect(comp).not.toMatch(/<img|<Image\s|type="file"|approve\(|publish\(/);
    expect(comp).toContain('No image upload or publication is available');
    expect(comp).toContain('clinical/design approval');
  });
  it('keeps genuine errors, busy states, canceled rejection and optimistic revision', () => {
    expect(comp).toContain('role="alert"');
    expect(comp).toContain('disabled={busy');
    expect(comp).toContain('version: draft.version');
    expect(comp).toContain('setRejecting(null)');
  });
  it('requires written provenance and commercial terms for generated art', () => {
    expect(comp).toContain("form.sourceType === 'GENERATED'");
    expect(comp).toContain('sourceReference');
    expect(comp).toContain('providerTerms');
    expect(comp).toContain('altText');
  });
});
