import * as argon2 from 'argon2';
import { COMMON_PASSWORDS } from './common-passwords';

// OWASP Password Storage Cheat Sheet (Argon2id, m=19 MiB, t=2, p=1).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string): Promise<string> => argon2.hash(password, OPTIONS);
export const needsRehash = (hash: string): boolean => argon2.needsRehash(hash, OPTIONS);

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;
// Verified when the account is unknown, so response timing does not reveal whether an email exists.
export const dummyHash = (): Promise<string> => (dummy ??= hashPassword('therabridge-dummy-password-for-timing'));

export function passwordPolicyError(password: string, email: string): string | null {
  const length = [...password].length;
  if (length < 12) return 'Use at least 12 characters.';
  if (length > 128) return 'Use at most 128 characters.';
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return 'This password is too common. Choose something less predictable.';
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  if (local.length >= 3 && lower.includes(local)) return 'Do not include your email name in the password.';
  return null;
}
