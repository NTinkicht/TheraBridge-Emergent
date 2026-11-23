import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {join,dirname,basename} from 'node:path';import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {ILLUSTRATION_REFERENCE_SLOTS} from '../../apps/web/src/lib/illustration-style.mjs';
import {checkReferencePack,REFERENCE_PINS,ReferenceCheckError} from './m5-wu2a-review-integrity.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'m5-art-'));
 const img=Buffer.alloc(40),board=Buffer.from('89504e470d0a1a0a'+'01'.repeat(24),'hex');
 img.write('RIFF',0);img.writeUInt32LE(32,4);img.write('WEBPVP8 ',8);
 img[23]=0x9d;img[24]=1;img[25]=0x2a;img.writeUInt16LE(320,26);img.writeUInt16LE(240,28);
 const items=ILLUSTRATION_REFERENCE_SLOTS.map((s,i)=>({
  id:s.id,family:s.family,scene:s.scene,description:'Synthetic',
  path:'concept-'+i+'.webp',format:'WEBP',width:320,height:240,
  sha256:sha(img),releaseAllowed:false,reviewStatus:'NOT_APPROVED'
 }));
 for(const x of items)await writeFile(join(root,x.path),img);
 await writeFile(join(root,'contact-sheet-original.png'),board);
 const source=sha(Buffer.from('not-real-source'));
 const raw=Buffer.from(JSON.stringify({schemaVersion:1,styleVersion:'m5-b-v1',
  status:'UNAPPROVED_CONCEPT_REFERENCE_ONLY',sourceImageSha256:source,
  sourceResolution:[1402,1122],croppingNote:'test',items}));
 await writeFile(join(root,'reference-manifest.json'),raw);
 return {root,items,pins:{...REFERENCE_PINS,manifest:sha(raw),contact:sha(board),source}};
}
test('pins identify the original concept revision, not a license',()=>{
 assert.equal(REFERENCE_PINS.manifest,'bf26b55138f09bfdea7b4f5041ebf881356c1ecfe33029109264576044e72b77');
});
test('25 synthetic concepts can verify but never approve',async()=>{
 const f=await fixture();try{
  const x=await checkReferencePack(f.root,f.pins);
  assert.equal(x.verified,25);assert.equal(x.published,false);
  assert.equal(x.clinicalGate,'NO_GO_G2_G2b');
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('intermediate symlinked ancestor never qualifies a pinned reference pack',async()=>{
  const f=await fixture(),base=await mkdtemp(join(tmpdir(),'m5-ancestor-'));
  try {
    // The leaf pack directory is real; only its intermediate parent is a
    // symlink. Checking lstat(leaf) alone falsely accepted this path.
    await symlink(dirname(f.root),join(base,'intermediate'));
    const alias=join(base,'intermediate',basename(f.root));
    await assert.rejects(checkReferencePack(alias,f.pins),ReferenceCheckError);
    assert.equal((await checkReferencePack(f.root,f.pins)).verified,25);
  } finally {
    await rm(base,{recursive:true,force:true});
    await rm(f.root,{recursive:true,force:true});
  }
});
test('unpinned content, damaged image and symlink fail closed',async()=>{
 for(const mutate of [
  async f=>writeFile(join(f.root,'reference-manifest.json'),'{}'),
  async f=>writeFile(join(f.root,f.items[0].path),'tampered'),
  async f=>{await rm(join(f.root,f.items[0].path));
   await symlink(join(f.root,f.items[1].path),join(f.root,f.items[0].path));}
 ]){const f=await fixture();try{await mutate(f);
   await assert.rejects(checkReferencePack(f.root,f.pins),ReferenceCheckError);
  }finally{await rm(f.root,{recursive:true,force:true});}}
 const f=await fixture();try{await assert.rejects(checkReferencePack(f.root),ReferenceCheckError);}
 finally{await rm(f.root,{recursive:true,force:true});}
});
