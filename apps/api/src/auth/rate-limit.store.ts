import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BUCKET_MS = 60_000;

// PostgreSQL-backed counters shared by every API instance (owner correction R5). Atomic upserts, 1-minute buckets.
@Injectable()
export class RateLimitStore {
  private lastPrunedAt = -Infinity;
  constructor(private readonly prisma: PrismaService) {}

  async hit(key: string, windowMs: number, now: Date): Promise<number> {
    const bucket = new Date(Math.floor(now.getTime() / BUCKET_MS) * BUCKET_MS);
    await this.prisma.$executeRaw`
      INSERT INTO rate_limit_counter (key, window_start, count) VALUES (${key}, ${bucket}, 1)
      ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limit_counter.count + 1`;
    if (now.getTime() - this.lastPrunedAt >= 5 * 60_000) {
      await this.pruneExpired(now);
    }
    return this.count(key, windowMs, now);
  }

  // Globally prune keys that will never be reused, not just the key currently
  // being hit. One pass per worker / five minutes bounds cross-account bloat.
  async pruneExpired(now: Date): Promise<void> {
    await this.prisma.rateLimitCounter.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86_400_000) } } });
    this.lastPrunedAt = now.getTime();
  }

  async count(key: string, windowMs: number, now: Date): Promise<number> {
    const since = new Date(now.getTime() - windowMs);
    const [{ total }] = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(count), 0)::int AS total FROM rate_limit_counter WHERE key = ${key} AND window_start > ${since}`;
    return total;
  }

  async clear(key: string): Promise<void> {
    await this.prisma.rateLimitCounter.deleteMany({ where: { key } });
    await this.prisma.authLockout.deleteMany({ where: { key } });
  }

  async lock(key: string, until: Date): Promise<void> {
    await this.prisma.authLockout.upsert({ where: { key }, create: { key, lockedUntil: until }, update: { lockedUntil: until } });
  }

  async isLocked(key: string, now: Date): Promise<boolean> {
    const row = await this.prisma.authLockout.findUnique({ where: { key } });
    return !!row && row.lockedUntil > now;
  }
}
