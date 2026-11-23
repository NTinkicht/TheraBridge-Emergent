/**
 * WU2-C: isolated operator-only deterministic derivative builder for accepted
 * 1600x1200 PNG masters. Never imported by web/runtime HTTP controllers.
 *
 * No model call, file write, external process, public URI, or approval decision.
 * All originals and outputs remain private, unreviewed candidate bytes.
 */
import {createHash} from 'node:crypto';
import {deflateSync,inflateSync} from 'node:zlib';
import {makePrivateGenerationBatch,inspectPrivateMaster,PrivatePipelineError}
  from './m5-wu2b-private-generation.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const SIGNATURE=Buffer.from('89504e470d0a1a0a','hex');
const BOUNDS=Object.freeze({master:[1600,1200],square:[1200,1200],card:[400,300]});
export class PrivateDerivativeError extends Error {
  constructor(){super('Private illustration derivative validation failed; asset remains unpublished.');}
}
function deny(){throw new PrivateDerivativeError();}
function crc32(data){
  let value=0xffffffff;
  for(const b of data){
    value^=b;
    for(let n=0;n<8;n++)value=(value>>>1)^((value&1)?0xedb88320:0);
  }
  return (value^0xffffffff)>>>0;
}
function chunk(type,data){
  const result=Buffer.alloc(data.length+12);
  result.writeUInt32BE(data.length,0);
  result.write(type,4,'ascii');
  data.copy(result,8);
  result.writeUInt32BE(crc32(result.subarray(4,8+data.length)),8+data.length);
  return result;
}
function decodeStrict(bytes,expectedWidth,expectedHeight){
  if(!Buffer.isBuffer(bytes)||bytes.length<60||bytes.length>12*1024*1024||
     !bytes.subarray(0,8).equals(SIGNATURE))deny();
  let offset=8,sawHeader=false,sawData=false,endedData=false,sawEnd=false;
  let bpp=0;
  const idats=[];
  while(offset<bytes.length){
    if(offset+12>bytes.length)deny();
    const n=bytes.readUInt32BE(offset);
    if(n>bytes.length-offset-12)deny();
    const type=bytes.toString('ascii',offset+4,offset+8);
    const data=bytes.subarray(offset+8,offset+8+n);
    if(bytes.readUInt32BE(offset+8+n)!==crc32(bytes.subarray(offset+4,offset+8+n)))deny();
    if(type==='IHDR'){
      if(sawHeader||offset!==8||n!==13)deny();
      sawHeader=true;
      if(data.readUInt32BE(0)!==expectedWidth||data.readUInt32BE(4)!==expectedHeight||
         data[8]!==8||![2,6].includes(data[9])||data[10]!==0||data[11]!==0||data[12]!==0)deny();
      bpp=data[9]===6?4:3;
    }else if(type==='IDAT'){
      if(!sawHeader||sawEnd||endedData||n===0)deny();
      sawData=true;idats.push(data);
    }else if(type==='IEND'){
      if(!sawHeader||!sawData||sawEnd||n!==0||offset+n+12!==bytes.length)deny();
      sawEnd=true;endedData=true;
    }else deny(); // No APNG, palettes, text, EXIF, ICC or untrusted chunks.
    if(sawData&&type!=='IDAT')endedData=true;
    offset+=n+12;
    if(sawEnd)break;
  }
  if(!sawHeader||!sawData||!sawEnd||offset!==bytes.length)deny();
  const pitch=expectedWidth*bpp,expected=expectedHeight*(pitch+1);
  let inflated;
  try{inflated=inflateSync(Buffer.concat(idats),{maxOutputLength:expected+1,info:true});}
  catch{deny();}
  if(inflated.engine.bytesWritten!==idats.reduce((n,b)=>n+b.length,0)||
     inflated.buffer.length!==expected)deny();
  const raw=inflated.buffer;
  const pixels=Buffer.alloc(expectedHeight*pitch);
  const paeth=(a,b,c)=>{
    const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);
    return da<=db&&da<=dc?a:db<=dc?b:c;
  };
  for(let y=0;y<expectedHeight;y++){
    const line=y*(pitch+1),filter=raw[line],target=y*pitch;
    if(filter>4)deny();
    for(let i=0;i<pitch;i++){
      const left=i<bpp?0:pixels[target+i-bpp];
      const above=y===0?0:pixels[target-pitch+i];
      const corner=y===0||i<bpp?0:pixels[target-pitch+i-bpp];
      const predictor=filter===0?0:filter===1?left:filter===2?above:
        filter===3?Math.floor((left+above)/2):paeth(left,above,corner);
      pixels[target+i]=(raw[line+i+1]+predictor)&255;
    }
  }
  return {pixels,bpp,width:expectedWidth,height:expectedHeight};
}
function encodePng(pixels,width,height,bpp){
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
  ihdr[8]=8;ihdr[9]=bpp===4?6:2;
  const pitch=width*bpp,raw=Buffer.alloc(height*(pitch+1));
  for(let y=0;y<height;y++)pixels.copy(raw,y*(pitch+1)+1,y*pitch,(y+1)*pitch);
  return Buffer.concat([SIGNATURE,chunk('IHDR',ihdr),
    chunk('IDAT',deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]);
}
function squareCrop(source){
  const {pixels,bpp,width,height}=source;
  if(width!==1600||height!==1200)deny();
  const out=Buffer.alloc(1200*1200*bpp);
  for(let row=0;row<1200;row++)
    pixels.copy(out,row*1200*bpp,(row*1600+200)*bpp,(row*1600+1400)*bpp);
  return encodePng(out,1200,1200,bpp);
}
function cardDerivative(source){
  const {pixels,bpp,width,height}=source;
  if(width!==1600||height!==1200)deny();
  const out=Buffer.alloc(400*300*bpp);
  for(let y=0;y<300;y++)for(let x=0;x<400;x++){
    const totals=[0,0,0,0];let weight=0;
    for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){
      const i=((4*y+sy)*1600+4*x+sx)*bpp;
      const alpha=bpp===4?pixels[i+3]:255;
      totals[0]+=pixels[i]*alpha;totals[1]+=pixels[i+1]*alpha;
      totals[2]+=pixels[i+2]*alpha;weight+=alpha;
    }
    const j=(y*400+x)*bpp;
    for(let c=0;c<3;c++)out[j+c]=weight?Math.round(totals[c]/weight):0;
    if(bpp===4)out[j+3]=Math.round(weight/16);
  }
  return encodePng(out,400,300,bpp);
}
/**
 * Verifies pinned job/rights evidence against the exact 25-reference batch.
 * Outputs derivative bytes to a TRUSTED PRIVATE CALLER ONLY; not a web route.
 */
