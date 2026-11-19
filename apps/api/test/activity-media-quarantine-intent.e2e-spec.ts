import { preflightActivityMedia } from '../src/clinical/activity-media-intake-preflight';
import { planQuarantineObject, QuarantineIntentError } from '../src/clinical/activity-media-quarantine-intent';

const scope = {
  centerId: '11111111-1111-4111-8111-111111111111',
  templateId: '22222222-2222-4222-8222-222222222222',
  draftId: '33333333-3333-4333-8333-333333333333',
  templateVersion: 2,
};
function header() {
  const b = Buffer.alloc(33);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13,8); b.write('IHDR',12);
  b.writeUInt32BE(600,16); b.writeUInt32BE(450,20);
  b[24]=8; b[25]=6;
  return b;
}
const candidate = () => preflightActivityMedia(header());

describe('WU4-F quarantine-only media object boundary', () => {
  it('creates immutable random write-only candidate location with no public read projection', () => {
    const first=planQuarantineObject(scope,candidate());
    const next=planQuarantineObject(scope,candidate());
    expect(first.bucketClass).toBe('private-quarantine');
    expect(first.objectKey).toMatch(/^candidate\/v1\/11111111-1111-4111-8111-111111111111\/[a-f0-9-]+\/[a-f0-9-]+\.png$/);
    expect(first.objectKey).not.toEqual(next.objectKey);
    expect(first.objectKey).not.toContain(scope.draftId);
    expect(first).toMatchObject({ quarantineOnly:true, approved:false, publishEnabled:false, readEnabled:false, templateVersion:2 });
    expect(Object.isFrozen(first)).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(/https?:|signedUrl|presigned|publicUrl|base64/);
  });
  it.each([
    {centerId:'../escape'},
    {templateId:'abc'},
    {draftId:'http://unsafe.test'},
    {templateVersion:0},
    {templateVersion:1.5},
  ])('rejects malformed or stale-scoped inputs %#', override => {
    expect(()=>planQuarantineObject({...scope,...override},candidate())).toThrow(QuarantineIntentError);
  });
  it('rejects forged candidates claiming approval or storage-readiness',()=>{
    for(const changed of [
      {approved:true},{publishEnabled:true},{safeForStorage:true},
      {sha256:'../../evil'},{format:'svg'}, {byteLength:0},
    ]) {
      expect(()=>planQuarantineObject(scope,{...candidate(),...changed} as never)).toThrow(QuarantineIntentError);
    }
  });
  it('rejects attacker-selected invalid object keys',()=>{
    expect(()=>planQuarantineObject(scope,candidate(),'../../other-tenant')).toThrow(QuarantineIntentError);
  });
});
