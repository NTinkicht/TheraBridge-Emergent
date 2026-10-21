import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/prisma/prisma.service';

const ORIGIN = 'http://localhost:3000';

function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL must point at a dedicated *_test database');
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run integration tests against non-test database "${dbName}"`);
  }
}

describe('Health and TB-EM-001 checkpoint 0 probe retirement (real PostgreSQL)', () => {
  let app: NestFastifyApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    assertTestDatabase();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports PostgreSQL up and the retirement migration as latest', async () => {
    const res = await http().get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.framework).toBe('nestjs-fastify');
    expect(res.body.database).toMatchObject({ status: 'up', engine: 'postgresql' });
    expect(res.body.migrations.applied).toBeGreaterThanOrEqual(3);
    expect(res.body.migrations.latest).toMatch(/_tb_em_0\d\d_/);
    expect(res.body).not.toHaveProperty('probeWrites');
  });

  it('the feasibility_probe table no longer exists', async () => {
    const [{ t }] = await app.get(PrismaService).$queryRaw<{ t: string | null }[]>`SELECT to_regclass('public.feasibility_probe')::text AS t`;
    expect(t).toBeNull();
  });

  it.each([
    ['POST', '/api/health/probe'],
    ['GET', '/api/health/probe'],
  ])('%s %s is gone (404)', async (method, path) => {
    const req = method === 'POST' ? http().post(path).set('Origin', ORIGIN).send({ source: 'cli' }) : http().get(path);
    await req.expect(404);
  });

  it.each([
    ['application/x-www-form-urlencoded', 'source=cli'],
    ['text/plain', '{"source":"cli"}'],
  ])('non-JSON %s bodies are rejected with 415', async (type, body) => {
    await http().post('/api/health').set('Origin', ORIGIN).set('Content-Type', type).send(body).expect(415);
  });

  it('routes exist only under the /api prefix', async () => {
    await http().get('/health').expect(404);
  });

  it('CORS allows the configured origin and not others', async () => {
    const allowed = await http().get('/api/health').set('Origin', ORIGIN);
    expect(allowed.headers['access-control-allow-origin']).toBe(ORIGIN);
    const denied = await http().get('/api/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
