import { decideFamilyRelease, familyReleaseEnabled, FamilyReleaseContext, FAMILY_RELEASE_NOTICE } from '../src/clinical/family-release-policy';

const approvedHash = 'a'.repeat(64);
const eligible: FamilyReleaseContext = {
  action: 'READ', deploymentEnvironment: 'development', syntheticEnvironmentEnabled: true, syntheticCenterEnabled: true,
  actorActive: true, actorClinician: false, actorAssignedToSpecialty: false,
  guardianAuthenticated: true, guardianActive: true, guardianMatchesRecipient: true,
  tenantMatches: true, childMatches: true, guardianRestriction: 'CLEAR',
  consentCurrent: true, consentPurposeMatches: true, safeguardingHold: false,
  clinicalApprovalCurrent: true, approvedRenderingHash: approvedHash, servedRenderingHash: approvedHash,
  grantActive: true, grantVersionMatches: true, documentFamilySafe: true, documentWithdrawn: false,
};

describe('TB-EM-053 v1.1 family release decision', () => {
  it('allows an eligible synthetic guardian to read only the exact approved rendering', () => {
    expect(decideFamilyRelease(eligible)).toEqual({ allowed: true });
    expect(decideFamilyRelease({ ...eligible, servedRenderingHash: 'b'.repeat(64) })).toEqual({ allowed: false, reason: 'RENDERING_NOT_APPROVED' });
  });

  it.each(['production', 'staging'])('always refuses %s, even with synthetic flags', deploymentEnvironment => {
    expect(familyReleaseEnabled({ ...eligible, deploymentEnvironment })).toBe(false);
    expect(decideFamilyRelease({ ...eligible, deploymentEnvironment })).toEqual({ allowed: false, reason: 'SYNTHETIC_ONLY' });
  });

  it.each(['syntheticEnvironmentEnabled', 'syntheticCenterEnabled'] as const)('requires independent %s', flag => {
    expect(decideFamilyRelease({ ...eligible, [flag]: false })).toEqual({ allowed: false, reason: 'SYNTHETIC_ONLY' });
  });

  it.each([
    [{ tenantMatches: false }, 'SCOPE_DENIED'], [{ childMatches: false }, 'SCOPE_DENIED'],
    [{ guardianMatchesRecipient: false }, 'RECIPIENT_DENIED'], [{ guardianAuthenticated: false }, 'RECIPIENT_DENIED'],
    [{ guardianActive: false }, 'RECIPIENT_DENIED'], [{ guardianRestriction: 'RESTRICTED' }, 'RESTRICTED'],
    [{ guardianRestriction: 'UNRESOLVED' }, 'RESTRICTED'], [{ safeguardingHold: true }, 'RESTRICTED'],
    [{ consentCurrent: false }, 'CONSENT_DENIED'], [{ consentPurposeMatches: false }, 'CONSENT_DENIED'],
    [{ clinicalApprovalCurrent: false }, 'RENDERING_NOT_APPROVED'],
    [{ documentFamilySafe: false }, 'DOCUMENT_WITHHELD'], [{ documentWithdrawn: true }, 'DOCUMENT_WITHHELD'],
    [{ grantActive: false }, 'GRANT_DENIED'], [{ grantVersionMatches: false }, 'GRANT_DENIED'],
  ] as const)('fails closed on %j', (change, reason) => {
    expect(decideFamilyRelease({ ...eligible, ...change } as FamilyReleaseContext)).toEqual({ allowed: false, reason });
  });

  it('requires clinical authority for approval, release and withdrawal', () => {
    for (const action of ['APPROVE', 'RELEASE', 'WITHDRAW', 'SUPERSEDE'] as const) {
      expect(decideFamilyRelease({ ...eligible, action })).toEqual({ allowed: false, reason: 'CLINICAL_AUTHORITY_REQUIRED' });
      expect(decideFamilyRelease({ ...eligible, action, actorClinician: true, actorAssignedToSpecialty: true })).toEqual({ allowed: true });
    }
  });

  it('permits independent clinical approval before a recipient is selected', () => {
    expect(decideFamilyRelease({ ...eligible, action: 'APPROVE', actorClinician: true,
      actorAssignedToSpecialty: true, guardianAuthenticated: false, guardianMatchesRecipient: false,
      consentCurrent: false, grantActive: false })).toEqual({ allowed: true });
  });

  it.each(['WITHDRAW', 'SUPERSEDE'] as const)('%s can remove access even after consent or safeguarding changes', action => {
    expect(decideFamilyRelease({ ...eligible, action, actorClinician: true,
      actorAssignedToSpecialty: true, guardianActive: false, guardianAuthenticated: false,
      consentCurrent: false, guardianRestriction: 'RESTRICTED', safeguardingHold: true,
      grantActive: false, documentWithdrawn: true })).toEqual({ allowed: true });
  });

  it('has a neutral notice without child, specialty or clinical content', () => {
    expect(FAMILY_RELEASE_NOTICE).toBe('A new document is available in your secure TheraBridge account.');
  });
});
