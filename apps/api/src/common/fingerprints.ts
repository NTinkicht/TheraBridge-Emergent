import { createHash } from 'node:crypto';

// Governance fingerprints are historical evidence identities: preserve sorted
// object keys and array ordering exactly, including Date JSON serialization.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

export const canonicalFingerprint = (value: unknown): string =>
  createHash('sha256').update(canonicalJson(value)).digest('hex');

// Saved report source/claim hashes intentionally use JSON.stringify key order.
// Changing them to canonicalJson would invalidate existing immutable traces.
export const orderedJsonFingerprint = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
