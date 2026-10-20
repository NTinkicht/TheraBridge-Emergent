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

async function bootApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  configureApp(app, [ORIGIN]);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('TB-EM-000 feasibility probe (real PostgreSQL via Prisma)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    assertTestDatabase();
    app = await bootApp();
    await app.get(PrismaService).feasibilityProbe.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports PostgreSQL up and the Prisma migration applied', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.framework).toBe('nestjs-fastify');
    expect(res.body.database).toMatchObject({ status: 'up', engine: 'postgresql' });
    expect(res.body.migrations.applied).toBeGreaterThanOrEqual(1);
    expect(res.body.migrations.latest).toContain('tb_em_000_feasibility_probe');
  });

  it('POST /api/health/probe writes a row that GET reads back and the database holds', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/health/probe')
      .send({ label: 'e2e-synthetic-probe', source: 'api-test' })
      .expect(201);
    expect(created.body).toMatchObject({ label: 'e2e-synthetic-probe', source: 'api-test' });
    expect(created.body.id).toMatch(/^[0-9a-f-]{36}$/);

    const listed = await request(app.getHttpServer()).get('/api/health/probe').expect(200);
    expect(listed.body.total).toBe(1);
    expect(listed.body.items[0].id).toBe(created.body.id);

    const row = await app.get(PrismaService).feasibilityProbe.findUnique({ where: { id: created.body.id } });
    expect(row?.label).toBe('e2e-synthetic-probe');
  });

  it('the row survives an application restart (persisted, not in memory)', async () => {
    await app.close();
    app = await bootApp();
    const listed = await request(app.getHttpServer()).get('/api/health/probe').expect(200);
    expect(listed.body.items.map((p: { label: string }) => p.label)).toContain('e2e-synthetic-probe');
  });

  it.each([
    ['label too long', { label: 'x'.repeat(65), source: 'api-test' }],
    ['label with forbidden characters', { label: '<script>', source: 'api-test' }],
    ['unknown source', { label: 'ok', source: 'mobile' }],
    ['unexpected field', { label: 'ok', source: 'api-test', extra: true }],
    ['missing body fields', {}],
  ])('POST /api/health/probe rejects %s with 400 and writes nothing', async (_name, body) => {
    await request(app.getHttpServer()).post('/api/health/probe').send(body).expect(400);
    expect(await app.get(PrismaService).feasibilityProbe.count()).toBe(1);
  });

  it('routes exist only under the /api prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('CORS allows the configured origin and not others', async () => {
    const allowed = await request(app.getHttpServer()).get('/api/health').set('Origin', ORIGIN);
    expect(allowed.headers['access-control-allow-origin']).toBe(ORIGIN);
    const denied = await request(app.getHttpServer()).get('/api/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
