// Exercise the REAL instrumented ES module, not the selector's mock.
const {createHash}=require('node:crypto');
let artwork;
beforeAll(async()=>{artwork=await import('../src/lib/generated-artwork.mjs');});
const png=asset=>{
 const bytes=new Uint8Array(asset.reviewByteLength);
 const view=new DataView(bytes.buffer);
 view.setUint32(0,0x89504e47);view.setUint32(4,0x0d0a1a0a);
 view.setUint32(8,13);view.setUint32(12,0x49484452);
 view.setUint32(16,400);view.setUint32(20,300);
 bytes[24]=8;bytes[25]=2;
 return bytes;
};
test('canonical collection is immutable and resolves all and only known reference IDs',()=>{
 const {GENERATED_ARTWORK,findGeneratedArtwork}=artwork;
 expect(GENERATED_ARTWORK).toHaveLength(25);
 expect(Object.isFrozen(GENERATED_ARTWORK)).toBe(true);
 for(const asset of GENERATED_ARTWORK){
   expect(findGeneratedArtwork(asset.referenceId)).toBe(asset);
   expect(Object.isFrozen(asset)).toBe(true);
   expect(asset.approved).toBe(false);
   expect(asset.publishEnabled).toBe(false);
   expect(asset.clinicalReleaseEnabled).toBe(false);
 }
 for(const id of [undefined,null,{},'unknown','__proto__'])
   expect(findGeneratedArtwork(id)).toBeNull();
});
test('reject every malformed header field, wrong byte type and size, without hashing',async()=>{
 const a=artwork.GENERATED_ARTWORK[0];
 const verify=bytes=>artwork.verifyGeneratedReviewBytes(a.referenceId,bytes);
 expect(await artwork.verifyGeneratedReviewBytes('unknown',png(a))).toBe(false);
 for(const bad of [undefined,null,{},new ArrayBuffer(a.reviewByteLength),new Uint8Array(33)])
   expect(await verify(bad)).toBe(false);
 const digest=jest.spyOn(globalThis.crypto.subtle,'digest');
 try{
   for(const offset of [0,4,8,12,16,20,24,25,26,27,28]){
     const bytes=png(a);bytes[offset]^=1;
     expect(await verify(bytes)).toBe(false);
   }
   expect(digest).not.toHaveBeenCalled();
 }finally{digest.mockRestore();}
});
test('real cryptographic mismatch fails closed and unavailable digest is handled',async()=>{
 const a=artwork.GENERATED_ARTWORK[0],bytes=png(a);
 expect(createHash('sha256').update(bytes).digest('hex')).not.toBe(a.reviewSha256);
 expect(await artwork.verifyGeneratedReviewBytes(a.referenceId,bytes)).toBe(false);
 const digest=jest.spyOn(globalThis.crypto.subtle,'digest').mockRejectedValueOnce(new Error('unavailable'));
 try{expect(await artwork.verifyGeneratedReviewBytes(a.referenceId,bytes)).toBe(false);}
 finally{digest.mockRestore();}
});
test('hash success branch uses exactly the snapshot, and never changes release flags',async()=>{
 const a=artwork.GENERATED_ARTWORK[0],bytes=png(a);
 // Inject only the browser crypto response to isolate the positive control.
 // No claim that the synthetic buffer is the real asset or passes a real hash.
 const digest=jest.spyOn(globalThis.crypto.subtle,'digest').mockImplementationOnce(async(algorithm,snapshot)=>{
   expect(algorithm).toBe('SHA-256');
   expect(snapshot).not.toBe(bytes);
   expect(snapshot).toEqual(bytes);
   return Uint8Array.from(Buffer.from(a.reviewSha256,'hex')).buffer;
 });
 try{
   expect(await artwork.verifyGeneratedReviewBytes(a.referenceId,bytes)).toBe(true);
   expect(a.approved).toBe(false);
   expect(a.publishEnabled).toBe(false);
 }finally{digest.mockRestore();}
});
