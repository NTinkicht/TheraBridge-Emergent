import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { runSeed } from '../src/cli/seed-synthetic';
import { Harness, makeApp, resetDb } from './helpers';
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

describe('M2-H01 real PostgreSQL rollback and protected-file consistency', () => {
  let h: Harness;
  beforeAll(async () => { h = await makeApp(); });
  afterAll(async () => { await h.close(); });
  beforeEach(async () => { await resetDb(h.prisma); });

  // The wrapper delegates transactions to real PostgreSQL; the injected
  // failure occurs after earlier writes, so rollback must undo them.
  function failAt(model: string, method: string, message: string): PrismaClient {
    const wrapper = {
      $transaction: (fn: (tx: any) => Promise<unknown>, options?: object) =>
        h.prisma.$transaction(async tx => {
          const poisoned = new Proxy(tx, {
            get(target, name: string | symbol) {
              if (name !== model) return Reflect.get(target, name);
              return new Proxy(Reflect.get(target, name), {
                get(targetModel, operation: string | symbol) {
                  if (operation === method) return async () => { throw new Error(message); };
                  return Reflect.get(targetModel, operation);
                },
              });
            },
          });
          return fn(poisoned);
        }, options),
    };
    return wrapper as unknown as PrismaClient;
  }

  it('rolls back created synthetic users and centers when role write fails', async () => {
    const destination = join(tmpdir(), 'tb-h01-real-seed-' + randomUUID() + '.json');
    await expect(runSeed(failAt('roleAssignment', 'upsert', 'fault: role assignment'), destination))
      .rejects.toThrow('fault: role assignment');
    expect(await h.prisma.center.count({ where: { slug: { in: ['harbor', 'cedar'] } } })).toBe(0);
    expect(await h.prisma.user.count({ where: { emailNormalized: { contains: 'therabridge.test' } } })).toBe(0);
    expect(await h.prisma.auditEvent.count({ where: { type: 'seed.synthetic' } })).toBe(0);
    expect(existsSync(destination)).toBe(false);
  });

  it('rolls back demo DB and removes pre-staged credentials on mid-seed failure', async () => {
    const destination = join(tmpdir(), 'tb-h01-real-demo-' + randomUUID() + '.json');
    const keys = ['DEPLOYMENT_ENV', 'DEMO_SEED_CONFIRM', 'DATABASE_URL', 'DEMO_PASSWORDS_JSON'] as const;
    const original = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    process.env.DEPLOYMENT_ENV = 'ci';
    process.env.DEMO_SEED_CONFIRM = 'CHILDRENS_HOME_SYNTHETIC_ONLY';
    process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/synthetic_test';
    delete process.env.DEMO_PASSWORDS_JSON;
    try {
      await expect(seedChildrensHome(failAt('child', 'upsert', 'fault: child upsert'), destination))
        .rejects.toThrow('fault: child upsert');
      expect(await h.prisma.center.count()).toBe(0);
      expect(await h.prisma.user.count()).toBe(0);
      expect(await h.prisma.authIdentity.count()).toBe(0);
      expect(existsSync(destination)).toBe(false);
    } finally {
      for (const key of keys) {
        if (original[key] === undefined) delete process.env[key];
        else process.env[key] = original[key];
      }
    }
  });
});
