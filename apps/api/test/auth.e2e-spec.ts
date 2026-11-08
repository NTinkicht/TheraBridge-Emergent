import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { RouteAccessVerifier } from '../src/auth/route-access.verifier';
import { ipPrefix, parseTrustedProxiesForTest, resolveClientIp, sha256 } from './unit-helpers';
import { loadAuthConfig } from '../src/config/env';
import { passwordPolicyError } from '../src/auth/password';
import { RateLimitStore } from '../src/auth/rate-limit.store';
import { ACCOUNT_LIMIT } from '../src/auth/auth.service';
import {
  FakeClock, Harness, ORIGIN, PASSWORD, cookieFrom, createUser, freshPassword, login, makeApp, post, preAuth, rawCookie, resetDb, signIn,
} from './helpers';

const MIN = 60_000;
const dumpJson = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? Number(x) : x));
const baseEnv = { DEPLOYMENT_ENV: 'ci', AUTH_SECRET: 'x'.repeat(32), COOKIE_SECURE: 'false', TRUSTED_PROXY_CIDRS: '', CORS_ORIGINS: ORIGIN, DEV_MAILBOX_ENABLED: 'false' };

describe('TB-EM-001 checkpoint A: identity, sessions, CSRF, brute force (real PostgreSQL)', () => {
  let h: Harness;

  beforeAll(async () => {
    h = await makeApp();
  });
  afterAll(async () => {
    await h.close();
  });
  beforeEach(async () => {
    await resetDb(h.prisma);
    h.clock.t = Date.now();
  });

  describe('AC-1 login and cookies', () => {
    it('creates a hash-only session and an HttpOnly, SameSite=Lax, Path=/ cookie without Domain', async () => {
      const u = await createUser(h.prisma);
      const res = await login(h, u.email);
      expect(res.status).toBe(200);
      const raw = rawCookie(res, 'tb_session')!;
      expect(raw).toMatch(/HttpOnly/);
      expect(raw).toMatch(/SameSite=Lax/);
      expect(raw).toMatch(/Path=\//);
      expect(raw).not.toMatch(/Domain=/i);
      const token = cookieFrom(res, 'tb_session')!;
      const rows = await h.prisma.session.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(sha256(token));
      expect(JSON.stringify(rows)).not.toContain(token);
      expect(dumpJson(await h.prisma.auditEvent.findMany())).not.toContain(token);
      expect(res.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
      expect(res.headers.pragma).toBe('no-cache');
      expect(res.body.user.email).toBe(u.email);
      expect(res.body.csrfToken).toEqual(expect.any(String));
    });

    it('uses __Host- cookie names with Secure when COOKIE_SECURE=true', async () => {
      const secure = await makeApp({ COOKIE_SECURE: 'true', DEPLOYMENT_ENV: 'preview' });
      try {
        const res = await secure.http().get('/api/auth/csrf').expect(200);
        expect(rawCookie(res, '__Host-tb_pre')).toMatch(/; Secure/);
        expect(rawCookie(res, '__Host-tb_pre')).toMatch(/Path=\//);
      } finally {
        await secure.close();
      }
    });

    it('validates the request body strictly (unknown fields rejected)', async () => {
      const p = await preAuth(h);
      await h.http().post('/api/auth/login').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token)
        .send({ email: 'a@b.test', password: 'x', role: 'PLATFORM_ADMIN' }).expect(400);
    });

    it('sets private no-store headers outside auth and rejects oversized JSON at the Fastify boundary', async () => {
      const health = await h.http().get('/api/health').expect(200);
      expect(health.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, private');
      expect(health.headers.pragma).toBe('no-cache');
      const tooLarge = await h.http().post('/api/auth/login').set('Origin', ORIGIN).set('Content-Type', 'application/json')
        .send({ email: 'oversized@test.therabridge.test', password: 'a'.repeat(1024 * 1024) });
      expect(tooLarge.status).toBe(413);
      expect(tooLarge.headers['cache-control']).toContain('no-store');
    });
  });

  describe('M4-05 WF-S6 server-side expiry and protected-response cache policy', () => {
    it('rejects the actual expired session cookie before serving account or clinical centre data', async () => {
      const u = await createUser(h.prisma, 'expiry@security.therabridge.test');
      const s = await signIn(h, u.email);
      const originalCookie = s.cookie;
      const good = await h.http().get('/api/auth/session').set('Cookie', originalCookie).expect(200);
      expect(good.headers['cache-control']).toContain('no-store');
      const updated = await h.prisma.session.updateMany({
        where: { tokenHash: sha256(s.token) },
        data: { absoluteExpiresAt: new Date(h.clock.now().getTime() - 1000) },
      });
      expect(updated.count).toBe(1);
      for (const path of [
        '/api/auth/session',
        '/api/centers/00000000-0000-4000-8000-000000000001/children',
      ]) {
        const denied = await h.http().get(path).set('Cookie', originalCookie).expect(401);
        expect(denied.headers['cache-control']).toContain('no-store');
        expect(denied.headers.pragma).toBe('no-cache');
        expect(JSON.stringify(denied.body)).not.toContain(u.email);
      }
      const another = await createUser(h.prisma, 'active@security.therabridge.test');
      const live = await signIn(h, another.email);
      await h.http().get('/api/auth/session').set('Cookie', live.cookie).expect(200);
    });
  });

  describe('AC-2/3 generic errors, lockout, IP limit', () => {
    it('M2-H04: prunes expired buckets across keys without removing active windows', async () => {
      const old = new Date(h.clock.now().getTime() - 2 * 86_400_000);
      const recent = h.clock.now();
      await h.prisma.rateLimitCounter.createMany({ data: [
        { key: 'old-other-account', windowStart: old, count: 7 },
        { key: 'recent-account', windowStart: recent, count: 1 },
      ] });
      await h.app.get(RateLimitStore).pruneExpired(recent);
      expect(await h.prisma.rateLimitCounter.count({ where: { key: 'old-other-account' } })).toBe(0);
      expect(await h.prisma.rateLimitCounter.count({ where: { key: 'recent-account' } })).toBe(1);
    });
    it('wrong password, unknown email and locked account return the same 401 body', async () => {
      const u = await createUser(h.prisma);
      const wrong = await login(h, u.email, 'not-the-password-123');
      const unknown = await login(h, 'nobody@test.therabridge.test', 'not-the-password-123');
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(unknown.body).toEqual(wrong.body);
      for (let i = 0; i < 4; i++) await login(h, u.email, 'not-the-password-123');
      const locked = await login(h, u.email);
      expect(locked.status).toBe(401);
      expect(locked.body).toEqual(wrong.body);
    });

    it('unknown-email timing stays within ±25% of known-email timing (median of 7)', async () => {
      const u = await createUser(h.prisma);
      const time = async (email: string) => {
        const t = process.hrtime.bigint();
        await login(h, email, 'not-the-password-123');
        return Number(process.hrtime.bigint() - t);
      };
      const known: number[] = [];
      const unknown: number[] = [];
      for (let i = 0; i < 7; i++) {
        await h.prisma.rateLimitCounter.deleteMany();
        await h.prisma.authLockout.deleteMany();
        known.push(await time(u.email));
        unknown.push(await time(`ghost${i}@test.therabridge.test`));
      }
      const median = (a: number[]) => a.sort((x, y) => x - y)[3];
      const ratio = median(unknown) / median(known);
      expect(ratio).toBeGreaterThan(0.75);
      expect(ratio).toBeLessThan(1.33);
    });

    it('locks after 5 failures in 15 minutes and unlocks after the window', async () => {
      const u = await createUser(h.prisma);
      for (let i = 0; i < 5; i++) expect((await login(h, u.email, 'not-the-password-123')).status).toBe(401);
      expect((await login(h, u.email)).status).toBe(401);
      expect(await h.prisma.auditEvent.count({ where: { type: 'auth.lockout' } })).toBe(1);
      h.clock.advance(16 * MIN);
      expect((await login(h, u.email)).status).toBe(200);
    });

    it('M4-05: targeted account lockout blocks only the attacking origin', async () => {
      const proxied = await makeApp({ TRUSTED_PROXY_CIDRS: '127.0.0.1/32,::1/128' }, h.clock);
      try {
        const u = await createUser(proxied.prisma, 'targeted-lockout@test.therabridge.test');
        const attacker = '198.51.100.77';
        const legitimate = '198.51.100.88';
        for (let i = 0; i < ACCOUNT_LIMIT; i++) {
          expect((await login(proxied, u.email, 'incorrect-targeted-password', attacker)).status).toBe(401);
        }
        expect((await login(proxied, u.email, PASSWORD, attacker)).status).toBe(401);
        expect((await login(proxied, u.email, PASSWORD, legitimate)).status).toBe(200);
      } finally {
        await proxied.close();
      }
    });

    it('returns 429 after 30 failures from one IP', async () => {
      for (let i = 0; i < 30; i++) await login(h, `spray${i}@test.therabridge.test`, 'not-the-password-123');
      const res = await login(h, 'spray-last@test.therabridge.test', 'not-the-password-123');
      expect(res.status).toBe(429);
    });
  });

  describe('AC-4 idle and absolute expiry', () => {
    it('expires after 30 minutes idle', async () => {
      const u = await createUser(h.prisma);
      const s = await signIn(h, u.email);
      h.clock.advance(29 * MIN);
      await h.http().get('/api/auth/session').set('Cookie', s.cookie).expect(200);
      h.clock.advance(29 * MIN);
      await h.http().get('/api/auth/session').set('Cookie', s.cookie).expect(200);
      h.clock.advance(31 * MIN);
      await h.http().get('/api/auth/session').set('Cookie', s.cookie).expect(401);
    });

    it('expires after 12 hours even when active', async () => {
      const u = await createUser(h.prisma);
      const s = await signIn(h, u.email);
      for (let i = 0; i < 25; i++) {
        h.clock.advance(29 * MIN);
        await h.http().get('/api/auth/session').set('Cookie', s.cookie);
      }
      await h.http().get('/api/auth/session').set('Cookie', s.cookie).expect(401);
    });
  });

  describe('AC-5 CSRF, Origin, Sec-Fetch-Site', () => {
    let s: Awaited<ReturnType<typeof signIn>>;
    beforeEach(async () => {
      const u = await createUser(h.prisma);
      s = await signIn(h, u.email);
    });

    it('rejects a missing or wrong CSRF header', async () => {
      await h.http().post('/api/auth/logout').set('Origin', ORIGIN).set('Cookie', s.cookie).send({}).expect(403);
      await post(h, '/api/auth/logout', { cookie: s.cookie, csrf: 'wrong' }).expect(403);
      expect(await h.prisma.auditEvent.count({ where: { type: 'security.csrf_rejected' } })).toBe(2);
    });

    it("rejects another session's CSRF token", async () => {
      const other = await signIn(h, (await createUser(h.prisma)).email);
      await post(h, '/api/auth/logout', { cookie: s.cookie, csrf: other.csrf }).expect(403);
    });

    it('rejects foreign, missing and cross-site origins; accepts a same-origin Referer', async () => {
      await h.http().post('/api/auth/logout').set('Origin', 'https://evil.example').set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send({}).expect(403);
      await h.http().post('/api/auth/logout').set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send({}).expect(403);
      await post(h, '/api/auth/logout', s).set('Sec-Fetch-Site', 'cross-site').expect(403);
      expect(await h.prisma.auditEvent.count({ where: { type: 'security.origin_rejected' } })).toBe(3);
      await h.http().post('/api/auth/logout').set('Referer', `${ORIGIN}/account/security`).set('Cookie', s.cookie).set('X-CSRF-Token', s.csrf).send({}).expect(204);
    });

    it('rejects tampered, expired and cookie-mismatched pre-auth tokens', async () => {
      const u = await createUser(h.prisma);
      const send = (cookie: string, token: string) =>
        h.http().post('/api/auth/login').set('Origin', ORIGIN).set('Cookie', cookie).set('X-CSRF-Token', token).send({ email: u.email, password: PASSWORD });
      const p = await preAuth(h);
      const flipped = p.token.slice(0, -1) + (p.token.endsWith('A') ? 'B' : 'A');
      await send(p.cookie, flipped).expect(403);
      await send('tb_pre=someone-elses-nonce', p.token).expect(403);
      await send('', p.token).expect(403);
      h.clock.advance(11 * MIN);
      await send(p.cookie, p.token).expect(403);
      const fresh = await preAuth(h);
      await send(fresh.cookie, fresh.token).expect(200);
    });
  });

  describe('AC-6 rotation and fixation', () => {
    it('password change rotates: old token 401, old CSRF 403, new works; other sessions revoked', async () => {
      const u = await createUser(h.prisma);
      const s = await signIn(h, u.email);
      const other = await signIn(h, u.email);
      const res = await post(h, '/api/auth/password/change', s, { currentPassword: PASSWORD, newPassword: freshPassword() }).expect(200);
      const next = cookieFrom(res, 'tb_session')!;
      expect(next).not.toBe(s.token);
      await h.http().get('/api/auth/session').set('Cookie', s.cookie).expect(401);
      await h.http().get('/api/auth/session').set('Cookie', other.cookie).expect(401);
      await post(h, '/api/auth/logout', { cookie: `tb_session=${next}`, csrf: s.csrf }).expect(403);
      await post(h, '/api/auth/logout', { cookie: `tb_session=${next}`, csrf: res.body.csrfToken }).expect(204);
      const rotated = await h.prisma.session.findFirst({ where: { rotatedFromId: { not: null } } });
      expect(rotated).not.toBeNull();
    });

    it('never promotes a cookie planted before login', async () => {
      const u = await createUser(h.prisma);
      const planted = 'attacker-chosen-session-value-000000000000';
      const p = await preAuth(h);
      const res = await h.http().post('/api/auth/login').set('Origin', ORIGIN)
        .set('Cookie', `${p.cookie}; tb_session=${planted}`).set('X-CSRF-Token', p.token).send({ email: u.email, password: PASSWORD }).expect(200);
      expect(cookieFrom(res, 'tb_session')).not.toBe(planted);
      await h.http().get('/api/auth/session').set('Cookie', `tb_session=${planted}`).expect(401);
    });

    it('rejects weak new passwords with a clear message', async () => {
      const u = await createUser(h.prisma);
      const s = await signIn(h, u.email);
      const res = await post(h, '/api/auth/password/change', s, { currentPassword: PASSWORD, newPassword: 'short' }).expect(422);
      expect(res.body.message).toMatch(/12 characters/);
    });

    it('shares a per-account password-change budget across sessions and restores it after the window', async () => {
      const u = await createUser(h.prisma);
      const first = await signIn(h, u.email);
      const second = await signIn(h, u.email);
      const wrong = { currentPassword: 'not-the-current-password', newPassword: freshPassword() };
      for (let i = 0; i < 5; i++) {
        await post(h, '/api/auth/password/change', i % 2 ? first : second, wrong).expect(422);
      }
      const limited = await post(h, '/api/auth/password/change', first, wrong).expect(429);
      expect(limited.body.message).toMatch(/too many password-change attempts/i);
      expect(await h.prisma.auditEvent.count({ where: { type: 'auth.password.change_rate_limited' } })).toBe(1);
      h.clock.advance(16 * MIN);
      await post(h, '/api/auth/password/change', second, wrong).expect(422);
    });
  });

  describe('logout and logout-all', () => {
    it('logout ends only the current session; logout-all ends every session', async () => {
      const u = await createUser(h.prisma);
      const a = await signIn(h, u.email);
      const b = await signIn(h, u.email);
      const c = await signIn(h, u.email);
      await post(h, '/api/auth/logout', a).expect(204);
      await h.http().get('/api/auth/session').set('Cookie', a.cookie).expect(401);
      await h.http().get('/api/auth/session').set('Cookie', b.cookie).expect(200);
      await post(h, '/api/auth/logout-all', b).expect(204);
      await h.http().get('/api/auth/session').set('Cookie', b.cookie).expect(401);
      await h.http().get('/api/auth/session').set('Cookie', c.cookie).expect(401);
    });

    it('a disabled user is rejected on the next request', async () => {
      const u = await createUser(h.prisma);
      const s = await signIn(h, u.email);
      await h.prisma.user.update({ where: { id: u.id }, data: { status: 'DISABLED' } });
      await h.http().get('/api/auth/session').set('Cookie', s.cookie).expect(401);
    });
  });

  describe('AC-7 boot configuration', () => {
    it.each([
      ['missing AUTH_SECRET', { AUTH_SECRET: '' }],
      ['short AUTH_SECRET', { AUTH_SECRET: 'too-short' }],
      ['missing COOKIE_SECURE', { COOKIE_SECURE: '' }],
      ['invalid COOKIE_SECURE', { COOKIE_SECURE: 'yes' }],
      ['insecure cookies in preview', { DEPLOYMENT_ENV: 'preview' }],
      ['insecure cookies in production', { DEPLOYMENT_ENV: 'production' }],
      ['unknown DEPLOYMENT_ENV', { DEPLOYMENT_ENV: 'dev' }],
      ['missing TRUSTED_PROXY_CIDRS', { TRUSTED_PROXY_CIDRS: undefined }],
      ['invalid CIDR', { TRUSTED_PROXY_CIDRS: '10.0.0.0/99' }],
      ['missing DEV_MAILBOX_ENABLED', { DEV_MAILBOX_ENABLED: '' }],
    ])('refuses to boot: %s', (_name, over) => {
      expect(() => loadAuthConfig({ ...baseEnv, ...over } as Record<string, string | undefined>)).toThrow();
    });

    it('accepts a valid secure production configuration', () => {
      expect(loadAuthConfig({ ...baseEnv, DEPLOYMENT_ENV: 'production', COOKIE_SECURE: 'true' }).sessionCookie).toBe('__Host-tb_session');
    });
  });

  describe('AC-8 route access declarations', () => {
    it('every registered route declares access, and non-public routes return 401 without a session', async () => {
      const routes = h.app.get(RouteAccessVerifier).routes();
      expect(routes.length).toBeGreaterThan(5);
      for (const r of routes) {
        expect(r.access).toBeDefined();
        if (r.access!.kind === 'public') continue;
        const path = `/api${r.route.replace(/:[A-Za-z]+/g, '00000000-0000-4000-8000-000000000000')}`;
        const res = r.method === 'GET' ? await h.http().get(path) : await h.http()[r.method === 'PATCH' ? 'patch' : 'post'](path).set('Origin', ORIGIN).send({});
        expect([r.method, r.route, res.status]).toEqual([r.method, r.route, 401]);
      }
    });

    it('boot fails when a route has no access declaration', async () => {
      @Controller('undeclared')
      class UndeclaredController {
        @Get() open() {
          return 'should never be reachable';
        }
      }
      @Module({ controllers: [UndeclaredController] })
      class UndeclaredModule {}
      const ref = await Test.createTestingModule({ imports: [AppModule, UndeclaredModule] }).compile();
      const app = ref.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
      await expect(app.init()).rejects.toThrow(/without an access declaration: GET \/undeclared/);
      await app.close().catch(() => undefined);
    });
  });

  describe('AC-13 multi-instance counters', () => {
    it('two API instances on one database share lockout counters', async () => {
      const second = await makeApp({}, h.clock);
      try {
        const u = await createUser(h.prisma);
        for (let i = 0; i < 3; i++) await login(h, u.email, 'not-the-password-123');
        for (let i = 0; i < 2; i++) await login(second, u.email, 'not-the-password-123');
        expect((await login(h, u.email)).status).toBe(401);
        expect((await login(second, u.email)).status).toBe(401);
      } finally {
        await second.close();
      }
    });

    it('counts 20 concurrent failures exactly (no lost updates)', async () => {
      const u = await createUser(h.prisma);
      await Promise.all(Array.from({ length: 20 }, () => login(h, u.email, 'not-the-password-123')));
      const [{ total }] = await h.prisma.$queryRaw<{ total: number }[]>`SELECT SUM(count)::int AS total FROM rate_limit_counter WHERE key LIKE 'acct:%'`;
      expect(total).toBe(20);
    });
  });

  describe('AC-14 trusted proxies', () => {
    const proxies = parseTrustedProxiesForTest('10.0.0.0/8,127.0.0.1/32');
    it.each([
      ['untrusted peer ignores XFF', '203.0.113.5', '198.51.100.1', '203.0.113.5'],
      ['trusted peer uses the forwarded client', '10.1.2.3', '198.51.100.1', '198.51.100.1'],
      ['chain stops at the first untrusted hop', '127.0.0.1', '198.51.100.1, 203.0.113.9, 10.0.0.7', '203.0.113.9'],
      ['IPv4-mapped peer is normalised', '::ffff:127.0.0.1', '198.51.100.2', '198.51.100.2'],
      ['garbage hop falls back to the nearest trusted hop', '10.0.0.1', 'not-an-ip', '10.0.0.1'],
    ])('%s', (_n, peer, xff, expected) => {
      expect(resolveClientIp(peer, xff, proxies)).toBe(expected);
    });

    it('with no trusted proxies, spoofed X-Forwarded-For does not change the rate-limit key', async () => {
      for (let i = 0; i < 30; i++) await login(h, `spoof${i}@test.therabridge.test`, 'not-the-password-123', `198.51.100.${i}`);
      expect((await login(h, 'spoof-x@test.therabridge.test', 'nope-nope-nope', '198.51.100.250')).status).toBe(429);
    });

    it('behind a trusted proxy, limits apply per forwarded client', async () => {
      const proxied = await makeApp({ TRUSTED_PROXY_CIDRS: '127.0.0.1/32,::1/128' }, h.clock);
      try {
        for (let i = 0; i < 30; i++) await login(proxied, `p${i}@test.therabridge.test`, 'not-the-password-123', '198.51.100.7');
        expect((await login(proxied, 'p-x@test.therabridge.test', 'nope-nope-nope', '198.51.100.7')).status).toBe(429);
        expect((await login(proxied, 'p-y@test.therabridge.test', 'nope-nope-nope', '198.51.100.8')).status).toBe(401);
      } finally {
        await proxied.close();
      }
    });

    it('stores only truncated IP prefixes', () => {
      expect(ipPrefix('198.51.100.77')).toBe('198.51.100.0/24');
      expect(ipPrefix('2001:db8:abcd:12::1')).toBe('2001:db8:abcd::/48');
    });
  });

  describe('AC-19/20 recovery, audit, dev mailbox', () => {
    it('forgot always returns 202 and the dev mailbox is 404 outside local', async () => {
      const p = await preAuth(h);
      const res = await h.http().post('/api/auth/password/forgot').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token)
        .send({ email: 'nobody@test.therabridge.test' }).expect(202);
      expect(res.body.status).toBe('accepted');
      await h.http().get('/api/dev/mailbox').expect(404);
    });

    it('M4-05: throttles password recovery by origin without leaking account existence or locking the target', async () => {
      const u = await createUser(h.prisma);
      const request = async (email: string, ip: string) => {
        const p = await preAuth(h);
        return h.http().post('/api/auth/password/forgot')
          .set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token)
          .set('X-Forwarded-For', ip).send({ email });
      };
      const first = await request(u.email, '198.51.100.42');
      expect(first.status).toBe(202);
      const anonymous = await request('not-registered@test.therabridge.test', '198.51.100.42');
      expect(anonymous.status).toBe(202);
      expect(anonymous.body).toEqual(first.body);
      for (let i = 0; i < 14; i++) {
        expect((await request(u.email, '198.51.100.42')).status).toBe(202);
      }
      // Even many denied requests must produce one threshold-crossing audit
      // event rather than unbounded append-only audit amplification.
      expect(await h.prisma.auditEvent.count({ where: { type: 'auth.password.reset_rate_limited' } })).toBe(1);
      // Never lock the target account because another origin consumed its own budget.
      expect((await login(h, u.email)).status).toBe(200);
      expect(await h.prisma.authLockout.count()).toBe(0);
    });

    it('reset is single-use, hash-only, expires in 30 minutes and revokes sessions', async () => {
      const local = await makeApp({ DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' }, h.clock);
      try {
        const u = await createUser(local.prisma);
        const s = await signIn(local, u.email);
        const requestReset = async () => {
          const p = await preAuth(local);
          await local.http().post('/api/auth/password/forgot').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send({ email: u.email }).expect(202);
          const mail = await local.http().get('/api/dev/mailbox').expect(200);
          return /#token=([A-Za-z0-9_-]+)/.exec(mail.body.messages[0].body)![1];
        };
        const reset = async (token: string, password: string) => {
          const p = await preAuth(local);
          return local.http().post('/api/auth/password/reset').set('Origin', ORIGIN).set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send({ token, password });
        };
        const token = await requestReset();
        // The locked origin must be able to recover through its valid token;
        // password reset clears all account-specific origin lock records.
        for (let i = 0; i < ACCOUNT_LIMIT; i++) {
          expect((await login(local, u.email, 'wrong-before-reset-123')).status).toBe(401);
        }
        expect((await login(local, u.email)).status).toBe(401);
        expect(JSON.stringify(await local.prisma.verificationToken.findMany())).not.toContain(token);
        expect(dumpJson(await local.prisma.auditEvent.findMany())).not.toContain(token);
        expect((await reset(token, 'Brand-New-Synthetic-Pass-1')).status).toBe(204);
        await local.http().get('/api/auth/session').set('Cookie', s.cookie).expect(401);
        expect((await reset(token, 'Another-Synthetic-Pass-2')).status).toBe(422);
        expect((await login(local, u.email, 'Brand-New-Synthetic-Pass-1')).status).toBe(200);
        const late = await requestReset();
        local.clock.advance(31 * MIN);
        expect((await reset(late, 'Late-Synthetic-Pass-333')).status).toBe(422);
      } finally {
        await local.close();
      }
    });

    it('M4-05: audit failure rolls back token claim, password, session revocation and origin lockout cleanup', async () => {
      const local = await makeApp({ DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' }, h.clock);
      try {
        const user = await createUser(local.prisma);
        const signed = await signIn(local, user.email);
        const originalIdentity = await local.prisma.authIdentity.findUniqueOrThrow({
          where: { userId_provider: { userId: user.id, provider: 'local' } },
        });
        const p = await preAuth(local);
        await local.http().post('/api/auth/password/forgot').set('Origin', ORIGIN)
          .set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send({ email: user.email }).expect(202);
        const mailbox = await local.http().get('/api/dev/mailbox').expect(200);
        const token = /#token=([A-Za-z0-9_-]+)/.exec(mailbox.body.messages[0].body)![1];
        for (let i = 0; i < ACCOUNT_LIMIT; i++) {
          expect((await login(local, user.email, 'fault-test-incorrect-password')).status).toBe(401);
        }
        const replacement = ['Atomic', 'Reset', 'Synthetic', 'Password', '1'].join('-');
        const beforeLocks = await local.prisma.authLockout.count();
        expect(beforeLocks).toBeGreaterThan(0);
        // This trigger models a database failure at the LAST write in the
        // transaction. Before the fix it stranded a used token and revoked
        // session, but now every preceding write must roll back atomically.
        await local.prisma.$executeRawUnsafe(`CREATE FUNCTION m4_reset_fault_injection() RETURNS trigger LANGUAGE plpgsql AS $m4reset$
          BEGIN IF NEW.type = 'auth.password.reset_completed' THEN
            RAISE EXCEPTION 'synthetic audit fault injection'; END IF;
          RETURN NEW; END $m4reset$;`);
        await local.prisma.$executeRawUnsafe(`CREATE TRIGGER m4_reset_fault_injection
          BEFORE INSERT ON audit_event FOR EACH ROW EXECUTE FUNCTION m4_reset_fault_injection();`);
        try {
          const q = await preAuth(local);
          const failed = await local.http().post('/api/auth/password/reset')
            .set('Origin', ORIGIN).set('Cookie', q.cookie).set('X-CSRF-Token', q.token)
            .send({ token, password: replacement });
          expect(failed.status).toBe(500);
        } finally {
          await local.prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS m4_reset_fault_injection ON audit_event');
          await local.prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS m4_reset_fault_injection()');
        }
        const stored = await local.prisma.verificationToken.findUniqueOrThrow({
          where: { tokenHash: sha256(token) },
        });
        expect(stored.usedAt).toBeNull();
        const identity = await local.prisma.authIdentity.findUniqueOrThrow({
          where: { userId_provider: { userId: user.id, provider: 'local' } },
        });
        expect(identity.passwordHash).toBe(originalIdentity.passwordHash);
        expect(await local.prisma.authLockout.count()).toBe(beforeLocks);
        await local.http().get('/api/auth/session').set('Cookie', signed.cookie).expect(200);
        const again = await preAuth(local);
        await local.http().post('/api/auth/password/reset').set('Origin', ORIGIN)
          .set('Cookie', again.cookie).set('X-CSRF-Token', again.token)
          .send({ token, password: replacement }).expect(204);
        await local.http().get('/api/auth/session').set('Cookie', signed.cookie).expect(401);
        expect(await local.prisma.authLockout.count()).toBe(0);
        expect((await login(local, user.email, replacement)).status).toBe(200);
        expect(await local.prisma.auditEvent.count({ where: { type: 'auth.password.reset_completed' } })).toBe(1);
      } finally {
        await local.close();
      }
    });

    it.each([
      ['credential update', 'auth_identity', 'UPDATE'],
      ['session revocation', 'session', 'UPDATE'],
    ] as const)('M4-05: %s database failure preserves reset token and allows safe retry', async (_label, table, operation) => {
      const local = await makeApp({ DEPLOYMENT_ENV: 'local', DEV_MAILBOX_ENABLED: 'true' }, h.clock);
      try {
        const user = await createUser(local.prisma);
        const signed = await signIn(local, user.email);
        const before = await local.prisma.authIdentity.findUniqueOrThrow({
          where: { userId_provider: { userId: user.id, provider: 'local' } },
        });
        const p = await preAuth(local);
        await local.http().post('/api/auth/password/forgot').set('Origin', ORIGIN)
          .set('Cookie', p.cookie).set('X-CSRF-Token', p.token).send({ email: user.email }).expect(202);
        const mailbox = await local.http().get('/api/dev/mailbox').expect(200);
        const token = /#token=([A-Za-z0-9_-]+)/.exec(mailbox.body.messages[0].body)![1];
        const nextPassword = 'Synthetic-Atomic-Boundary-Test-123';
        // Both table and operation are fixed test literals, not user input.
        await local.prisma.$executeRawUnsafe(`CREATE FUNCTION m4_reset_early_fault() RETURNS trigger LANGUAGE plpgsql AS $m4early$
          BEGIN RAISE EXCEPTION 'synthetic reset boundary fault'; END $m4early$;`);
        await local.prisma.$executeRawUnsafe(`CREATE TRIGGER m4_reset_early_fault
          BEFORE ${operation} ON ${table} FOR EACH ROW EXECUTE FUNCTION m4_reset_early_fault();`);
        try {
          const q = await preAuth(local);
          await local.http().post('/api/auth/password/reset').set('Origin', ORIGIN)
            .set('Cookie', q.cookie).set('X-CSRF-Token', q.token)
            .send({ token, password: nextPassword }).expect(500);
        } finally {
          await local.prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS m4_reset_early_fault ON ${table}`);
          await local.prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS m4_reset_early_fault()');
        }
        expect((await local.prisma.verificationToken.findUniqueOrThrow({
          where: { tokenHash: sha256(token) },
        })).usedAt).toBeNull();
        expect((await local.prisma.authIdentity.findUniqueOrThrow({
          where: { userId_provider: { userId: user.id, provider: 'local' } },
        })).passwordHash).toBe(before.passwordHash);
        await local.http().get('/api/auth/session').set('Cookie', signed.cookie).expect(200);
        const retry = await preAuth(local);
        await local.http().post('/api/auth/password/reset').set('Origin', ORIGIN)
          .set('Cookie', retry.cookie).set('X-CSRF-Token', retry.token)
          .send({ token, password: nextPassword }).expect(204);
        await local.http().get('/api/auth/session').set('Cookie', signed.cookie).expect(401);
        expect((await login(local, user.email, nextPassword)).status).toBe(200);
        const replay = await preAuth(local);
        await local.http().post('/api/auth/password/reset').set('Origin', ORIGIN)
          .set('Cookie', replay.cookie).set('X-CSRF-Token', replay.token)
          .send({ token, password: nextPassword }).expect(422);
      } finally {
        await local.close();
      }
    });

    it('writes audit events for the auth lifecycle without secrets', async () => {
      const u = await createUser(h.prisma);
      await login(h, u.email, 'not-the-password-123');
      const s = await signIn(h, u.email);
      await post(h, '/api/auth/logout', s).expect(204);
      const events = await h.prisma.auditEvent.findMany();
      const types = events.map((e) => e.type);
      expect(types).toEqual(expect.arrayContaining(['auth.login.failure', 'auth.login.success', 'auth.logout']));
      const dump = JSON.stringify(events, (_k, v) => (typeof v === 'bigint' ? Number(v) : v));
      expect(dump).not.toContain(PASSWORD);
      expect(dump).not.toContain('not-the-password-123');
      expect(dump).not.toContain(s.token);
      expect(dump).not.toMatch(/127\.0\.0\.1"/);
    });
  });

  describe('password policy', () => {
    it.each([
      ['short', 'Short-1', /12 characters/],
      ['common', 'Password1234', /too common/],
      ['contains email name', 'leila.hassan-is-great', /email name/],
      ['too long', 'a'.repeat(129), /at most 128/],
    ])('rejects %s', (_n, pw, msg) => {
      expect(passwordPolicyError(pw, 'leila.hassan@harbor.therabridge.test')).toMatch(msg);
    });
    it('accepts a long passphrase', () => {
      expect(passwordPolicyError('calm harbor morning tide', 'x@y.test')).toBeNull();
    });
  });
});

export {};
void FakeClock;
