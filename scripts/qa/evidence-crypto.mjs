// TB-EM-028: encrypt hosted synthetic QA evidence before any GitHub artifact upload.
// Format: ASCII "TBQA1" + 12-byte random GCM nonce + ciphertext + 16-byte tag.
// Keep the 256-bit secret OUTSIDE Git, Actions logs and artifacts.
import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {readFile, writeFile, appendFile, stat, rm} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const MAGIC=Buffer.from('TBQA1');
const IV_LEN=12, TAG_LEN=16;
export const keyBytes=hex=>{
 if(typeof hex!=='string'||!/^[0-9a-fA-F]{64}$/.test(hex))throw Error('missing_or_invalid_256_bit_evidence_key');
 return Buffer.from(hex,'hex');
};

export async function encryptFile(source,destination,keyHex){
 const key=keyBytes(keyHex),iv=randomBytes(IV_LEN);
 try{
  await writeFile(destination,Buffer.concat([MAGIC,iv]),{mode:0o600,flag:'wx'});
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(MAGIC);
  await pipeline(createReadStream(source),cipher,createWriteStream(destination,{flags:'a',mode:0o600}));
  await appendFile(destination,cipher.getAuthTag());
 }catch(e){await rm(destination,{force:true});throw e;}
 finally{key.fill(0);}
}

export async function decryptFile(source,destination,keyHex){
 const key=keyBytes(keyHex);
 try{
  const length=(await stat(source)).size;
  if(length<MAGIC.length+IV_LEN+TAG_LEN)throw Error('truncated_evidence');
  const header=await readFile(source,{encoding:null}); // only used locally to verify header/tag
  if(!header.subarray(0,MAGIC.length).equals(MAGIC))throw Error('invalid_evidence_header');
  const nonce=header.subarray(MAGIC.length,MAGIC.length+IV_LEN);
  const tag=header.subarray(length-TAG_LEN);
  const decipher=createDecipheriv('aes-256-gcm',key,nonce);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  await pipeline(createReadStream(source,{start:MAGIC.length+IV_LEN,end:length-TAG_LEN-1}),
   decipher,createWriteStream(destination,{flags:'wx',mode:0o600}));
 }catch(e){await rm(destination,{force:true});throw e;}
 finally{key.fill(0);}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,source,destination]=process.argv.slice(2);
 const secret=process.env.TB_QA_EVIDENCE_KEY_HEX;
 if(!source||!destination||!['encrypt','decrypt'].includes(mode)){
  console.error('Usage: node scripts/qa/evidence-crypto.mjs encrypt|decrypt SOURCE DEST (key from private environment)');
  process.exitCode=2;
 }else{
  (mode==='encrypt'?encryptFile:decryptFile)(source,destination,secret)
   .then(()=>console.log('Encrypted evidence operation complete (no secrets printed).'))
   .catch(()=>{console.error('QA evidence encryption/decryption failed.');process.exitCode=2;});
 }
}
