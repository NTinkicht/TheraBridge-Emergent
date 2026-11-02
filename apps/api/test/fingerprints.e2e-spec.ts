import { createHash } from 'node:crypto';
import { canonicalJson, canonicalFingerprint, orderedJsonFingerprint } from '../src/common/fingerprints';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('M2-H08 immutable fingerprint compatibility', () => {
  it('preserves sorted governance JSON bytes, Date conversion, and arrays', () => {
    const sample = { z: [2, { b: true, a: null }], a: new Date('2026-01-02T03:04:05.000Z') };
    const expected = '{"a":"2026-01-02T03:04:05.000Z","z":[2,{"a":null,"b":true}]}';
    expect(canonicalJson(sample)).toBe(expected);
    expect(canonicalFingerprint(sample)).toBe(sha(expected));
    expect(canonicalFingerprint({ b: 2, a: 1 })).toBe(canonicalFingerprint({ a: 1, b: 2 }));
  });
  it('preserves order-sensitive historical report evidence bytes', () => {
    expect(orderedJsonFingerprint({ b: 2, a: 1 })).toBe(sha('{"b":2,"a":1}'));
    expect(orderedJsonFingerprint({ a: 1, b: 2 })).toBe(sha('{"a":1,"b":2}'));
    expect(orderedJsonFingerprint({ b: 2, a: 1 })).not.toBe(orderedJsonFingerprint({ a: 1, b: 2 }));
  });
});
