import {createHash} from 'node:crypto';
import {readFile,lstat} from 'node:fs/promises';
import {join,resolve,dirname,parse} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ILLUSTRATION_REFERENCE_SLOTS,ILLUSTRATION_STYLE_VERSION}
  from '../../apps/web/src/lib/illustration-style.mjs';
export const REFERENCE_PINS=Object.freeze({
  manifest:'bf26b55138f09bfdea7b4f5041ebf881356c1ecfe33029109264576044e72b77',
  contact:'baeac7d3031bd40d3d0364b5405f83d27c0dc71e2e71b0f15d18f79e37fb2cf7',
  source:'169c34a1589084b2cc7dd722bb0ec839165453a1b2a31b80f2ae6d2ff32e40a5',
  zip:'a32ba0c3037e607beb95f8bcefad50cdd580d2d08f01d2163684798355571379'
});
const hash=b=>createHash('sha256').update(b).digest('hex');
const reference=new Map(ILLUSTRATION_REFERENCE_SLOTS.map(x=>[x.id,x]));
export class ReferenceCheckError extends Error {
  constructor(){super('Reference integrity failed; publication blocked.');}
}
async function safeRead(root,name,max){
  if(typeof name!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,115}$/.test(name))
    throw new ReferenceCheckError();
  const path=join(root,name),s=await lstat(path);
  if(!s.isFile()||s.isSymbolicLink()||s.size<16||s.size>max)
    throw new ReferenceCheckError();
  return readFile(path);
}
/** Pins are injectable only for deterministic fixture testing. CLI uses immutable real pins. */
export async function checkReferencePack(root,pins=REFERENCE_PINS){
  try {
    if(typeof root!=='string'||!root.startsWith('/'))throw new ReferenceCheckError();
    const directory=resolve(root);
    // resolve() normalizes strings; it does NOT detect ancestor symlinks.
    // Walk the literal absolute path to the filesystem root with lstat()
    // before reading any manifest or image to forbid alias traversal.
    let component=directory;
    const fsRoot=parse(directory).root;
    for (;;) {
      const st=await lstat(component);
      if(!st.isDirectory()||st.isSymbolicLink())throw new ReferenceCheckError();
      if(component===fsRoot)break;
      const parent=dirname(component);
      if(parent===component)throw new ReferenceCheckError();
      component=parent;
    }
    const bytes=await safeRead(directory,'reference-manifest.json',32768);
    if(hash(bytes)!==pins.manifest)throw new ReferenceCheckError();
    const m=JSON.parse(bytes.toString('utf8'));
    if(m.schemaVersion!==1||m.styleVersion!==ILLUSTRATION_STYLE_VERSION||
      m.status!=='UNAPPROVED_CONCEPT_REFERENCE_ONLY'||
      m.sourceImageSha256!==pins.source||
      !Array.isArray(m.sourceResolution)||m.sourceResolution.join(',')!=='1402,1122'||
      !Array.isArray(m.items)||m.items.length!==25)throw new ReferenceCheckError();
    const board=await safeRead(directory,'contact-sheet-original.png',5*1024*1024);
    if(hash(board)!==pins.contact||board.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
      throw new ReferenceCheckError();
    const ids=new Set(),paths=new Set();
    for(const item of m.items){
      const slot=reference.get(item.id);
      if(!slot||ids.has(item.id)||paths.has(item.path)||
        slot.family!==item.family||slot.scene!==item.scene||
        item.format!=='WEBP'||item.width!==320||item.height!==240||
        item.releaseAllowed!==false||item.reviewStatus!=='NOT_APPROVED'||
        !/^[a-f0-9]{64}$/.test(item.sha256))throw new ReferenceCheckError();
      const image=await safeRead(directory,item.path,1024*1024);
      if(hash(image)!==item.sha256||image.length<30||
        image.toString('ascii',0,4)!=='RIFF'||image.toString('ascii',8,16)!=='WEBPVP8 '||
        image.readUInt32LE(4)+8!==image.length||
        image[23]!==0x9d||image[24]!==1||image[25]!==0x2a||
        (image.readUInt16LE(26)&0x3fff)!==320||
        (image.readUInt16LE(28)&0x3fff)!==240)throw new ReferenceCheckError();
      ids.add(item.id);paths.add(item.path);
    }
    if(ids.size!==reference.size)throw new ReferenceCheckError();
    return Object.freeze({verified:25,style:'m5-b-v1',previewOnly:true,
      humanStyleApproval:'NOT_OBTAINED',humanClinicalApproval:'NOT_OBTAINED',
      legalRightsApproval:'NOT_OBTAINED',published:false,
      clinicalGate:'NO_GO_G2_G2b'});
  }catch{throw new ReferenceCheckError();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const a=process.argv.slice(2);
  if(a.length!==2||a[0]!=='--dir'){process.stderr.write('Pass --dir extracted-reference-pack\n');process.exitCode=1;}
  else try{process.stdout.write(JSON.stringify(await checkReferencePack(a[1]))+'\n');}
  catch{process.stderr.write('Reference integrity failed; no approval granted.\n');process.exitCode=1;}
}