export async function preparePrivateDerivatives({evidence,referenceId,masterBytes}){
  try{
    if(typeof referenceId!=='string'||!Buffer.isBuffer(masterBytes)||
       masterBytes.length<60||masterBytes.length>12*1024*1024)deny();
    const snapshot=Buffer.from(masterBytes);
    const batch=await makePrivateGenerationBatch(evidence);
    const job=batch.jobs.find(j=>j.referenceId===referenceId);
    if(!job||job.styleVersion!=='m5-b-v1'||
       batch.sourcePackSha256!=='a32ba0c3037e607beb95f8bcefad50cdd580d2d08f01d2163684798355571379'||
       batch.published!==false||batch.generationEnabled!==false)deny();
    const candidate=inspectPrivateMaster(job,snapshot);
    const decoded=decodeStrict(snapshot,1600,1200);
    if(candidate.sha256!==hash(snapshot))deny();
    const square=squareCrop(decoded),card=cardDerivative(decoded);
    // Verify our encoder outputs against the same strict decoder.
    decodeStrict(square,1200,1200);
    decodeStrict(card,400,300);
    const receipt=Object.freeze({
      schemaVersion:1,referenceId,styleVersion:'m5-b-v1',
      templateVersion:job.templateVersion,sourceConceptSha256:job.sourceConceptSha256,
      providerId:job.providerId,providerTermsSha256:job.providerTermsSha256,
      commercialLicenseSha256:job.commercialLicenseSha256,
      promptSha256:job.promptSha256,batchRevision:batch.batchRevision,
      masterSha256:candidate.sha256,squareSha256:hash(square),cardSha256:hash(card),
      masterDimensions:Object.freeze([...BOUNDS.master]),
      squareDimensions:Object.freeze([...BOUNDS.square]),
      cardDimensions:Object.freeze([...BOUNDS.card]),
      status:'PRIVATE_UNREVIEWED_DERIVATIVES',malwareScan:'NOT_PERFORMED_ON_DERIVATIVES',
      operatorStorage:'NOT_QUALIFIED',assetClinicalReview:'NOT_PROVIDED',
      imageReadEnabled:false,guardianReadEnabled:false,publishEnabled:false,
      clinicalGate:'NO_GO_G2_G2b',
    });
    // Byte fields are intentionally NON-enumerable so ordinary structured
    // status logging cannot accidentally serialize private illustration data.
    const result={receipt};
    Object.defineProperties(result,{
      squareBytes:{value:square,enumerable:false},
      cardBytes:{value:card,enumerable:false},
    });
    return Object.freeze(result);
  }catch{deny();}
}
