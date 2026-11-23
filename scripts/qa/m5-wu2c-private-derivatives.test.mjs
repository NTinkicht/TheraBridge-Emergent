import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateSync,inflateSync} from 'node:zlib';
import {preparePrivateDerivatives,PrivateDerivativeError} from './m5-wu2c-private-derivatives.mjs';

const hash=x=>createHash('sha256').update(x).digest('hex');
const license=()=>({providerId:'synthetic-provider-2026',providerTermsSha256:'a'.repeat(64),
  commercialLicenseSha256:'b'.repeat(64)});
const crc32=b=>{
  let crc=0xffffffff;
  for(const c of b){crc^=c;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
};
const chunk=(type,data)=>{
  const out=Buffer.alloc(data.length+12);
  out.writeUInt32BE(data.length);out.write(type,4,'ascii');data.copy(out,8);
  out.writeUInt32BE(crc32(out.subarray(4,8+data.length)),data.length+8);
  return out;
};
function syntheticMaster(bpp=3,tail=false){
  const w=1600,h=1200;
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);
  ihdr[8]=8;ihdr[9]=bpp===4?6:2;
  const raw=Buffer.alloc(h*(1+w*bpp));
  for(let y=0;y<h;y++){
    const line=y*(1+w*bpp);
    for(let x=0;x<w;x++){
      const at=line+1+x*bpp;
      if(x<200){raw[at]=255;raw[at+1]=0;raw[at+2]=0;}
      else if(x<1400){raw[at]=0;raw[at+1]=255;raw[at+2]=0;}
      else{raw[at]=0;raw[at+1]=0;raw[at+2]=255;}
      if(bpp===4)raw[at+3]=x<200?0:255;
    }
  }
  const compressed=deflateSync(raw);
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a','hex'),
    chunk('IHDR',ihdr),
    chunk('IDAT',tail?Buffer.concat([compressed,Buffer.from([1,2,3])]):compressed),
    chunk('IEND',Buffer.alloc(0)),
  ]);
}
function pixel(png,x,y){
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
  const bpp=png[25]===6?4:3;
  assert(x<width&&y<height);
  const n=png.readUInt32BE(33);
  assert.equal(png.toString('ascii',37,41),'IDAT');
  const raw=inflateSync(png.subarray(41,41+n));
  const offset=y*(1+width*bpp);
  assert.equal(raw[offset],0);
  return [...raw.subarray(offset+1+x*bpp,offset+1+(x+1)*bpp)];
}

test('exact synthetic 1600x1200 RGB master -> private center 1200-square + true 400x300 4:3 box sampling',async()=>{
  const master=syntheticMaster();
  const result=await preparePrivateDerivatives({evidence:license(),referenceId:'WU2A-S1-SPEECH',masterBytes:master});
  const {receipt,squareBytes,cardBytes}=result;
  assert.equal(receipt.masterSha256,hash(master));
  assert.equal(receipt.squareSha256,hash(squareBytes));
  assert.equal(receipt.cardSha256,hash(cardBytes));
  assert.deepEqual(receipt.masterDimensions,[1600,1200]);
  assert.deepEqual(receipt.squareDimensions,[1200,1200]);
  assert.deepEqual(receipt.cardDimensions,[400,300]);
  assert.deepEqual(pixel(squareBytes,0,0),[0,255,0]);
  assert.deepEqual(pixel(squareBytes,1199,1199),[0,255,0]);
  assert.deepEqual(pixel(cardBytes,0,0),[255,0,0]);
  assert.deepEqual(pixel(cardBytes,200,150),[0,255,0]);
  assert.deepEqual(pixel(cardBytes,399,299),[0,0,255]);
  assert.equal(receipt.styleVersion,'m5-b-v1');
  assert.equal(receipt.status,'PRIVATE_UNREVIEWED_DERIVATIVES');
  assert.equal(receipt.publishEnabled,false);
  assert.equal(receipt.guardianReadEnabled,false);
  assert.equal(receipt.imageReadEnabled,false);
  assert.equal(receipt.clinicalGate,'NO_GO_G2_G2b');
  assert.equal(receipt.malwareScan,'NOT_PERFORMED_ON_DERIVATIVES');
  assert.equal(Object.isFrozen(receipt),true);
  assert.deepEqual(Object.keys(result),['receipt']);
  assert.equal(JSON.stringify(result).includes('"data"'),false);
  assert.equal(JSON.stringify(receipt).includes('http'),false);
});
test('RGBA premultiplied-alpha box sampling preserves safe transparent edges and avoids red halos',async()=>{
  const master=syntheticMaster(4);
  const result=await preparePrivateDerivatives({evidence:license(),referenceId:'WU2A-S3-PHYSICAL',masterBytes:master});
  assert.deepEqual(pixel(result.squareBytes,600,600),[0,255,0,255]);
  assert.deepEqual(pixel(result.cardBytes,0,0),[0,0,0,0]);
  assert.deepEqual(pixel(result.cardBytes,200,150),[0,255,0,255]);
  assert.deepEqual(pixel(result.cardBytes,399,299),[0,0,255,255]);
  assert.equal(result.receipt.sourceConceptSha256.length,64);
  assert.equal(result.receipt.commercialLicenseSha256,license().commercialLicenseSha256);
});
test('rejects unpinned reference, unavailable commercial evidence, corrupt files and wrong dimensions',async()=>{
  const master=syntheticMaster();
  const cases=[
    {evidence:license(),referenceId:'FAKE',masterBytes:master},
    {evidence:{...license(),providerTermsSha256:'missing'},referenceId:'WU2A-S1-SPEECH',masterBytes:master},
    {evidence:license(),referenceId:'WU2A-S1-SPEECH',masterBytes:Buffer.alloc(64)},
    {evidence:license(),referenceId:'WU2A-S1-SPEECH',masterBytes:master.subarray(0,90)},
    {evidence:license(),referenceId:'WU2A-S1-SPEECH',masterBytes:syntheticMaster(3,true)},
    {evidence:license(),referenceId:'WU2A-S1-SPEECH',masterBytes:'http://untrusted.invalid'},
  ];
  const corrupted=Buffer.from(master);corrupted[80]^=2;
  cases.push({evidence:license(),referenceId:'WU2A-S1-SPEECH',masterBytes:corrupted});
  for(const input of cases)await assert.rejects(
    preparePrivateDerivatives(input),PrivateDerivativeError);
});
test('snapshot source bytes before async plan lookup; caller mutation cannot replace generated provenance',async()=>{
  const master=syntheticMaster(),original=hash(master);
  const work=preparePrivateDerivatives({evidence:license(),referenceId:'WU2A-S1-SPEECH',masterBytes:master});
  master.fill(0);
  const result=await work;
  assert.equal(result.receipt.masterSha256,original);
  assert.equal(result.receipt.publishEnabled,false);
});
