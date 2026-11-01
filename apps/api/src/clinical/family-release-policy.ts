/** TB-EM-053 v1.1: a fail-closed, side-effect-free family release decision. */
export type FamilyReleaseAction = 'APPROVE' | 'RELEASE' | 'READ' | 'WITHDRAW' | 'SUPERSEDE';

export interface FamilyReleaseContext {
  action: FamilyReleaseAction;
  deploymentEnvironment: string | undefined;
  syntheticEnvironmentEnabled: boolean;
  syntheticCenterEnabled: boolean;
  actorActive: boolean;
  actorClinician: boolean;
  actorAssignedToSpecialty: boolean;
  guardianAuthenticated: boolean;
  guardianActive: boolean;
  guardianMatchesRecipient: boolean;
  tenantMatches: boolean;
  childMatches: boolean;
  guardianRestriction: 'CLEAR' | 'RESTRICTED' | 'UNRESOLVED';
  consentCurrent: boolean;
  consentPurposeMatches: boolean;
  safeguardingHold: boolean;
  clinicalApprovalCurrent: boolean;
  approvedRenderingHash: string | null;
  servedRenderingHash: string | null;
  grantActive: boolean;
  grantVersionMatches: boolean;
  documentFamilySafe: boolean;
  documentWithdrawn: boolean;
}

export type FamilyReleaseDecision = { allowed: true } | { allowed: false; reason: string };

/** Never use editable center labels/slugs or a different feature's flag. */
export function familyReleaseEnabled(context: Pick<FamilyReleaseContext,
  'deploymentEnvironment' | 'syntheticEnvironmentEnabled' | 'syntheticCenterEnabled'>): boolean {
  return context.deploymentEnvironment !== 'production' && context.deploymentEnvironment !== 'staging' &&
    context.syntheticEnvironmentEnabled && context.syntheticCenterEnabled;
}

export function decideFamilyRelease(c: FamilyReleaseContext): FamilyReleaseDecision {
  const deny = (reason: string): FamilyReleaseDecision => ({ allowed: false, reason });
  if (!familyReleaseEnabled(c)) return deny('SYNTHETIC_ONLY');
  if (!c.tenantMatches || !c.childMatches) return deny('SCOPE_DENIED');
  if (!c.actorActive) return deny('ACTOR_INACTIVE');
  if (c.action === 'APPROVE' || c.action === 'RELEASE' || c.action === 'WITHDRAW' || c.action === 'SUPERSEDE') {
    if (!c.actorClinician || !c.actorAssignedToSpecialty) return deny('CLINICAL_AUTHORITY_REQUIRED');
  }
  // Approval is a clinical action on a family-safe rendering, not a grant to a
  // particular guardian. Its later release and every read are independently gated.
  if (c.action === 'APPROVE') return c.documentFamilySafe && !c.documentWithdrawn
    ? { allowed: true } : deny('DOCUMENT_WITHHELD');
  // Access-removing clinical actions must remain possible after the guardian's
  // consent has been withdrawn, their link restricted, or safeguarding held.
  if (c.action === 'WITHDRAW' || c.action === 'SUPERSEDE') return { allowed: true };
  if (!c.guardianActive || !c.guardianAuthenticated || !c.guardianMatchesRecipient) return deny('RECIPIENT_DENIED');
  if (c.guardianRestriction !== 'CLEAR' || c.safeguardingHold) return deny('RESTRICTED');
  if (!c.consentCurrent || !c.consentPurposeMatches) return deny('CONSENT_DENIED');
  if (!c.documentFamilySafe || c.documentWithdrawn) return deny('DOCUMENT_WITHHELD');
  if (!c.clinicalApprovalCurrent || !c.approvedRenderingHash ||
      !/^[a-f0-9]{64}$/.test(c.approvedRenderingHash) ||
      c.approvedRenderingHash !== c.servedRenderingHash) return deny('RENDERING_NOT_APPROVED');
  if (c.action === 'READ' && (!c.grantActive || !c.grantVersionMatches)) return deny('GRANT_DENIED');
  return { allowed: true };
}

export const FAMILY_RELEASE_NOTICE = 'A new document is available in your secure TheraBridge account.';
