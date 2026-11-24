/** Exact review-copy identities; no release/rights/signature authority. */
import { createHash } from 'node:crypto';
import { UnprocessableEntityException } from '@nestjs/common';
import { decodePrivatePng } from '../common/private-image-candidate';

const REFERENCES: Readonly<Record<string, Readonly<{digest:string;bytes:number}>>> = Object.freeze({
  'WU2A-S1-SPEECH': { digest:'70da78a9234c4ba733265c35b0bfbe5693c5e865e0e1130c6e74c090d03cf226', bytes:186879 },
  'WU2A-S1-OCCUPATIONAL': { digest:'c8e074e0035af1d92b01c40efb8c4d70973dec53e2c5383db59274ce7bdbdce8', bytes:189904 },
  'WU2A-S1-BEHAVIORAL': { digest:'bd6bb932b8e8c0ab8ff48b31d979e0e35395c4e45c69534f3d2b61bfebf86c7a', bytes:186440 },
  'WU2A-S1-PHYSICAL': { digest:'dd23cbbaf9d6be7a0629e13cddba299e117671492c320e7e54c90e55e054b8d7', bytes:180198 },
  'WU2A-S1-GROUP': { digest:'6ac6a8dc4bfe64eea2ac948eb7b89adc0f2dc3a77e683034671ef180ebbab0f8', bytes:208050 },
  'WU2A-S2-SPEECH': { digest:'036eb174d6a8fd767b7fb68818a95c0e2dce88bb45c4996543e7907e2cd837bb', bytes:190782 },
  'WU2A-S2-OCCUPATIONAL': { digest:'544817010c64cfe0058550bf869d59324ff8e18d5e1da9e82f6f1a5282ef30f0', bytes:195417 },
  'WU2A-S2-BEHAVIORAL': { digest:'d3bbda51eb3267d46d2bab76478eba15d2dba5ac42b4df5f5be16eb2a682d121', bytes:202238 },
  'WU2A-S2-PHYSICAL': { digest:'1fdd9fae8127d5e68a7a5e57f9d841a4ef319709d4d320fe8ebb9597bbf5bfc3', bytes:183264 },
  'WU2A-S2-GROUP': { digest:'2fa96149054735ff66e30bb959930abdac08e56d75652e1c7110f97472101ffb', bytes:211926 },
  'WU2A-S3-SPEECH': { digest:'7b96ab2238f4cd0a08d85a35c5c53aad97fe77c6d108b6a3b5bf7b67364ea227', bytes:189921 },
  'WU2A-S3-OCCUPATIONAL': { digest:'9d433f2e216dde1e0702634efd87c2f1aeb0a6ebdff896d1f0a436b916fac9a2', bytes:198038 },
  'WU2A-S3-BEHAVIORAL': { digest:'2cbe6193adbef2fc0d64e2ae3d2f379a288772baa9ffe102d95444a9aa748376', bytes:209268 },
  'WU2A-S3-PHYSICAL': { digest:'b6b9b202d4e2e653f92f94dfdb6f11a583319a233f7c00d4c6d1e3c8aba7352b', bytes:187311 },
  'WU2A-S3-GROUP': { digest:'5589d5f965f67d5280687d6a7e1ddbbf049dd593b4dabc95405013ab0df6a807', bytes:198974 },
  'WU2A-S4-SPEECH': { digest:'e65366bef647384f28f5858fc37d45b6914ac2f1ff2fdf1dcf6fd46c32f026a1', bytes:191257 },
  'WU2A-S4-OCCUPATIONAL': { digest:'a6cad345d782dadd08ffeebeee8476ad7e283b8ccd37ba22e4a5b591aecbe7ff', bytes:194365 },
  'WU2A-S4-BEHAVIORAL': { digest:'c7aafb3d5ee1b2d2de6cab8a324274c322b3103651dbd5c84e936c8318a5f2f5', bytes:193928 },
  'WU2A-S4-PHYSICAL': { digest:'0df899cd456d1ae9cb6181f5791cbbfb7a27a1846d1bb1e725de8fe2196a8867', bytes:191920 },
  'WU2A-S4-GROUP': { digest:'61814563881be2bc2a9e1d930ef2e2079ac1a1b0485d54ad7510e5073d6ebdb0', bytes:202169 },
  'WU2A-S5-SPEECH': { digest:'0208b206296e14dacba012b171593c9be98d626c0754416c4614b11aa1dae03c', bytes:196255 },
  'WU2A-S5-OCCUPATIONAL': { digest:'6cac3bcaa076cff66d54667cce60a13142c8688022d975e48d8c5e6bcc9b9cfb', bytes:201441 },
  'WU2A-S5-BEHAVIORAL': { digest:'0ae4f572247f12a60ff3799b5b79716afd101fb68905d21aa0f207cfdb1d1893', bytes:220869 },
  'WU2A-S5-PHYSICAL': { digest:'3c80cdf9cc2ec66b894a098c6bfe0e506354badbe4056d9f268c4a4d2b39f2dd', bytes:212450 },
  'WU2A-S5-GROUP': { digest:'d4ab1cde07360701c8c81ca6d4aa84e67d73d770026c16e304e4f1e2ef9bcea8', bytes:218710 },
});

const PREFIX='m5-b-v1:';
const fail=()=>{throw new UnprocessableEntityException('Generated reference artwork does not match its locked identity.');};

/** Legacy and unrelated proposals retain their existing admission behavior. */
export function generatedReferenceDigest(source:unknown):string|null {
  if(typeof source!=='string'||!source.startsWith(PREFIX))return null;
  const match=/^m5-b-v1:(WU2A-S[1-5]-(?:SPEECH|OCCUPATIONAL|BEHAVIORAL|PHYSICAL|GROUP)):sha256:([a-f0-9]{64})$/.exec(source);
  if(!match||!Object.hasOwn(REFERENCES,match[1])||REFERENCES[match[1]].digest!==match[2])
    throw new UnprocessableEntityException('Unknown locked artwork reference.');
  return match[2];
}
export function assertGeneratedReferenceBytes(source:unknown,input:unknown):void {
  const digest=generatedReferenceDigest(source);
  if(digest===null)return;
  const bytes=decodePrivatePng(input);
  if(bytes.length!==REFERENCES[(source as string).split(':')[1]].bytes||bytes.length<33||bytes.readUInt32BE(16)!==400||bytes.readUInt32BE(20)!==300||
    createHash('sha256').update(bytes).digest('hex')!==digest)fail();
}

/** Family and scene are reference taxonomy, not approval of technique congruence. */
export function assertGeneratedReferenceScope(source:unknown,service:string,scene:string):void {
  if(generatedReferenceDigest(source)===null)return;
  const id=(source as string).split(':')[1];
  const family=service==='feeding'?'occupational':service==='developmental'?'behavioral':service;
  const scenes=['therapist-guided','independent-practice','home-support','materials-sequence','safety-access'];
  const index=Number(id[6])-1;
  if(!id.endsWith('-'+family.toUpperCase())||scene!==scenes[index])
    throw new UnprocessableEntityException('Reference artwork specialty or scene does not match the proposal.');
}
