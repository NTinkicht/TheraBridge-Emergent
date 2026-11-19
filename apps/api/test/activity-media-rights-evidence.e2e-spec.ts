import { MediaRightsEvidenceError, verifyMediaRightsEvidence } from '../src/clinical/activity-media-rights-evidence';
const facts=()=>({
  centerId:'11111111-1111-4111-8111-111111111111',
  templateId:'22222222-2222-4222-8222-222222222222',
  draftId:'33333333-3333-4333-8333-333333333333',
  templateVersion:3,assetSha256:'a'.repeat(64),
  creatorUserId:'44444444-4444-4444-8444-444444444444',
  reviewerUserId:'55555555-5555-4555-8555-555555555555',
  sourceType:'GENERATED' as const,sourceReference:'internal-synthetic-reference',
  licenseId:'synthetic-commercial-permission',providerTerms:'synthetic-provider-terms-only',
  attribution:'synthetic-creator',rightsCheckedAt:'2026-11-19T12:00:00Z',
  reviewDecision:'RIGHTS_VERIFIED' as const,
  reviewAssetSha256:'a'.repeat(64),reviewTemplateVersion:3,
  reviewCenterId:'11111111-1111-4111-8111-111111111111',
  reviewDraftId:'33333333-3333-4333-8333-333333333333',
});
describe('WU4-J rights evidence gate (NOT an approval transition)',()=>{
  it('emits immutable scoped evidence with clinical and publication blocked',()=>{
    const evidence=verifyMediaRightsEvidence(facts());
    expect(evidence).toEqual({
      centerId:facts().centerId,templateId:facts().templateId,draftId:facts().draftId,
      templateVersion:3,assetSha256:'a'.repeat(64),rightsReviewObserved:true,
      clinicalReviewObserved:false,publishEnabled:false,approved:false,readEnabled:false,
    });
    expect(Object.isFrozen(evidence)).toBe(true);
    expect(JSON.stringify(evidence)).not.toMatch(/providerTerms|sourceReference|licenseId|publicUrl/);
  });
  it.each([
    {reviewerUserId:facts().creatorUserId},
    {templateVersion:0},{templateVersion:1.2},
    {assetSha256:'z'.repeat(64)}, {reviewAssetSha256:'b'.repeat(64)},
    {reviewTemplateVersion:2},
    {reviewCenterId:facts().templateId},{reviewDraftId:facts().centerId},
    {sourceReference:''},{licenseId:''},{attribution:''},
    {providerTerms:''},{rightsCheckedAt:'not-a-date'},
    {reviewDecision:'PENDING'},{reviewDecision:'REJECTED'},
    {sourceType:'UNKNOWN'},
  ])('rejects stale, forged or incomplete reviewer/provenance facts %#',change=>{
    expect(()=>verifyMediaRightsEvidence({...facts(),...change} as never)).toThrow(MediaRightsEvidenceError);
  });
  it('requires provider terms only for generated evidence',()=>{
    const original={...facts(),sourceType:'ORIGINAL' as const,providerTerms:undefined};
    expect(verifyMediaRightsEvidence(original).approved).toBe(false);
    expect(()=>verifyMediaRightsEvidence({...facts(),providerTerms:undefined})).toThrow(MediaRightsEvidenceError);
  });
  it('rejects missing records and malformed reviewer or owner IDs',()=>{
    expect(()=>verifyMediaRightsEvidence(null as never)).toThrow(MediaRightsEvidenceError);
    for(const change of [{centerId:'x'},{templateId:'x'},{draftId:'x'},{creatorUserId:'x'},{reviewerUserId:'x'}]){
      expect(()=>verifyMediaRightsEvidence({...facts(),...change})).toThrow(MediaRightsEvidenceError);
    }
  });
});
