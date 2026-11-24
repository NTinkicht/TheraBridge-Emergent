import { UnprocessableEntityException } from '@nestjs/common';
import { assertGeneratedReferenceBytes, assertGeneratedReferenceScope, generatedReferenceDigest } from '../src/clinical/generated-artwork-reference';

const digest='70da78a9234c4ba733265c35b0bfbe5693c5e865e0e1130c6e74c090d03cf226';
const source='m5-b-v1:WU2A-S1-SPEECH:sha256:'+digest;
describe('M5 PR A generated artwork identity boundary',()=>{
  it('keeps unrelated private intake unchanged and resolves exact known reference',()=>{
    expect(generatedReferenceDigest(null)).toBeNull();
    expect(generatedReferenceDigest('legacy-source')).toBeNull();
    expect(generatedReferenceDigest(source)).toBe(digest);
    expect(()=>assertGeneratedReferenceBytes('legacy-source','synthetic')).not.toThrow();
    expect(()=>assertGeneratedReferenceScope('legacy-source','speech','any')).not.toThrow();
    expect(()=>assertGeneratedReferenceScope(source,'speech','therapist-guided')).not.toThrow();
  });
  it('rejects malformed and mismatched IDs and hash',()=>{
    for(const s of ['m5-b-v1:',source.replace(digest,'a'.repeat(64)),source.replace('S1-SPEECH','S1-OCCUPATIONAL'),source+'x'])
      expect(()=>generatedReferenceDigest(s)).toThrow(UnprocessableEntityException);
  });
  it('denies wrong specialty/scene, incorrect PNG and digest substitution',()=>{
    expect(()=>assertGeneratedReferenceScope(source,'physical','therapist-guided')).toThrow(UnprocessableEntityException);
    expect(()=>assertGeneratedReferenceScope(source,'speech','safety-access')).toThrow(UnprocessableEntityException);
    expect(()=>assertGeneratedReferenceBytes(source,Buffer.alloc(33).toString('base64'))).toThrow(UnprocessableEntityException);
    const b=Buffer.alloc(186879);b.writeUInt32BE(400,16);b.writeUInt32BE(300,20);
    expect(()=>assertGeneratedReferenceBytes(source,b.toString('base64'))).toThrow(UnprocessableEntityException);
  });
});
