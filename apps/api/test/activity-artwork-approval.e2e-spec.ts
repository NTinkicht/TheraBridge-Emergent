import { generateKeyPairSync, sign } from 'node:crypto';
import { canonicalFingerprint } from '../src/common/fingerprints';
import { artworkApprovalMessage, verifiesArtworkApproval, type ArtworkApproval, type ArtworkContext } from '../src/clinical/activity-artwork-approval';

describe('independent artwork evidence binding', () => {
  const rights = generateKeyPairSync('ed25519'), clinical = generateKeyPairSync('ed25519');
  const env = ['TB_ARTWORK_RIGHTS_PUBLIC_KEY_PEM','TB_ARTWORK_CLINICAL_PUBLIC_KEY_PEM'] as const;
  const old = env.map(k => process.env[k]);
  const context: ArtworkContext = {
    candidateId:'00000000-0000-4000-8000-000000000001', centerId:'00000000-0000-4000-8000-000000000002',
    templateId:'00000000-0000-4000-8000-000000000003', draftId:'00000000-0000-4000-8000-000000000004',
    templateVersion:7, draftVersion:1, slot:1, digestSha256:'a'.repeat(64), service:'speech',
    styleVersion:'m5-b-v1',sceneType:'home-support',sourceReference:'locked reference',altText:'Reviewed alt text',
    license:'reviewed license',providerTerms:'reviewed terms',instruction:'step',activityTitle:'title',
    activitySteps:['step'],activitySafety:['safety'],activityMaterials:['materials'],
  };
  function receipt(): ArtworkApproval {
    const row: ArtworkApproval = {
      candidateId:context.candidateId,centerId:context.centerId,templateId:context.templateId,
      templateVersion:context.templateVersion,slot:context.slot,digestSha256:context.digestSha256,
      contextSha256:canonicalFingerprint(context),rightsEvidenceSha256:'b'.repeat(64),
      clinicalEvidenceSha256:'c'.repeat(64),rightsSignature:'',clinicalSignature:'',
    };
    row.rightsSignature=sign(null,artworkApprovalMessage(row,'rights'),rights.privateKey).toString('base64');
    row.clinicalSignature=sign(null,artworkApprovalMessage(row,'clinical'),clinical.privateKey).toString('base64');
    return row;
  }
  beforeEach(()=>{
    process.env[env[0]]=rights.publicKey.export({type:'spki',format:'pem'}).toString();
    process.env[env[1]]=clinical.publicKey.export({type:'spki',format:'pem'}).toString();
  });
  afterEach(()=>env.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];}));
  it('requires two purpose-bound independent signatures',()=>expect(verifiesArtworkApproval(receipt(),context)).toBe(true));
  it.each([
    {templateVersion:8},{slot:2},{digestSha256:'d'.repeat(64)},{altText:'changed'},
    {license:'changed'},{providerTerms:null},{instruction:'different'},{activitySafety:['different']},
    {activitySteps:['different']},{activityMaterials:['different']},{draftVersion:2},{centerId:'foreign'},
  ])('rejects altered activity or image context %j',patch=>expect(verifiesArtworkApproval(receipt(),{...context,...patch})).toBe(false));
  it('rejects changed evidence and replay of one signature for the other purpose',()=>{
    const row=receipt();
    expect(verifiesArtworkApproval({...row,rightsEvidenceSha256:'e'.repeat(64)},context)).toBe(false);
    expect(verifiesArtworkApproval({...row,clinicalSignature:row.rightsSignature},context)).toBe(false);
    expect(verifiesArtworkApproval({...row,rightsSignature:'bad'},context)).toBe(false);
    expect(verifiesArtworkApproval({...row,clinicalEvidenceSha256:row.rightsEvidenceSha256},context)).toBe(false);
  });
  it('denies unconfigured or shared signing authority',()=>{
    delete process.env[env[0]];
    expect(verifiesArtworkApproval(receipt(),context)).toBe(false);
    process.env[env[0]]=process.env[env[1]];
    expect(verifiesArtworkApproval(receipt(),context)).toBe(false);
  });
});
