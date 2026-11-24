/** Frozen review-copy identities from the owner-directed 25-artwork generation set.
 * These are fictional reference art, not released clinical media. No bytes or URL here. */
import { ILLUSTRATION_REFERENCE_SLOTS, ILLUSTRATION_STYLE_VERSION } from './illustration-style.mjs';
const records = [
  {
    "referenceId": "WU2A-S1-SPEECH",
    "reviewSha256": "70da78a9234c4ba733265c35b0bfbe5693c5e865e0e1130c6e74c090d03cf226",
    "reviewByteLength": 186879,
    "alt": "Therapist and child practice speech using a mirror and turtle picture cards."
  },
  {
    "referenceId": "WU2A-S1-OCCUPATIONAL",
    "reviewSha256": "c8e074e0035af1d92b01c40efb8c4d70973dec53e2c5383db59274ce7bdbdce8",
    "reviewByteLength": 189904,
    "alt": "Therapist observes a child using a colorful pegboard."
  },
  {
    "referenceId": "WU2A-S1-BEHAVIORAL",
    "reviewSha256": "bd6bb932b8e8c0ab8ff48b31d979e0e35395c4e45c69534f3d2b61bfebf86c7a",
    "reviewByteLength": 186440,
    "alt": "Therapist and child take turns with a table game."
  },
  {
    "referenceId": "WU2A-S1-PHYSICAL",
    "reviewSha256": "dd23cbbaf9d6be7a0629e13cddba299e117671492c320e7e54c90e55e054b8d7",
    "reviewByteLength": 180198,
    "alt": "Therapist stays close as a child practices a balance activity."
  },
  {
    "referenceId": "WU2A-S1-GROUP",
    "reviewSha256": "6ac6a8dc4bfe64eea2ac948eb7b89adc0f2dc3a77e683034671ef180ebbab0f8",
    "reviewByteLength": 208050,
    "alt": "Children and therapist work together on a floor puzzle."
  },
  {
    "referenceId": "WU2A-S2-SPEECH",
    "reviewSha256": "036eb174d6a8fd767b7fb68818a95c0e2dce88bb45c4996543e7907e2cd837bb",
    "reviewByteLength": 190782,
    "alt": "Child practices a sound near a tabletop mirror with a therapist nearby."
  },
  {
    "referenceId": "WU2A-S2-OCCUPATIONAL",
    "reviewSha256": "544817010c64cfe0058550bf869d59324ff8e18d5e1da9e82f6f1a5282ef30f0",
    "reviewByteLength": 195417,
    "alt": "Child fits a triangle into a wooden shape sorter."
  },
  {
    "referenceId": "WU2A-S2-BEHAVIORAL",
    "reviewSha256": "d3bbda51eb3267d46d2bab76478eba15d2dba5ac42b4df5f5be16eb2a682d121",
    "reviewByteLength": 202238,
    "alt": "Child arranges picture cues on a daily routine board."
  },
  {
    "referenceId": "WU2A-S2-PHYSICAL",
    "reviewSha256": "1fdd9fae8127d5e68a7a5e57f9d841a4ef319709d4d320fe8ebb9597bbf5bfc3",
    "reviewByteLength": 183264,
    "alt": "Child steps between colored balance markers with a therapist nearby."
  },
  {
    "referenceId": "WU2A-S2-GROUP",
    "reviewSha256": "2fa96149054735ff66e30bb959930abdac08e56d75652e1c7110f97472101ffb",
    "reviewByteLength": 211926,
    "alt": "Three children build a shared structure from large blocks."
  },
  {
    "referenceId": "WU2A-S3-SPEECH",
    "reviewSha256": "7b96ab2238f4cd0a08d85a35c5c53aad97fe77c6d108b6a3b5bf7b67364ea227",
    "reviewByteLength": 189921,
    "alt": "Adult and child use pictures to practice sentence building at home."
  },
  {
    "referenceId": "WU2A-S3-OCCUPATIONAL",
    "reviewSha256": "9d433f2e216dde1e0702634efd87c2f1aeb0a6ebdff896d1f0a436b916fac9a2",
    "reviewByteLength": 198038,
    "alt": "Child practices clothing fasteners with an adult nearby."
  },
  {
    "referenceId": "WU2A-S3-BEHAVIORAL",
    "reviewSha256": "2cbe6193adbef2fc0d64e2ae3d2f379a288772baa9ffe102d95444a9aa748376",
    "reviewByteLength": 209268,
    "alt": "Adult and child sit together with emotion cards and calming materials."
  },
  {
    "referenceId": "WU2A-S3-PHYSICAL",
    "reviewSha256": "b6b9b202d4e2e653f92f94dfdb6f11a583319a233f7c00d4c6d1e3c8aba7352b",
    "reviewByteLength": 187311,
    "alt": "Child crawls on a soft floor activity course with an adult nearby."
  },
  {
    "referenceId": "WU2A-S3-GROUP",
    "reviewSha256": "5589d5f965f67d5280687d6a7e1ddbbf049dd593b4dabc95405013ab0df6a807",
    "reviewByteLength": 198974,
    "alt": "Children and adult sit in a circle sharing picture cards."
  },
  {
    "referenceId": "WU2A-S4-SPEECH",
    "reviewSha256": "e65366bef647384f28f5858fc37d45b6914ac2f1ff2fdf1dcf6fd46c32f026a1",
    "reviewByteLength": 191257,
    "alt": "Child arranges three pictures of a seed growing into a flower."
  },
  {
    "referenceId": "WU2A-S4-OCCUPATIONAL",
    "reviewSha256": "a6cad345d782dadd08ffeebeee8476ad7e283b8ccd37ba22e4a5b591aecbe7ff",
    "reviewByteLength": 194365,
    "alt": "Child uses a board with zipper, button and snap fasteners."
  },
  {
    "referenceId": "WU2A-S4-BEHAVIORAL",
    "reviewSha256": "c7aafb3d5ee1b2d2de6cab8a324274c322b3103651dbd5c84e936c8318a5f2f5",
    "reviewByteLength": 193928,
    "alt": "Child arranges picture cards on a three-part schedule board."
  },
  {
    "referenceId": "WU2A-S4-PHYSICAL",
    "reviewSha256": "0df899cd456d1ae9cb6181f5791cbbfb7a27a1846d1bb1e725de8fe2196a8867",
    "reviewByteLength": 191920,
    "alt": "Illustrated movement sequence with floor markers, cones and a hoop."
  },
  {
    "referenceId": "WU2A-S4-GROUP",
    "reviewSha256": "61814563881be2bc2a9e1d930ef2e2079ac1a1b0485d54ad7510e5073d6ebdb0",
    "reviewByteLength": 202169,
    "alt": "Children complete a repeated colored-block pattern together."
  },
  {
    "referenceId": "WU2A-S5-SPEECH",
    "reviewSha256": "0208b206296e14dacba012b171593c9be98d626c0754416c4614b11aa1dae03c",
    "reviewByteLength": 196255,
    "alt": "Child points to a communication picture with an adult and accessible switch nearby."
  },
  {
    "referenceId": "WU2A-S5-OCCUPATIONAL",
    "reviewSha256": "6cac3bcaa076cff66d54667cce60a13142c8688022d975e48d8c5e6bcc9b9cfb",
    "reviewByteLength": 201441,
    "alt": "Child uses large-handled scissors on paper while a therapist watches."
  },
  {
    "referenceId": "WU2A-S5-BEHAVIORAL",
    "reviewSha256": "0ae4f572247f12a60ff3799b5b79716afd101fb68905d21aa0f207cfdb1d1893",
    "reviewByteLength": 220869,
    "alt": "Child rests in a cushioned quiet space while an adult shows a visual breathing cue."
  },
  {
    "referenceId": "WU2A-S5-PHYSICAL",
    "reviewSha256": "3c80cdf9cc2ec66b894a098c6bfe0e506354badbe4056d9f268c4a4d2b39f2dd",
    "reviewByteLength": 212450,
    "alt": "Illustration of a child using a mobility aid with a therapist nearby."
  },
  {
    "referenceId": "WU2A-S5-GROUP",
    "reviewSha256": "d4ab1cde07360701c8c81ca6d4aa84e67d73d770026c16e304e4f1e2ef9bcea8",
    "reviewByteLength": 218710,
    "alt": "Three children take turns sorting colorful materials with a visual turn cue."
  }
];
const expected = new Map(ILLUSTRATION_REFERENCE_SLOTS.map(slot=>[slot.id,slot]));
if(records.length!==25 || new Set(records.map(r=>r.referenceId)).size!==25 ||
  new Set(records.map(r=>r.reviewSha256)).size!==25 ||
  records.some(r=>!expected.has(r.referenceId)||!/^[0-9a-f]{64}$/.test(r.reviewSha256)||
  !Number.isSafeInteger(r.reviewByteLength)||r.reviewByteLength<33||r.reviewByteLength>512*1024))
  throw new Error('Invalid locked M5 artwork manifest');
