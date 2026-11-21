import { createHash } from 'node:crypto';
import {
  ActivityMediaPreflightError, MAX_ACTIVITY_MEDIA_BYTES,
  preflightActivityMedia,
} from '../src/clinical/activity-media-intake-preflight';

// Synthetic IHDR-only header for *preflight* tests, deliberately not a
// decoded, malware-scanned or rights-cleared image.
function candidate(width = 640, height = 480, opts: { depth?: number; color?: number; interlace?: number } = {}) {
  const b = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(b);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 4, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  b[24] = opts.depth ?? 8;
  b[25] = opts.color ?? 6;
  b[28] = opts.interlace ?? 0;
  return b;
}
describe('WU4-E activity image candidate preflight (not ingest approval)', () => {
  it('returns only immutable non-release metadata for a bounded synthetic PNG header', () => {
    const bytes = candidate();
    const result = preflightActivityMedia(bytes);
    expect(result).toEqual({
      format: 'png', width: 640, height: 480, byteLength: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      approved: false, publishEnabled: false, safeForStorage: false,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain('url');
    expect(JSON.stringify(result)).not.toContain('base64');
  });
  it.each([null, undefined, '', {}, [], 42, new Uint8Array(33), Buffer.alloc(0), Buffer.alloc(32), Buffer.alloc(MAX_ACTIVITY_MEDIA_BYTES + 1)])(
    'rejects unsupported, truncated or oversized input %#', (data) => {
      expect(() => preflightActivityMedia(data)).toThrow(ActivityMediaPreflightError);
    },
  );
  it('rejects files with the wrong signature or first chunk marker', () => {
    const badSignature = candidate(); badSignature[0] = 0;
    const wrongChunk = candidate(); wrongChunk.write('tEXt', 12);
    const wrongLength = candidate(); wrongLength.writeUInt32BE(12, 8);
    const highBitChunk = candidate(); for (let i = 12; i < 16; i++) highBitChunk[i] |= 0x80;
    for (const bytes of [badSignature, wrongChunk, wrongLength, highBitChunk]) {
      expect(() => preflightActivityMedia(bytes)).toThrow(ActivityMediaPreflightError);
    }
  });
  it.each([[0, 1], [1, 0], [4097, 1], [1, 4097], [4000, 4000]])(
    'rejects prohibited dimensions %i x %i', (width, height) => {
      expect(() => preflightActivityMedia(candidate(width, height))).toThrow(ActivityMediaPreflightError);
    },
  );
  it('rejects unsupported bit depth, palette and interlacing', () => {
    for (const options of [{depth:16}, {color:3}, {interlace:1}]) {
      expect(() => preflightActivityMedia(candidate(640, 480, options))).toThrow(ActivityMediaPreflightError);
    }
  });
  it('rejects unsupported PNG compression and filter variants', () => {
    const compressed = candidate(); compressed[26] = 1;
    const filtered = candidate(); filtered[27] = 1;
    expect(() => preflightActivityMedia(compressed)).toThrow(ActivityMediaPreflightError);
    expect(() => preflightActivityMedia(filtered)).toThrow(ActivityMediaPreflightError);
  });
});
