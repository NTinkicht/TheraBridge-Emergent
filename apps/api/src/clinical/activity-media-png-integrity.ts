import { inflateSync } from 'node:zlib';
import { preflightActivityMedia } from './activity-media-intake-preflight';

export class PngIntegrityError extends Error {
  constructor() { super('Candidate PNG integrity verification failed.'); }
}
export type PngIntegrityReceipt = Readonly<{
  width: number;
  height: number;
  sha256: string;
  validatedStructure: true;
  approved: false;
  safeForStorage: false;
  publishEnabled: false;
}>;

// Deliberately small PNG subset: noninterlaced 8-bit RGB/RGBA only.
// Unknown ancillary/critical chunks (including APNG) fail closed.
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const b of data) {
    crc ^= b;
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Full-file chunk framing/CRC + bounded zlib/filter validation.
 * Does NOT replace a sandboxed pixel decoder, antivirus, image-safety or
 * licensing reviews; no path/URL/bytes are returned.
 */
export function verifyPngCandidate(bytes: unknown): PngIntegrityReceipt {
  const pre = preflightActivityMedia(bytes);
  if (!Buffer.isBuffer(bytes)) throw new PngIntegrityError();
  const buf: Buffer = bytes;
  let offset = 8, sawIHDR = false, sawIDAT = false, endedIDAT = false, sawIEND = false;
  const idat: Buffer[] = [];
  try {
    while (offset < buf.length) {
      if (offset + 12 > buf.length) throw new PngIntegrityError();
      const size = buf.readUInt32BE(offset);
      if (size > buf.length - offset - 12) throw new PngIntegrityError();
      const type = buf.subarray(offset + 4, offset + 8);
      const data = buf.subarray(offset + 8, offset + 8 + size);
      const crc = buf.readUInt32BE(offset + 8 + size);
      if (crc32(buf.subarray(offset + 4, offset + 8 + size)) !== crc) throw new PngIntegrityError();
      const label = type.toString('latin1');
      if (label === 'IHDR') {
        if (sawIHDR || offset !== 8 || size !== 13) throw new PngIntegrityError();
        sawIHDR = true;
      } else if (label === 'IDAT') {
        if (!sawIHDR || endedIDAT || sawIEND || size === 0) throw new PngIntegrityError();
        sawIDAT = true;
        idat.push(data);
      } else if (label === 'IEND') {
        if (!sawIHDR || !sawIDAT || sawIEND || size !== 0 || offset + 12 !== buf.length) {
          throw new PngIntegrityError();
        }
        sawIEND = true;
      } else {
        // No text/ICC/EXIF/animated or unreviewed chunk types in the initial
        // safe subset; prevents smuggling external metadata.
        throw new PngIntegrityError();
      }
      if (sawIDAT && label !== 'IDAT') endedIDAT = true;
      offset += size + 12;
      if (sawIEND) break;
    }
    if (!sawIHDR || !sawIDAT || !sawIEND || offset !== buf.length) throw new PngIntegrityError();
    const channels = buf[25] === 6 ? 4 : 3;
    const rowBytes = pre.width * channels;
    const expected = pre.height * (rowBytes + 1);
    // Exact bounded output: no zip bombs or hidden trailing decompressed data.
    const compressed = Buffer.concat(idat);
    // Node's runtime supports info:true, but the installed @types/node zlib
    // overload currently reports only Buffer. Narrow the runtime result
    // explicitly without weakening full-input-consumption verification.
    const inspected = inflateSync(compressed, {
      maxOutputLength: expected + 1, info: true,
    }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
    const { buffer: raw, engine } = inspected;
    // zlib deliberately accepts a valid stream followed by unconsumed bytes,
    // including a second stream. Refuse that hidden payload even with valid CRCs.
    if (engine.bytesWritten !== compressed.length || raw.length !== expected) {
      throw new PngIntegrityError();
    }
    for (let y = 0; y < pre.height; y++) {
      if (raw[y * (rowBytes + 1)] > 4) throw new PngIntegrityError();
    }
  } catch {
    throw new PngIntegrityError();
  }
  return Object.freeze({
    width: pre.width, height: pre.height, sha256: pre.sha256,
    validatedStructure: true as const, approved: false as const,
    safeForStorage: false as const, publishEnabled: false as const,
  });
}
