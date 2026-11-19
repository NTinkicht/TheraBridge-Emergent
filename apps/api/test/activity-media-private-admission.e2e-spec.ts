import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {inspectPrivateAdmission,PrivateAdmissionError} from '../src/clinical/activity-media-private-admission';
const scope={centerId:'11111111-1111-4111-8111-111111111111',templateId:'22222222-2222-4222-8222-222222222222',draftId:'33333333-3333-4333-8333-333333333333',templateVersion:2};
function crc32(data:Buffer){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(name:string,bytes:Buffer){
 const type=Buffer.from(name),size=Buffer.alloc(4),crc=Buffer.alloc(4);
 size.writeUInt32BE(bytes.length);crc.writeUInt32BE(crc32(Buffer.concat([type,bytes])));
 return Buffer.concat([size,type,bytes,crc]);
}
function validPng(){
 const hdr=Buffer.alloc(13);hdr.writeUInt32BE(1,0);hdr.writeUInt32BE(1,4);hdr[8]=8;hdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',hdr),
  chunk('IDAT',deflateSync(Buffer.from([0,1,2,3,4]))),chunk('IEND',Buffer.alloc(0))]);
}
const clean=async(b:Buffer)=>({verdict:'CLEAN' as const,sha256:createHash('sha256').update(b).digest('hex'),scannedBytes:b.length,engine:'synthetic-scanner',signatureSetVersion:'test-signatures-v1'});
describe('WU4-L private integrity+scan composite (never storage admission)',()=>{
 it('binds valid synthetic PNG, exact trusted scan and quarantined scope without granting publication',async()=>{
   const bytes=validPng(),out=await inspectPrivateAdmission(scope,bytes,clean);
   expect(out).toEqual({centerId:scope.centerId,templateId:scope.templateId,draftId:scope.draftId,
     templateVersion:2,candidateSha256:createHash('sha256').update(bytes).digest('hex'),
     candidateBytes:bytes.length,pngStructureVerified:true,scannerObserved:true,
     quarantineIntentObserved:true,approved:false,readEnabled:false,
     publishEnabled:false,safeForStorage:false});
   expect(Object.isFrozen(out)).toBe(true);
   expect(JSON.stringify(out)).not.toMatch(/objectKey|url|storagePath|signatureSetVersion|license/);
 });
 it('snapshots bytes against mutation during pending scan',async()=>{
   const bytes=validPng(),original=Buffer.from(bytes);
   const task=inspectPrivateAdmission(scope,bytes,async snap=>{
     await Promise.resolve();return clean(snap);
   });
   bytes.fill(0);
   const result=await task;
   expect(result.candidateSha256).toBe(createHash('sha256').update(original).digest('hex'));
 });
 it('rejects a scanner missing, infected, broken, stale, or dishonest',async()=>{
   const bytes=validPng();
   await expect(inspectPrivateAdmission(scope,bytes)).rejects.toThrow(PrivateAdmissionError);
   for(const scanner of [
     async()=>{throw Error('scanner unavailable');},
     async(b:Buffer)=>({...await clean(b),verdict:'INFECTED' as const}),
     async(b:Buffer)=>({...await clean(b),sha256:'f'.repeat(64)}),
     async(b:Buffer)=>({...await clean(b),scannedBytes:b.length-1}),
   ])await expect(inspectPrivateAdmission(scope,bytes,scanner)).rejects.toThrow(PrivateAdmissionError);
 });
 it('rejects malformed PNG, invalid tenant/version and forged scope',async()=>{
   const bytes=validPng(),bad=Buffer.from(bytes);bad[bad.length-1]^=1;
   for(const item of [bad,Buffer.alloc(33),Buffer.alloc(0)])
     await expect(inspectPrivateAdmission(scope,item,clean)).rejects.toThrow(PrivateAdmissionError);
   for(const patch of [{centerId:'../../other'},{templateId:'other'},{draftId:'bad'},{templateVersion:0}]){
     await expect(inspectPrivateAdmission({...scope,...patch},bytes,clean)).rejects.toThrow(PrivateAdmissionError);
   }
 });
});
