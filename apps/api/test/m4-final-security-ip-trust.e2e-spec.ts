// Final M4-08: execute common API security boundaries under adversarial, synthetic inputs.
import { BlockList } from 'node:net';
import { createHash, createHmac } from 'node:crypto';
import { hmac, ipPrefix, normalizeEmail, randomToken, resolveClientIp, safeEqual, sha256 } from '../src/common/security';

describe('M4-08 safe token comparison, normalization and hashing', () => {
  it('rejects missing, different-length and equal-length incorrect tokens', () => {
    expect(safeEqual(undefined,'fictional-token')).toBe(false);
    expect(safeEqual('short','fictional-token')).toBe(false);
    expect(safeEqual('fictional-token-a','fictional-token-b')).toBe(false);
    expect(safeEqual('fictional-token-a','fictional-token-a')).toBe(true);
    expect(safeEqual('','')).toBe(true);
  });
  it('normalizes only email casing and surrounding whitespace', () => {
    expect(normalizeEmail('  USER@EXAMPLE.INVALID  ')).toBe('user@example.invalid');
    expect(normalizeEmail('  ')).toBe('');
  });
  it('matches crypto SHA256/HMAC semantics without recording secret plaintext', () => {
    const value='synthetic-input';
    expect(sha256(value)).toBe(createHash('sha256').update(value).digest('hex'));
    expect(hmac('fictional-key',value)).toBe(createHmac('sha256','fictional-key').update(value).digest('base64url'));
    expect(hmac('fictional-key',value)).not.toBe(hmac('different-fictional-key',value));
  });
  it('creates URL-safe unpredictable tokens with caller-controlled byte length', () => {
    const first=randomToken(16), second=randomToken(16);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(first,'base64url')).toHaveLength(16);
    expect(first).not.toBe(second);
    expect(Buffer.from(randomToken(),'base64url')).toHaveLength(32);
  });
});

describe('M4-08 forwarded proxy trust is checked from the direct peer backwards',()=>{
  const proxy=()=>{const b=new BlockList();b.addAddress('10.0.0.1');b.addAddress('10.0.0.2');return b;};
  it('ignores all forged XFF when socket peer is not trusted',()=>{
    expect(resolveClientIp('203.0.113.11','198.51.100.9, 198.51.100.10',proxy())).toBe('203.0.113.11');
  });
  it('accepts one real untrusted origin behind known proxy',()=>{
    expect(resolveClientIp('10.0.0.1','203.0.113.9',proxy())).toBe('203.0.113.9');
  });
  it('walks a trusted multi-hop proxy chain to the last untrusted origin',()=>{
    expect(resolveClientIp('10.0.0.1','198.51.100.8, 10.0.0.2',proxy())).toBe('198.51.100.8');
  });
  it('ignores attacker-injected entries to the left of first untrusted origin',()=>{
    expect(resolveClientIp('10.0.0.1','1.2.3.4, 198.51.100.8, 10.0.0.2',proxy())).toBe('198.51.100.8');
  });
  it('rejects malformed trusted-chain hop and falls back to right-neighbor proxy',()=>{
    expect(resolveClientIp('10.0.0.1','non-ip-client',proxy())).toBe('10.0.0.1');
  });
  it('handles no forwarded header on trusted socket and no peer identity',()=>{
    expect(resolveClientIp('10.0.0.1',undefined,proxy())).toBe('10.0.0.1');
    expect(resolveClientIp('',undefined,proxy())).toBe('unknown');
  });
  it('normalizes IPv4-mapped IPv6 before trust check',()=>{
    expect(resolveClientIp('::ffff:10.0.0.1','203.0.113.25',proxy())).toBe('203.0.113.25');
  });
  it('does not accidentally trust a syntactically malformed IPv4 mapping',()=>{
    expect(resolveClientIp('::ffff:not-an-address','203.0.113.25',proxy())).toBe('unknown');
  });
  it('returns source-most IP if every hop is trusted',()=>{
    expect(resolveClientIp('10.0.0.1','10.0.0.2',proxy())).toBe('10.0.0.2');
  });
});

describe('M4-08 IP privacy prefixing',()=>{
  it('redacts last IPv4 octet to a /24',()=>{
    expect(ipPrefix('203.0.113.222')).toBe('203.0.113.0/24');
  });
  it('redacts IPv6 suffix to a /48 even with compressed address',()=>{
    expect(ipPrefix('2001:db8:abcd::1')).toBe('2001:db8:abcd::/48');
  });
  it('normalizes unknown or invalid source without echoing raw text',()=>{
    expect(ipPrefix('malformed-private-source')).toBe('unknown');
    expect(ipPrefix('')).toBe('unknown');
  });
});
