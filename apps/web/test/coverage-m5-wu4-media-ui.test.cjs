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
    expect(comp).toContain('activityMediaDrafts.reject(centerId, templateId, draft.id, draft.version, reason.trim())');
    expect(comp).toContain('busy || loading');
    expect(comp).toContain('setRejecting(null)');
  });
  it('requires written provenance and commercial terms for generated art', () => {
    expect(comp).toContain("form.sourceType === 'GENERATED'");
    expect(comp).toContain('sourceReference');
    expect(comp).toContain('providerTerms');
    expect(comp).toContain('altText');
  });
});

describe('WU4-C real API helper optimistic revision', () => {
  it('passes the exact revision and reason to the authenticated POST', async () => {
    const { rest } = require('../src/lib/auth');
    const { activityMediaDrafts } = require('../src/lib/activity-media');
    const send = jest.spyOn(rest, 'send').mockResolvedValueOnce({ id: 'draft', state: 'REJECTED', version: 8 });
    try {
      const value = await activityMediaDrafts.reject('center-1', 'activity-2', 'draft-3', 7, 'Anatomically incorrect hand pose');
      expect(value.version).toBe(8);
      expect(send).toHaveBeenCalledWith('POST',
        '/api/centers/center-1/activities/activity-2/media-drafts/draft-3/reject',
        { version: 7, reason: 'Anatomically incorrect hand pose' });
    } finally { send.mockRestore(); }
  });
});
