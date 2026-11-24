/**
 * M5 owner observation 25 — purely local UX readiness check.
 * This never uploads, stores, renders, hashes or transmits a selected image.
 * ONLY the first 33 bytes are inspected; this is NOT a decoder, scanner,
 * rights attestation or server-side media preflight.
 * Any server admission must independently repeat full file validation.
 */
export const LOCAL_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export class LocalMediaPreflightError extends Error {
  constructor() { super('This local candidate cannot be checked. Choose a PNG under 8 MiB, up to 4096 pixels per edge. No file was uploaded.'); }
}
export type LocalMediaReadiness = Readonly<{
  format: 'PNG'; width: number; height: number; byteLength: number;
  uploaded: false; approved: false; publishEnabled: false; safeForStorage: false;
}>;
const PNG = [137,80,78,71,13,10,26,10];
export async function checkLocalMediaReadiness(file: File): Promise<LocalMediaReadiness> {
  try {
    if(!file || file.type !== 'image/png' || !Number.isSafeInteger(file.size) ||
      file.size < 33 || file.size > LOCAL_MEDIA_MAX_BYTES ||
      typeof file.slice !== 'function') throw new LocalMediaPreflightError();
    const head = new Uint8Array(await file.slice(0,33).arrayBuffer());
    if(head.length !== 33 || !PNG.every((byte,i)=>head[i]===byte)) throw new LocalMediaPreflightError();
    const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
    if(view.getUint32(8)!==13 || head[12]!==73 || head[13]!==72 ||
      head[14]!==68 || head[15]!==82) throw new LocalMediaPreflightError();
    const width=view.getUint32(16),height=view.getUint32(20);
    if(width<1 || height<1 || width>4096 || height>4096 ||
       width*height>12_000_000 || head[24]!==8 || ![2,6].includes(head[25]) ||
       head[26]!==0 || head[27]!==0 || head[28]!==0) throw new LocalMediaPreflightError();
    return Object.freeze({format:'PNG' as const,width,height,byteLength:file.size,
      uploaded:false as const,approved:false as const,
      publishEnabled:false as const,safeForStorage:false as const});
  } catch {
    throw new LocalMediaPreflightError();
  }
}
