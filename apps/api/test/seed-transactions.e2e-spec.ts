import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { runSeed } from '../src/cli/seed-synthetic';
import { seedChildrensHome } from '../src/cli/seed-demo';

describe('M2-H01 synthetic seed transaction boundaries (fault injection)', () => {
  it('does not export credentials if a synthetic user write fails after center insert', async () => {
    const destination = join(tmpdir(), 'tb-h01-synthetic-' + randomUUID() + '.json');
    const db = {
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
        center: { upsert: jest.fn(async () => ({ id: 'synthetic-center' })) },
        user: { upsert: jest.fn(async () => { throw new Error('injected synthetic user-write failure'); }) },
      })),
    };
    await expect(runSeed(db as unknown as PrismaClient, destination)).rejects.toThrow('injected synthetic user-write failure');
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(existsSync(destination)).toBe(false);
  });

  it('does not export hosted demo credentials if a center write fails inside the transaction', async () => {
    const destination = join(tmpdir(), 'tb-h01-demo-' + randomUUID() + '.json');
    const keys = ['DEPLOYMENT_ENV', 'DEMO_SEED_CONFIRM', 'DATABASE_URL', 'DEMO_PASSWORDS_JSON'] as const;
    const original = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    process.env.DEPLOYMENT_ENV = 'ci';
    process.env.DEMO_SEED_CONFIRM = 'CHILDRENS_HOME_SYNTHETIC_ONLY';
    process.env.DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:5432/therabridge_demo_test';
    delete process.env.DEMO_PASSWORDS_JSON;
    try {
      const tx = {
        center: {
          count: jest.fn(async () => 0),
          findUnique: jest.fn(async () => null),
          upsert: jest.fn(async () => { throw new Error('injected demo center-write failure'); }),
        },
        user: {
          count: jest.fn(async () => 0),
          findUnique: jest.fn(async () => null),
        },
      };
      const db = {
        $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx)),
      };
      await expect(seedChildrensHome(db as unknown as PrismaClient, destination)).rejects.toThrow('injected demo center-write failure');
      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(existsSync(destination)).toBe(false);
    } finally {
      for (const key of keys) {
        if (original[key] === undefined) delete process.env[key];
        else process.env[key] = original[key];
      }
    }
  });
});
