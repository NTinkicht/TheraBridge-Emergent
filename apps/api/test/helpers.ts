import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/auth/password';
import { API_BODY_LIMIT_BYTES, configureApp } from '../src/bootstrap';
import { CLOCK } from '../src/common/clock';
import { AUTH_CONFIG, loadAuthConfig } from '../src/config/env';
import { PrismaService } from '../src/prisma/prisma.service';

export const ORIGIN = 'http://localhost:3000';
// Synthetic, generated per test run; never a literal credential in source (R2).
export const freshPassword = () => `Synthetic-${randomBytes(12).toString('base64url')}`;
export const PASSWORD = freshPassword();

export function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL must point at a dedicated *_test database');
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) throw new Error(`Refusing to run integration tests against non-test database "${dbName}"`);
}

export class FakeClock {
  t = Date.now();
  now = () => new Date(this.t);
  advance(ms: number) {
    this.t += ms;
  }
}

export interface Harness {
  app: NestFastifyApplication;
  http: () => ReturnType<typeof request>;
  prisma: PrismaService;
  clock: FakeClock;
  close: () => Promise<void>;
}

export async function makeApp(env: Record<string, string> = {}, clock = new FakeClock()): Promise<Harness> {
  assertTestDatabase();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK).useValue(clock)
    .overrideProvider(AUTH_CONFIG).useValue(loadAuthConfig({ ...process.env, ...env }))
    .compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter({ bodyLimit: API_BODY_LIMIT_BYTES }));
  configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return { app, http: () => request(app.getHttpServer()), prisma: app.get(PrismaService), clock, close: () => app.close() };
}

export async function resetDb(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

let userSeq = 0;
export async function createUser(prisma: PrismaService, email = `user${++userSeq}@test.therabridge.test`, password = PASSWORD) {
  return prisma.user.create({
    data: {
      email,
      emailNormalized: email.toLowerCase(),
      displayName: 'Test User',
      identities: { create: { provider: 'local', subject: email.toLowerCase(), passwordHash: await hashPassword(password) } },
    },
  });
}

export function cookieFrom(res: { headers: Record<string, unknown> }, name: string): string | undefined {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  const hit = list.find((c: string) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.split(';')[0].slice(name.length + 1)) : undefined;
}

export function rawCookie(res: { headers: Record<string, unknown> }, name: string): string | undefined {
  const raw = res.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  return list.find((c: string) => c.startsWith(`${name}=`));
}

export async function preAuth(h: Harness) {
  const res = await h.http().get('/api/auth/csrf').expect(200);
  return { cookie: `tb_pre=${cookieFrom(res, 'tb_pre')}`, token: res.body.csrfToken as string };
}

export async function login(h: Harness, email: string, password = PASSWORD, xff?: string) {
  const p = await preAuth(h);
  const req = h.http().post('/api/auth/login').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token);
  if (xff) req.set('X-Forwarded-For', xff);
  return req.send({ email, password });
}

export interface Signed {
  token: string;
  cookie: string;
  csrf: string;
  body: Record<string, any>;
}

export async function signIn(h: Harness, email: string, password = PASSWORD): Promise<Signed> {
  const res = await login(h, email, password);
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token = cookieFrom(res, 'tb_session')!;
  return { token, cookie: `tb_session=${token}`, csrf: res.body.csrfToken, body: res.body };
}

export function post(h: Harness, path: string, s: Pick<Signed, 'cookie' | 'csrf'>, body: object = {}) {
  return h.http().post(path).set('Origin', ORIGIN).set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send(body);
}
