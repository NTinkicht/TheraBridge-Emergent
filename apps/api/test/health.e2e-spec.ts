import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PROBE_MAX_ROWS, PROBE_WRITES_PER_MINUTE } from '../src/health/probe-write.guard';
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

async function bootApp(writes: 'true' | 'false' | '' = 'true'): Promise<NestFastifyApplication> {
  // '' rather than delete: Prisma auto-loads apps/api/.env and would refill a deleted variable.
  process.env.PROBE_WRITES_ENABLED = writes;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  configureApp(app, [ORIGIN]);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('TB-EM-000 feasibility probe (real PostgreSQL via Prisma)', () => {
  let app: NestFastifyApplication;
  const prisma = () => app.get(PrismaService);
  const post = (body: object) => request(app.getHttpServer()).post('/api/health/probe').send(body);

  beforeAll(async () => {
    assertTestDatabase();
    app = await bootApp();
    await prisma().feasibilityProbe.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports PostgreSQL up, the Prisma migration and probe-write policy', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.framework).toBe('nestjs-fastify');
    expect(res.body.database).toMatchObject({ status: 'up', engine: 'postgresql' });
    expect(res.body.migrations.applied).toBeGreaterThanOrEqual(1);
    expect(res.body.migrations.latest).toContain('tb_em_000_feasibility_probe');
    expect(res.body.probeWrites).toEqual({ enabled: true, maxRows: PROBE_MAX_ROWS, perMinutePerIp: PROBE_WRITES_PER_MINUTE });
  });

  it('POST /api/health/probe writes a server-labelled row that GET reads back and the database holds', async () => {
    const created = await post({ source: 'api-test' }).expect(201);
    expect(created.body.source).toBe('api-test');
    expect(created.body.label).toMatch(/^probe-api-test-[a-z0-9]+-[0-9a-f]{6}$/);
    expect(created.body.id).toMatch(/^[0-9a-f-]{36}$/);

    const listed = await request(app.getHttpServer()).get('/api/health/probe').expect(200);
    expect(listed.body.total).toBe(1);
    expect(listed.body.items[0].id).toBe(created.body.id);

    const row = await prisma().feasibilityProbe.findUnique({ where: { id: created.body.id } });
    expect(row?.label).toBe(created.body.label);
  });

  it('the row survives an application restart (persisted, not in memory)', async () => {
    await app.close();
    app = await bootApp();
    const listed = await request(app.getHttpServer()).get('/api/health/probe').expect(200);
    expect(listed.body.total).toBe(1);
  });

  it.each([
    ['client-supplied label (free text is never accepted)', { label: 'Jane Doe', source: 'api-test' }],
    ['unknown source', { source: 'mobile' }],
    ['unexpected field', { source: 'api-test', extra: true }],
    ['missing source', {}],
  ])('POST /api/health/probe rejects %s with 400 and writes nothing', async (_name, body) => {
    await post(body).expect(400);
    expect(await prisma().feasibilityProbe.count()).toBe(1);
  });

  it.each([
    ['application/x-www-form-urlencoded', 'source=cli'],
    ['text/plain', '{"source":"cli"}'],
    ['multipart/form-data; boundary=x', '--x\r\nContent-Disposition: form-data; name="source"\r\n\r\ncli\r\n--x--'],
  ])('POST /api/health/probe rejects %s bodies with 415 and writes nothing', async (type, body) => {
    await request(app.getHttpServer()).post('/api/health/probe').set('Content-Type', type).send(body).expect(415);
    expect(await prisma().feasibilityProbe.count()).toBe(1);
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

  it(`keeps at most ${PROBE_MAX_ROWS} rows, pruning the oldest`, async () => {
    const old = new Date(Date.now() - 3_600_000);
    await prisma().feasibilityProbe.createMany({
      data: Array.from({ length: PROBE_MAX_ROWS + 5 }, (_, i) => ({ label: `seed-${i}`, source: 'cli', createdAt: old })),
    });
    const created = await post({ source: 'api-test' }).expect(201);
    expect(await prisma().feasibilityProbe.count()).toBe(PROBE_MAX_ROWS);
    expect(await prisma().feasibilityProbe.findUnique({ where: { id: created.body.id } })).not.toBeNull();
  });

  it(`rate-limits writes to ${PROBE_WRITES_PER_MINUTE} per minute per client`, async () => {
    await app.close();
    app = await bootApp();
    for (let i = 0; i < PROBE_WRITES_PER_MINUTE; i++) await post({ source: 'api-test' }).expect(201);
    await post({ source: 'api-test' }).expect(429);
  });

  it('PROBE_WRITES_ENABLED=false makes the write route behave as absent (404) while reads still work', async () => {
    await app.close();
    app = await bootApp('false');
    const before = await prisma().feasibilityProbe.count();
    await post({ source: 'api-test' }).expect(404);
    expect(await prisma().feasibilityProbe.count()).toBe(before);
    await request(app.getHttpServer()).get('/api/health/probe').expect(200);
    const health = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(health.body.probeWrites.enabled).toBe(false);
  });

  it('refuses to boot when PROBE_WRITES_ENABLED is empty or unset (no silent default)', async () => {
    await expect(bootApp('')).rejects.toThrow('PROBE_WRITES_ENABLED');
  });
});
