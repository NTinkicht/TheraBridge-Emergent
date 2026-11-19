import { createHash } from 'node:crypto';
import { ScannerBoundaryError, scanPrivateCandidate } from '../src/clinical/activity-media-scanner-boundary';
const bytes = () => Buffer.from(Array.from({length: 40},(_,i)=>i));
const clean = async (input:Buffer) => ({
  verdict:'CLEAN' as const,sha256:createHash('sha256').update(input).digest('hex'),
  scannedBytes:input.length,engine:'test-engine-1',signatureSetVersion:'synthetic-2026',
});
describe('WU4-I scanner attestation fail closed',()=>{
  it('accepts a trusted matching simulated scan as quarantine evidence ONLY',async()=>{
    const data=bytes();
    const result=await scanPrivateCandidate(data,clean);
    expect(result).toEqual({
      sha256:createHash('sha256').update(data).digest('hex'),byteLength:data.length,
      engine:'test-engine-1',signatureSetVersion:'synthetic-2026',scanObserved:true,
      quarantined:true,approved:false,readEnabled:false,publishEnabled:false,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/publicUrl|storageKey|base64|signedUrl/i);
  });
  it('snapshots caller bytes before scanner awaits',async()=>{
    const data=bytes(), original=Buffer.from(data);
    const call=scanPrivateCandidate(data,async candidate=>{
      await Promise.resolve();
      return clean(candidate);
    });
    data.fill(0);
    expect((await call).sha256).toBe(createHash('sha256').update(original).digest('hex'));
  });
  it.each([null,undefined,'',{},Buffer.alloc(32),Buffer.alloc(8*1024*1024+1)])(
    'rejects malformed or oversized bytes %#',async value=>{
      await expect(scanPrivateCandidate(value,clean)).rejects.toThrow(ScannerBoundaryError);
    });
  it('rejects missing scanner and scanner exceptions',async()=>{
    await expect(scanPrivateCandidate(bytes())).rejects.toThrow(ScannerBoundaryError);
    await expect(scanPrivateCandidate(bytes(),async()=>{throw new Error('scanner offline');}))
      .rejects.toThrow(ScannerBoundaryError);
  });
  it('rejects malicious, undecidable and invalid scanner verdicts',async()=>{
    for(const verdict of ['INFECTED','ERROR','UNKNOWN','PENDING']){
      await expect(scanPrivateCandidate(bytes(),async data=>({...await clean(data),verdict} as never)))
        .rejects.toThrow(ScannerBoundaryError);
    }
  });
  it('rejects digest/length/engine/signature mismatches',async()=>{
    for(const altered of [
      {sha256:'0'.repeat(64)},{sha256:'./bad'},{scannedBytes:4},
      {engine:''},{engine:'bad/path'},{signatureSetVersion:''},
      {signatureSetVersion:'../../bad'},
    ]){
      await expect(scanPrivateCandidate(bytes(),async data=>({...await clean(data),...altered})))
        .rejects.toThrow(ScannerBoundaryError);
    }
  });
});
