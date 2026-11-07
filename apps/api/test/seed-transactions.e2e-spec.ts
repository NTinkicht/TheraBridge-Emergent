import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { hashPassword, verifyPassword } from '../src/auth/password';
import type { PrismaClient } from '@prisma/client';
import { runSeed } from '../src/cli/seed-synthetic';
import { Harness, makeApp, resetDb } from './helpers';
import { DEMO_EMAILS, DEMO_EXTRA_EMAILS, seedChildrensHome } from '../src/cli/seed-demo';

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

  it('never commits accounts when a rival claims the credential path after the preflight check', async () => {
    const destination = join(tmpdir(), 'tb-h01-file-race-' + randomUUID() + '.json');
    const keys = ['DEPLOYMENT_ENV', 'DEMO_SEED_CONFIRM', 'DATABASE_URL', 'DEMO_PASSWORDS_JSON', 'DEMO_EXTRA_PASSWORDS_JSON'] as const;
    const original = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    process.env.DEPLOYMENT_ENV = 'ci';
    process.env.DEMO_SEED_CONFIRM = 'CHILDRENS_HOME_SYNTHETIC_ONLY';
    process.env.DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:5432/synthetic_test';
    delete process.env.DEMO_PASSWORDS_JSON;
    delete process.env.DEMO_EXTRA_PASSWORDS_JSON;
    const upsert = jest.fn();
    const tx = {
      center: {
        count: jest.fn(async () => 0),
        findUnique: jest.fn(async (args: { where: { id?: string; slug?: string } }) => {
          if (args.where.id) writeFileSync(destination, 'owned-by-another-writer', { flag: 'wx', mode: 0o600 });
          return null;
        }),
        upsert,
      },
      user: {
        count: jest.fn(async () => 0),
        findUnique: jest.fn(async () => null),
      },
    };
    const db = { $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(tx)) };
    try {
      await expect(seedChildrensHome(db as unknown as PrismaClient, destination)).rejects.toThrow(/EEXIST/);
      expect(upsert).not.toHaveBeenCalled();
      expect(readFileSync(destination, 'utf8')).toBe('owned-by-another-writer');
    } finally {
      if (existsSync(destination)) unlinkSync(destination);
      for (const key of keys) {
        if (original[key] === undefined) delete process.env[key];
        else process.env[key] = original[key];
      }
    }
  });

  it('does not export hosted demo credentials if a center write fails inside the transaction', async () => {
    const destination = join(tmpdir(), 'tb-h01-demo-' + randomUUID() + '.json');
    const keys = ['DEPLOYMENT_ENV', 'DEMO_SEED_CONFIRM', 'DATABASE_URL', 'DEMO_PASSWORDS_JSON', 'DEMO_EXTRA_PASSWORDS_JSON'] as const;
    const original = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    process.env.DEPLOYMENT_ENV = 'ci';
    process.env.DEMO_SEED_CONFIRM = 'CHILDRENS_HOME_SYNTHETIC_ONLY';
    process.env.DATABASE_URL = 'postgresql://synthetic:synthetic@127.0.0.1:5432/therabridge_demo_test';
    delete process.env.DEMO_PASSWORDS_JSON;
    delete process.env.DEMO_EXTRA_PASSWORDS_JSON;
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
        authIdentity: { count: jest.fn(async () => 0) },
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

  async function withLocalDemoEnv<T>(action: () => Promise<T>): Promise<T> {
    const keys = ['DEPLOYMENT_ENV', 'DEMO_SEED_CONFIRM', 'DATABASE_URL', 'DEMO_PASSWORDS_JSON', 'DEMO_EXTRA_PASSWORDS_JSON'] as const;
    const original = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    process.env.DEPLOYMENT_ENV = 'ci';
    process.env.DEMO_SEED_CONFIRM = 'CHILDRENS_HOME_SYNTHETIC_ONLY';
    process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/synthetic_test';
    delete process.env.DEMO_PASSWORDS_JSON;
    delete process.env.DEMO_EXTRA_PASSWORDS_JSON;
    try { return await action(); }
    finally {
      for (const key of keys) {
        if (original[key] === undefined) delete process.env[key];
        else process.env[key] = original[key];
      }
    }
  }

  // The wrapper delegates transactions to real PostgreSQL; the injected
  // failure occurs after earlier writes, so rollback must undo them.
  function failAt(model: string, method: string, message: string): PrismaClient {
    const wrapper = {
      $transaction: (fn: (tx: any) => Promise<unknown>, options?: { timeout?: number; maxWait?: number }) =>
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
      // The seed's post-error recovery check must query committed state
      // outside the failed transaction, as the real Prisma client would.
      authIdentity: { count: (args: any) => h.prisma.authIdentity.count(args) },
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
    const keys = ['DEPLOYMENT_ENV', 'DEMO_SEED_CONFIRM', 'DATABASE_URL', 'DEMO_PASSWORDS_JSON', 'DEMO_EXTRA_PASSWORDS_JSON'] as const;
    const original = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    process.env.DEPLOYMENT_ENV = 'ci';
    process.env.DEMO_SEED_CONFIRM = 'CHILDRENS_HOME_SYNTHETIC_ONLY';
    process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/synthetic_test';
    delete process.env.DEMO_PASSWORDS_JSON;
    delete process.env.DEMO_EXTRA_PASSWORDS_JSON;
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
  it('retains credentials after real COMMIT when its acknowledgement is lost', async () => {
    const destination = join(tmpdir(), 'tb-h01-unknown-commit-' + randomUUID() + '.json');
    try {
      await withLocalDemoEnv(async () => {
        const uncertainDb = {
          $transaction: async (fn: (tx: any) => Promise<unknown>, options?: { timeout?: number; maxWait?: number }) => {
            await h.prisma.$transaction(fn, options);
            throw new Error('connection lost after COMMIT');
          },
          authIdentity: { count: (args: any) => h.prisma.authIdentity.count(args) },
        } as unknown as PrismaClient;
        await expect(seedChildrensHome(uncertainDb, destination))
          .rejects.toThrow(/outcome unknown.*credentials retained/i);
        expect(await h.prisma.authIdentity.count({ where: { provider: 'local' } })).toBe(10);
        expect(existsSync(destination)).toBe(true);
        const stored = JSON.parse(readFileSync(destination, 'utf8')) as { accounts?: unknown[] };
        expect(stored.accounts).toHaveLength(10);
      });
    } finally {
      if (existsSync(destination)) unlinkSync(destination);
    }
  }, 60_000);

  it('fails closed if an existing demo user lost its local identity', async () => {
    const destination = join(tmpdir(), 'tb-h01-missing-identity-' + randomUUID() + '.json');
    try {
      await withLocalDemoEnv(async () => {
        await seedChildrensHome(h.prisma, destination);
        expect(await h.prisma.authIdentity.deleteMany({
          where: { provider: 'local', subject: DEMO_EMAILS.parent },
        })).toMatchObject({ count: 1 });
        await expect(seedChildrensHome(h.prisma, destination))
          .rejects.toThrow('Demo identity missing for existing account; refusing unexported password for ' + DEMO_EMAILS.parent);
        expect(await h.prisma.authIdentity.count()).toBe(9);
        expect(existsSync(destination)).toBe(true);
      });
    } finally {
      if (existsSync(destination)) unlinkSync(destination);
    }
  }, 60_000);

  it('explains interrupted credential staging then permits a verified clean rerun', async () => {
    const destination = join(tmpdir(), 'tb-h01-interrupted-' + randomUUID() + '.json');
    writeFileSync(destination, '{}', { flag: 'wx', mode: 0o600 });
    try {
      await withLocalDemoEnv(async () => {
        await expect(seedChildrensHome(h.prisma, destination))
          .rejects.toThrow(/previous seed may have been interrupted before commit.*verify the database has no demo users/i);
        expect(readFileSync(destination, 'utf8')).toBe('{}');
        expect(await h.prisma.user.count()).toBe(0);
        unlinkSync(destination);
        await seedChildrensHome(h.prisma, destination);
        expect(await h.prisma.user.count()).toBe(10);
        expect(await h.prisma.authIdentity.count()).toBe(10);
        expect(existsSync(destination)).toBe(true);
      });
    } finally {
      if (existsSync(destination)) unlinkSync(destination);
    }
  }, 60_000);

  it('upgrades pre-existing seven-account local credentials only with three explicit passwords', async () => {
    const destination = join(tmpdir(), 'tb-seven-to-ten-' + randomUUID() + '.json');
    try {
      await withLocalDemoEnv(async () => {
        await seedChildrensHome(h.prisma, destination);
        const stored = JSON.parse(readFileSync(destination,'utf8')) as {accounts:{email:string;password:string;role:string}[]};
        const additional = Object.values(DEMO_EXTRA_EMAILS);
        const credentials = Object.fromEntries(stored.accounts.filter(a=>additional.includes(a.email as typeof additional[number])).map(a=>[a.email,a.password]));
        const seven = stored.accounts.filter(a=>!additional.includes(a.email as typeof additional[number]));
        writeFileSync(destination,JSON.stringify({...stored,accounts:seven}),{mode:0o600});
        await h.prisma.authIdentity.deleteMany({where:{subject:{in:additional}}});
        expect(await h.prisma.authIdentity.count()).toBe(7);
        await expect(seedChildrensHome(h.prisma,destination)).rejects.toThrow(/Existing extra therapist password is not recoverable/);
        expect(await h.prisma.authIdentity.count()).toBe(7);
        process.env.DEMO_EXTRA_PASSWORDS_JSON=JSON.stringify(credentials);
        await seedChildrensHome(h.prisma,destination);
        await seedChildrensHome(h.prisma,destination);
        expect(await h.prisma.authIdentity.count()).toBe(10);
        expect(JSON.parse(readFileSync(destination,'utf8')).accounts).toHaveLength(7);
      });
    } finally { if (existsSync(destination)) unlinkSync(destination); }
  }, 120_000);


  it('upgrades actual seven-account synthetic records to ten without modifying the legacy file or password hashes', async () => {
    const destination = join(tmpdir(), 'tb-m4-03-legacy-' + randomUUID() + '.json');
    const extraFile = destination.slice(0, -5) + '-extra.json';
    const scope = 'therabridge-childrens-home-ahmed-synthetic-v1';
    const stableId = (name: string) => {
      const h = createHash('sha256').update(scope + ':' + name).digest('hex');
      return [h.slice(0,8),h.slice(8,12),'4'+h.slice(13,16),'8'+h.slice(17,20),h.slice(20,32)].join('-');
    };
    try {
      await withLocalDemoEnv(async () => {
        const original = Object.entries(DEMO_EMAILS).map(([key,email]) => ({
          key,email,password:'demo-'+randomBytes(24).toString('base64url'),
          role:key==='platform'?'PLATFORM_ADMIN':'THERAPIST',
        }));
        for (const a of original) {
          const user = await h.prisma.user.create({data:{
            id:stableId('user:'+a.key),email:a.email,emailNormalized:a.email,displayName:'Synthetic '+a.key,
          }});
          await h.prisma.authIdentity.create({data:{
            userId:user.id,provider:'local',subject:a.email,passwordHash:await hashPassword(a.password),
          }});
        }
        writeFileSync(destination,JSON.stringify({
          synthetic:true,center:'childrens-home-demo',
          accounts:original.map(({email,password,role})=>({email,password,role})),
        },null,2),{flag:'wx',mode:0o600});
        const originalBytes=readFileSync(destination,'utf8');
        const hashesBefore=await h.prisma.authIdentity.findMany({
          where:{subject:{in:Object.values(DEMO_EMAILS)}},
          select:{subject:true,passwordHash:true},
        });
        await seedChildrensHome(h.prisma,destination);
        expect(readFileSync(destination,'utf8')).toBe(originalBytes);
        expect(existsSync(extraFile)).toBe(true);
        const extra=JSON.parse(readFileSync(extraFile,'utf8')) as {
          accounts:{email:string;password:string;role:string}[];
        };
        expect(extra.accounts).toHaveLength(3);
        for (const a of extra.accounts) {
          expect(Object.values(DEMO_EXTRA_EMAILS)).toContain(a.email);
          const identity=await h.prisma.authIdentity.findFirstOrThrow({where:{subject:a.email}});
          expect(await verifyPassword(identity.passwordHash ?? '',a.password)).toBe(true);
        }
        expect(await h.prisma.authIdentity.count()).toBe(10);
        await seedChildrensHome(h.prisma,destination);
        expect(await h.prisma.authIdentity.findMany({
          where:{subject:{in:Object.values(DEMO_EMAILS)}},
          select:{subject:true,passwordHash:true},
        })).toEqual(hashesBefore);
        expect(readFileSync(destination,'utf8')).toBe(originalBytes);
        expect(JSON.parse(readFileSync(extraFile,'utf8')).accounts).toEqual(extra.accounts);
      });
    } finally {
      if(existsSync(destination))unlinkSync(destination);
      if(existsSync(extraFile))unlinkSync(extraFile);
    }
  }, 180_000);

  it('removes freshly staged extra passwords on confirmed upgrade rollback while retaining all seven original accounts', async () => {
    const destination=join(tmpdir(),'tb-m4-03-rollback-'+randomUUID()+'.json');
    const extraFile=destination.slice(0,-5)+'-extra.json';
    const scope='therabridge-childrens-home-ahmed-synthetic-v1';
    const stableId=(key:string)=>{
      const h=createHash('sha256').update(scope+':user:'+key).digest('hex');
      return [h.slice(0,8),h.slice(8,12),'4'+h.slice(13,16),'8'+h.slice(17,20),h.slice(20,32)].join('-');
    };
    const entries=Object.entries(DEMO_EMAILS).map(([key,email])=>({
      key,email,password:'demo-'+randomBytes(24).toString('base64url'),role:'THERAPIST',
    }));
    writeFileSync(destination,JSON.stringify({synthetic:true,
      accounts:entries.map(({email,password,role})=>({email,password,role}))}),{flag:'wx',mode:0o600});
    const initial=readFileSync(destination,'utf8');
    const tx={
      center:{count:jest.fn(async()=>0),findUnique:jest.fn(async()=>null),
        upsert:jest.fn(async()=>{throw Error('upgrade_write_rollback');})},
      user:{count:jest.fn(async()=>0),findUnique:jest.fn(async(args: any)=>{
        const a=entries.find(e=>e.email===args.where.emailNormalized);
        return a?{id:stableId(a.key),status:'ACTIVE'}:null;
      })},
    };
    const db={$transaction:jest.fn(async(cb:(tx:unknown)=>Promise<unknown>)=>cb(tx)),
      authIdentity:{count:jest.fn(async(args:any)=>
        args.where.userId.in.length===3?0:7)},
    } as unknown as PrismaClient;
    const keys=['DEPLOYMENT_ENV','DEMO_SEED_CONFIRM','DATABASE_URL','DEMO_PASSWORDS_JSON','DEMO_EXTRA_PASSWORDS_JSON'] as const;
    const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
    try {
      process.env.DEPLOYMENT_ENV='ci';
      process.env.DEMO_SEED_CONFIRM='CHILDRENS_HOME_SYNTHETIC_ONLY';
      process.env.DATABASE_URL='postgresql://test:test@localhost:5432/synthetic_test';
      delete process.env.DEMO_PASSWORDS_JSON; delete process.env.DEMO_EXTRA_PASSWORDS_JSON;
      await expect(seedChildrensHome(db,destination)).rejects.toThrow('upgrade_write_rollback');
      expect(tx.center.upsert).toHaveBeenCalledTimes(1);
      expect(readFileSync(destination,'utf8')).toBe(initial);
      expect(existsSync(extraFile)).toBe(false);
    } finally {
      for(const key of keys)if(prior[key]===undefined)delete process.env[key];
      else process.env[key]=prior[key];
      if(existsSync(destination))unlinkSync(destination);
      if(existsSync(extraFile))unlinkSync(extraFile);
    }
  }, 60_000);

  it('seeds six fictional children including siblings and independently authenticated ABA/OT/Speech staff idempotently', async () => {
    const destination = join(tmpdir(), 'tb-expanded-demo-' + randomUUID() + '.json');
    try {
      await withLocalDemoEnv(async () => {
        await seedChildrensHome(h.prisma, destination);
        await seedChildrensHome(h.prisma, destination);
        expect(await h.prisma.child.count()).toBe(6);
        expect(await h.prisma.user.count()).toBe(10);
        expect(await h.prisma.authIdentity.count()).toBe(10);
        expect(await h.prisma.appointment.count()).toBe(15);
        const siblings = await h.prisma.child.findMany({where:{lastName:'Ahmed'}});
        expect(siblings).toHaveLength(3);
        const parent = await h.prisma.user.findUniqueOrThrow({where:{emailNormalized:DEMO_EMAILS.parent}});
        expect(await h.prisma.guardianLink.count({where:{userId:parent.id,removedAt:null}})).toBe(3);
        const extra = await h.prisma.membership.findMany({where:{title:{in:[
          'ABA therapist','Occupational therapist','Speech and language therapist'
        ]}},include:{user:true}});
        const extraOnly = extra.filter(m=>['dalia.mansour@childrens-home.therabridge.test',
          'nour.haddad@childrens-home.therabridge.test',
          'huda.rahim@childrens-home.therabridge.test'].includes(m.user.emailNormalized));
        expect(extraOnly).toHaveLength(3);
        for (const member of extraOnly) {
          expect(await h.prisma.authIdentity.count({where:{userId:member.userId}})).toBe(1);
        }
        expect(extraOnly.find(m=>m.title==='ABA therapist')?.specialties).toContain('behavioral');
      });
    } finally {
      if (existsSync(destination)) unlinkSync(destination);
    }
  }, 120_000);

});
