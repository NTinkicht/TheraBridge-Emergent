import { deflateSync } from 'node:zlib';
import { PngIntegrityError, verifyPngCandidate } from '../src/clinical/activity-media-png-integrity';

function crc32(data: Buffer) {
  let crc=0xffffffff;
  for(const b of data){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^(crc&1?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function chunk(type:string, data:Buffer) {
  const tag=Buffer.from(type,'ascii');
  const header=Buffer.alloc(4); header.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([tag,data])));
  return Buffer.concat([header,tag,data,crc]);
}
function syntheticPng(options: { filter?:number; extra?:Buffer; width?:number; height?:number; raw?:Buffer; append?:Buffer }={}) {
  const width=options.width??1,height=options.height??1;
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  const raw=options.raw??Buffer.from([options.filter??0,1,2,3,4]);
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),
    ...(options.extra?[options.extra]:[]),
    chunk('IDAT',deflateSync(raw)),
    chunk('IEND',Buffer.alloc(0)),
    ...(options.append?[options.append]:[]),
  ]);
}
describe('WU4-H PNG integrity boundary — never grants approval',()=>{
  it('validates a complete synthetic RGBA file and returns no image bytes or URL',()=>{
    const result=verifyPngCandidate(syntheticPng());
    expect(result).toMatchObject({
      width:1,height:1,validatedStructure:true,
      approved:false,publishEnabled:false,safeForStorage:false,
    });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/url|path|base64|readEnabled/i);
  });
  it('denies corrupted CRC and truncated files',()=>{
    const valid=syntheticPng();
    const corrupted=Buffer.from(valid);corrupted[35]^=1;
    const truncated=valid.subarray(0,valid.length-5);
    for(const value of [corrupted,truncated])expect(()=>verifyPngCandidate(value)).toThrow(PngIntegrityError);
  });
  it('denies unknown ancillary and animation chunks, and trailing bytes',()=>{
    for(const value of [
      syntheticPng({extra:chunk('tEXt',Buffer.from('secret'))}),
      syntheticPng({extra:chunk('acTL',Buffer.from([0,0,0,1,0,0,0,1]))}),
      syntheticPng({append:Buffer.from([0])}),
    ]) expect(()=>verifyPngCandidate(value)).toThrow(PngIntegrityError);
  });
  it('denies decompression bombs, short pixels and invalid filter bytes',()=>{
    for(const value of [
      syntheticPng({raw:Buffer.alloc(100_000)}),
      syntheticPng({raw:Buffer.from([0,0,0])}),
      syntheticPng({filter:5}),
    ])expect(()=>verifyPngCandidate(value)).toThrow(PngIntegrityError);
  });
  it('rejects unconsumed IDAT suffix and a second valid compressed stream',()=>{
    const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
    const raw=Buffer.from([0,1,2,3,4]);
    const single=deflateSync(raw);
    const signature=Buffer.from([137,80,78,71,13,10,26,10]);
    for(const compressed of [
      Buffer.concat([single,Buffer.from([0xde,0xad,0xbe,0xef])]),
      Buffer.concat([single,deflateSync(raw)]),
    ]) {
      const forged=Buffer.concat([
        signature,chunk('IHDR',ihdr),chunk('IDAT',compressed),
        chunk('IEND',Buffer.alloc(0)),
      ]);
      expect(()=>verifyPngCandidate(forged)).toThrow(PngIntegrityError);
    }
  });
  it('denies bad ordering and missing image data',()=>{
    const signature=Buffer.from([137,80,78,71,13,10,26,10]);
    const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
    const invalid=Buffer.concat([signature,chunk('IHDR',header),chunk('IEND',Buffer.alloc(0))]);
    expect(()=>verifyPngCandidate(invalid)).toThrow(PngIntegrityError);
  });
});
