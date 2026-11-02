import { buildFamilyRendering, familyRenderingHash } from '../src/clinical/family-release-rendering';

describe('TB-EM-053 approved family rendering', () => {
  it('excludes internal report sections and review evidence even if present', () => {
    const r = buildFamilyRendering('REPORT', {
      title: 'Fictional progress update',
      sections: { familySummary: 'Home activities are going well.', diagnosis: 'PRIVATE',
        safeguarding: 'NEVER SHARE', clinicalNotes: 'INTERNAL' },
      reviewNotes: ['SUPERVISION PRIVATE'], evidence: { patientData: 'EXCLUDED' },
    });
    expect(r).toEqual({ kind: 'REPORT', title: 'Fictional progress update', familySummary: 'Home activities are going well.' });
    expect(JSON.stringify(r)).not.toMatch(/PRIVATE|INTERNAL|NEVER SHARE|EXCLUDED/);
  });

  it('never exposes plan evidence, template snapshots or internal goal measures', () => {
    const r = buildFamilyRendering('PLAN', { title: 'Fictional home plan', summary: 'Family summary',
      goals: [{ title: 'Practice greetings', clinicalMeasure: 'SECRET' }],
      homeActivities: [{ frequency: 'Three times per week', note: 'Five minutes',
        snapshot: { internalInstructions: 'PRIVATE' } }],
      reviewNotes: ['CONFIDENTIAL'], evidence: { safeguarding: 'SECRET' } });
    expect(r).toEqual({ kind: 'PLAN', title: 'Fictional home plan', summary: 'Family summary',
      goals: [{ title: 'Practice greetings' }],
      homeActivities: [{ frequency: 'Three times per week', note: 'Five minutes' }] });
    expect(JSON.stringify(r)).not.toMatch(/SECRET|PRIVATE|CONFIDENTIAL/);
  });

  it('requires an explicitly authored family summary for reports', () => {
    expect(() => buildFamilyRendering('REPORT', { title: 'Report', sections: { summary: 'Internal only' } }))
      .toThrow('INVALID_FAMILY_RENDERING');
  });

  it('binds the exact family output to a deterministic content hash', () => {
    const r = buildFamilyRendering('REPORT', { title: 'Fictional report', sections: { familySummary: 'Ready for family' } });
    expect(familyRenderingHash(r)).toMatch(/^[a-f0-9]{64}$/);
    expect(familyRenderingHash(r)).not.toBe(familyRenderingHash({ ...r, title: 'Changed' }));
  });
});
