import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { BlockList, isIP } from 'node:net';

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
export const hmac = (secret: string, value: string): string => createHmac('sha256', secret).update(value).digest('base64url');

export function safeEqual(a: string | undefined, b: string): boolean {
  if (typeof a !== 'string') return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const unmap = (ip: string): string => (ip.startsWith('::ffff:') && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip);
const trusted = (list: BlockList, ip: string): boolean => list.check(ip, isIP(ip) === 4 ? 'ipv4' : 'ipv6');

// Walk X-Forwarded-For right-to-left through trusted proxies only; an untrusted peer's header is ignored.
export function resolveClientIp(peer: string, forwardedFor: string | undefined, proxies: BlockList): string {
  const chain = [...(forwardedFor ?? '').split(',').map((s) => s.trim()).filter(Boolean), peer].map(unmap);
  for (let i = chain.length - 1; i >= 0; i--) {
    if (!isIP(chain[i])) return chain[i + 1] ?? 'unknown';
    if (!trusted(proxies, chain[i])) return chain[i];
  }
  return chain[0];
}

function expandV6(ip: string): string[] {
  const [head, tail = ''] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  return [...h, ...Array(8 - h.length - t.length).fill('0'), ...t];
}

export function ipPrefix(ip: string): string {
  if (isIP(ip) === 4) return `${ip.split('.').slice(0, 3).join('.')}.0/24`;
  if (isIP(ip) === 6) return `${expandV6(ip).slice(0, 3).join(':')}::/48`;
  return 'unknown';
}
