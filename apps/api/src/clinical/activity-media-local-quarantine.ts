import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, rm } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep, dirname, parse } from 'node:path';
import { preflightActivityMedia, MAX_ACTIVITY_MEDIA_BYTES } from './activity-media-intake-preflight';
import { snapshotQuarantineIntent, type QuarantineObjectIntent } from './activity-media-quarantine-intent';

/**
 * WU4-G isolated local storage adapter. It is deliberately NOT connected to
 * HTTP, the activity draft service, public file servers, or approval/release.
 * Production object storage, scanning, full decode and rights checks remain
 * separately required. A write returns NO read URL or filesystem path.
 */
export class QuarantineWriteError extends Error {
  constructor() { super('Private quarantine write refused.'); }
}
export type QuarantineWriteReceipt = Readonly<{
  sha256: string; byteLength: number; quarantined: true;
  approved: false; publishEnabled: false; readEnabled: false;
}>;

async function ensurePrivateDirectory(p: string): Promise<void> {
  await mkdir(p, { mode: 0o700 });
  const stat = await lstat(p);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) {
    throw new QuarantineWriteError();
  }
}
async function assertSafeAncestry(root: string): Promise<void> {
  // lstat every existing ancestor, not just root/candidate. The final path
  // must never be redirected via an inherited symlink such as alias -> public.
  const names: string[] = [];
  let cursor = root;
  const anchor = parse(root).root;
  while (cursor !== anchor) {
    names.push(cursor);
    cursor = dirname(cursor);
  }
  names.push(anchor);
  for (const component of names.reverse()) {
    let info;
    try { info = await lstat(component); }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT' && component === root) continue;
      throw new QuarantineWriteError();
    }
    if (!info.isDirectory() || info.isSymbolicLink()) throw new QuarantineWriteError();
  }
}

export class LocalQuarantineWriter {
  constructor(private readonly root: string) {
    // A dedicated absolute path outside static site roots must be supplied
    // by a trusted operator. Never accept browser or activity metadata here.
    if (!isAbsolute(root) || resolve(root) === sep || /(?:^|\/)(?:public|static|uploads)(?:\/|$)/i.test(root)) {
      throw new QuarantineWriteError();
    }
  }
  async write(intent: QuarantineObjectIntent, bytes: unknown): Promise<QuarantineWriteReceipt> {
    let claim: QuarantineObjectIntent;
    try { claim = snapshotQuarantineIntent(intent); }
    catch { throw new QuarantineWriteError(); }
    if (!Buffer.isBuffer(bytes) || bytes.length > MAX_ACTIVITY_MEDIA_BYTES ||
        bytes.length !== claim.candidateBytes) throw new QuarantineWriteError();
    // Candidate identity and the actual bytes must agree. This does not make
    // them safe to decode or permit reading.
    // Snapshot BEFORE preflight and before any await: callers own their input
    // Buffer and may mutate it while filesystem calls are pending.
    const snapshot = Buffer.from(bytes);
    const preflight = preflightActivityMedia(snapshot);
    const sha256 = createHash('sha256').update(snapshot).digest('hex');
    if (sha256 !== claim.candidateSha256 || sha256 !== preflight.sha256) {
      throw new QuarantineWriteError();
    }
    const root = resolve(this.root);
    const parts = claim.objectKey.split('/');
    let dir = root;
    await assertSafeAncestry(root);
    // No recursive mkdir: reject pre-existing symlinked directories.
    try {
      await ensurePrivateDirectory(root);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      const stat = await lstat(root);
      if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw new QuarantineWriteError();
    }
    for (const part of parts.slice(0, -1)) {
      dir = join(dir, part);
      try {
        await ensurePrivateDirectory(dir);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        const stat = await lstat(dir);
        if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw new QuarantineWriteError();
      }
    }
    const target = join(dir, parts.at(-1)!);
    // O_EXCL forbids overwrites and O_NOFOLLOW rejects final symlinks.
    const handle = await open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
      await handle.writeFile(snapshot);
      await handle.sync();
    } catch {
      await handle.close();
      await rm(target, { force: true });
      throw new QuarantineWriteError();
    }
    await handle.close();
    return Object.freeze({
      sha256, byteLength: snapshot.length, quarantined: true as const,
      approved: false as const, publishEnabled: false as const, readEnabled: false as const,
    });
  }
}