export const GENERATED_ARTWORK = Object.freeze(records.map(r=>Object.freeze({
  ...r,scene:expected.get(r.referenceId).scene,family:expected.get(r.referenceId).family,
  reviewFile:r.referenceId.toLowerCase()+'-review.png',
  styleVersion:ILLUSTRATION_STYLE_VERSION,sourceType:'GENERATED',
  status:'OWNER_REPORTED_STYLE_ACCEPTANCE_ASSET_REVIEW_PENDING',
  approved:false,publishEnabled:false,clinicalReleaseEnabled:false,
})));
export function findGeneratedArtwork(id){
  return typeof id==='string' ? GENERATED_ARTWORK.find(r=>r.referenceId===id)??null : null;
}
/** Validate actual review-copy bytes, never infer clinical rights from their digest. */
export async function verifyGeneratedReviewBytes(id, bytes){
  const asset=findGeneratedArtwork(id);
  if(!asset||!(bytes instanceof Uint8Array)||bytes.byteLength!==asset.reviewByteLength) return false;
  const snapshot=new Uint8Array(bytes);
  const view=new DataView(snapshot.buffer);
  if(view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a||
    view.getUint32(8)!==13||view.getUint32(12)!==0x49484452||
    view.getUint32(16)!==400||view.getUint32(20)!==300||
    snapshot[24]!==8||snapshot[25]!==2||snapshot[26]!==0||snapshot[27]!==0||snapshot[28]!==0) return false;
  try{
    const hash=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',snapshot));
    return Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('')===asset.reviewSha256;
  } catch{return false;}
}
