import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stagePrivateCandidate, PrivateStagingError } from '../src/clinical/activity-media-private-staging';
import { LocalQuarantineWriter, QuarantineWriteError } from '../src/clinical/activity-media-local-quarantine';
import { planQuarantineObject } from '../src/clinical/activity-media-quarantine-intent';
import { preflightActivityMedia } from '../src/clinical/activity-media-intake-preflight';

const scope = {
  centerId: '11111111-1111-4111-8111-111111111111',
  templateId: '22222222-2222-4222-8222-222222222222',
  draftId: '33333333-3333-4333-8333-333333333333',
  templateVersion: 3,
};
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const b of data) {
    crc ^= b;
    for (let j=0; j<8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, content: Buffer) {
  const code = Buffer.from(type);
  const size = Buffer.alloc(4); size.writeUInt32BE(content.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([code, content])));
  return Buffer.concat([size, code, content, crc]);
}
function png(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1,0); ihdr.writeUInt32BE(1,4); ihdr[8]=8; ihdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.from([0,3,6,9,255]))),
    chunk('IEND',Buffer.alloc(0))]);
}
const clean = async (bytes: Buffer) => ({
  verdict: 'CLEAN' as const, sha256: createHash('sha256').update(bytes).digest('hex'),
  scannedBytes: bytes.length, engine: 'synthetic-scanner',
  signatureSetVersion: 'test-only-v1',
});
describe('M5-14 real private-file staging integration — NO HTTP, reads or publication', () => {
  let root: string;
  beforeEach(async () => { root=await mkdtemp(join(tmpdir(),'tb-m5-14-staging-')); });
  afterEach(async () => { await rm(root,{recursive:true,force:true}); });

  it('persists the precise scanned PNG once into a private path and returns no key or URL', async () => {
    const bytes=png(), intent=planQuarantineObject(scope,preflightActivityMedia(bytes));
    const receipt=await stagePrivateCandidate(intent,bytes,clean,new LocalQuarantineWriter(root));
    const path=join(root,...intent.objectKey.split('/'));
    expect(await readFile(path)).toEqual(bytes);
    expect((await stat(path)).mode & 0o077).toBe(0);
    expect(receipt).toEqual({
      candidateSha256:createHash('sha256').update(bytes).digest('hex'),
      candidateBytes:bytes.length,integrityVerified:true,scannerObserved:true,
      quarantineWriteObserved:true,quarantined:true,approved:false,
      readEnabled:false,publishEnabled:false,safeForPublication:false,
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(JSON.stringify(receipt)).not.toMatch(/objectKey|path|url|bytesBase64|centerId|draftId|license/i);
    await expect(stagePrivateCandidate(intent,bytes,clean,new LocalQuarantineWriter(root)))
      .rejects.toThrow(PrivateStagingError);
    expect(await readFile(path)).toEqual(bytes);
  });

  it('snapshots BOTH object identity and byte content across a delayed trusted scan', async () => {
    const bytes=png(), original=Buffer.from(bytes);
    const intent={...planQuarantineObject(scope,preflightActivityMedia(bytes))};
    const originalKey=intent.objectKey;
    let release!: () => void;
    const scanner=async (candidate:Buffer) => {
      await new Promise<void>(resolve=>{release=resolve;});
      return clean(candidate);
    };
    const pending=stagePrivateCandidate(intent,bytes,scanner,new LocalQuarantineWriter(root));
    bytes.fill(0);
    intent.objectKey='../../escape.png';
    intent.centerId='99999999-9999-4999-8999-999999999999';
    release();
    const receipt=await pending;
    expect(receipt.candidateSha256).toBe(createHash('sha256').update(original).digest('hex'));
    expect(await readFile(join(root,...originalKey.split('/')))).toEqual(original);
    expect(await readdir(root)).toEqual(['candidate']);
  });

  it('fails closed on missing scanner, infected verdict, stale attestation and invalid PNG with zero disk writes', async () => {
    const bytes=png(), intent=planQuarantineObject(scope,preflightActivityMedia(bytes));
    const mutated=Buffer.from(bytes); mutated[mutated.length-1] ^= 1;
    for(const [candidate,scanner] of [
      [bytes,undefined],
      [bytes,async (v:Buffer)=>({...await clean(v),verdict:'INFECTED'})],
      [bytes,async (v:Buffer)=>({...await clean(v),sha256:'0'.repeat(64)})],
      [bytes,async (_v:Buffer)=>{throw Error('scanner offline')}],
      [mutated,clean],
    ] as const) {
      await expect(stagePrivateCandidate(intent,candidate,scanner as never,new LocalQuarantineWriter(root)))
        .rejects.toThrow(PrivateStagingError);
      expect(await readdir(root)).toEqual([]);
    }
  });

  it('rejects forged rights/identity/hash and accessor-backed intent without invoking getters', async () => {
    const bytes=png(), valid=planQuarantineObject(scope,preflightActivityMedia(bytes));
    let invoked=false;
    const malicious=Object.defineProperty({...valid},'objectKey',{
      enumerable:true,get(){invoked=true;return valid.objectKey;}
    });
    for(const bad of [
      {...valid,centerId:'99999999-9999-4999-8999-999999999999'},
      {...valid,candidateSha256:'f'.repeat(64)},
      {...valid,approved:true},
      {...valid,readEnabled:true},
      {...valid,publishEnabled:true},
      {...valid,templateVersion:0},
      {...valid,unrecognizedField:'injected'},
      malicious,
    ]) {
      await expect(stagePrivateCandidate(bad as never,bytes,clean,new LocalQuarantineWriter(root)))
        .rejects.toThrow(PrivateStagingError);
      expect(await readdir(root)).toEqual([]);
    }
    expect(invoked).toBe(false);
    await expect(new LocalQuarantineWriter(root).write(malicious as never,bytes))
      .rejects.toThrow(QuarantineWriteError);
    expect(invoked).toBe(false);
  });
});
