import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, chmod, symlink, rm, stat, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalQuarantineWriter, QuarantineWriteError } from '../src/clinical/activity-media-local-quarantine';
import { planQuarantineObject } from '../src/clinical/activity-media-quarantine-intent';
import { preflightActivityMedia } from '../src/clinical/activity-media-intake-preflight';

const scope = {
  centerId: '11111111-1111-4111-8111-111111111111',
  templateId: '22222222-2222-4222-8222-222222222222',
  draftId: '33333333-3333-4333-8333-333333333333',
  templateVersion: 1,
};
function syntheticHeader() {
  const b = Buffer.alloc(33);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(b);
  b.writeUInt32BE(13,8); b.write('IHDR',12);
  b.writeUInt32BE(2,16); b.writeUInt32BE(2,20);
  b[24]=8; b[25]=6;
  return b;
}
describe('WU4-G private quarantine adapter (NOT upload authorization)', () => {
  let root: string;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'tb-media-quarantine-')); });
  afterEach(async () => { await rm(root, {recursive:true, force:true}); });
  it('creates a private file exactly once and returns no storage location or URL', async () => {
    const bytes=syntheticHeader();
    const intent=planQuarantineObject(scope,preflightActivityMedia(bytes));
    const writer=new LocalQuarantineWriter(root);
    const receipt=await writer.write(intent,bytes);
    expect(receipt).toEqual({
      sha256:createHash('sha256').update(bytes).digest('hex'),
      byteLength:bytes.length,quarantined:true,approved:false,publishEnabled:false,readEnabled:false,
    });
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(JSON.stringify(receipt)).not.toMatch(/objectKey|path|url|base64/i);
    const file=join(root,...intent.objectKey.split('/'));
    expect(await readFile(file)).toEqual(bytes);
    expect((await stat(file)).mode & 0o077).toBe(0);
    expect(await readdir(join(root,'candidate','v1',scope.centerId))).toHaveLength(1);
    await expect(writer.write(intent,bytes)).rejects.toMatchObject({code:'EEXIST'});
  });
  it('snapshots caller-owned mutable bytes before any filesystem await',async()=>{
    const bytes=syntheticHeader();
    const expected=Buffer.from(bytes);
    const intent=planQuarantineObject(scope,preflightActivityMedia(bytes));
    const task=new LocalQuarantineWriter(root).write(intent,bytes);
    bytes.fill(0);
    const receipt=await task;
    expect(receipt.sha256).toBe(createHash('sha256').update(expected).digest('hex'));
    expect(await readFile(join(root,...intent.objectKey.split('/')))).toEqual(expected);
  });
  it('rejects a symlink hidden in an ancestor of the configured root', async()=>{
    const outside=await mkdtemp(join(tmpdir(),'tb-symlink-outside-'));
    const alias=join(root,'alias');
    const nested=join(outside,'quarantine');
    try {
      await symlink(outside,alias);
      await mkdir(nested,{mode:0o700});
      const bytes=syntheticHeader();
      const intent=planQuarantineObject(scope,preflightActivityMedia(bytes));
      await expect(new LocalQuarantineWriter(join(alias,'quarantine')).write(intent,bytes))
        .rejects.toThrow(QuarantineWriteError);
      expect(await readdir(nested)).toEqual([]);
    } finally {
      await rm(outside,{recursive:true,force:true});
    }
  });
  it('rejects changed bytes, altered candidate claims and malformed keys',async()=>{
    const bytes=syntheticHeader(), intent=planQuarantineObject(scope,preflightActivityMedia(bytes));
    const writer=new LocalQuarantineWriter(root);
    const changed=Buffer.from(bytes); changed[31]=1;
    await expect(writer.write(intent,changed)).rejects.toThrow(QuarantineWriteError);
    for(const patch of [
      {objectKey:'../escape.png'}, {objectKey:intent.objectKey.replace(scope.centerId,scope.templateId)},
      {approved:true}, {readEnabled:true}, {publishEnabled:true},
      {candidateBytes:12}, {candidateSha256:'0'.repeat(64)},
    ]){
      await expect(writer.write({...intent,...patch} as never,bytes)).rejects.toThrow(QuarantineWriteError);
    }
  });
  it('rejects publicly accessible roots and linked private directories',async()=>{
    expect(()=>new LocalQuarantineWriter('relative')).toThrow(QuarantineWriteError);
    expect(()=>new LocalQuarantineWriter('/')).toThrow(QuarantineWriteError);
    expect(()=>new LocalQuarantineWriter('/tmp/public/media')).toThrow(QuarantineWriteError);
    const bytes=syntheticHeader(), intent=planQuarantineObject(scope,preflightActivityMedia(bytes));
    const outside=await mkdtemp(join(tmpdir(),'tb-outside-'));
    try {
      await symlink(outside,join(root,'candidate'));
      await expect(new LocalQuarantineWriter(root).write(intent,bytes)).rejects.toThrow(QuarantineWriteError);
    } finally { await rm(outside,{recursive:true,force:true}); }
  });
  it('rejects group-readable quarantine roots',async()=>{
    await chmod(root,0o755);
    const bytes=syntheticHeader(),intent=planQuarantineObject(scope,preflightActivityMedia(bytes));
    await expect(new LocalQuarantineWriter(root).write(intent,bytes)).rejects.toThrow(QuarantineWriteError);
  });
});
