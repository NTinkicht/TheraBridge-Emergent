import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

// Exercise actual TypeScript functions in Node without introducing an unsupported web Jest stack.
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const loadTs = (path, modules = {}) => {
  const script = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: path,
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', script)(key => {
    if (!(key in modules)) throw Error('Unexpected dependency: ' + key);
    return modules[key];
  }, mod, mod.exports);
  return mod.exports;
};

const ops = loadTs('apps/web/src/lib/operations.ts', { './auth': { rest: {} } });
const api = loadTs('apps/web/src/lib/api.ts');

test('M2-H06 #127: actual clinical center time round-trips independently of browser zone', () => {
  const source = '2026-05-10T06:00:00.000Z';
  const display = ops.formatZonedDateTimeInput(source, 'Asia/Dubai');
  assert.equal(display, '2026-05-10T10:00');
  assert.equal(ops.zonedDateTimeInputToIso(display, 'Asia/Dubai'), source);
  assert.equal(ops.formatZonedDateTimeInput('2026-05-10T06:00:37.000Z', 'Asia/Dubai', true), '2026-05-10T10:00:37');
  assert.equal(ops.zonedDateTimeInputToIso('2026-05-10T10:00:37', 'Asia/Dubai'), '2026-05-10T06:00:37.000Z');
  assert.equal(ops.formatZonedDateTimeInput(source, 'Europe/Paris'), '2026-05-10T08:00');
  assert.equal(ops.zonedDateTimeInputToIso('2026-05-10T08:00', 'Europe/Paris'), source);
  ops.setCenterTz('Asia/Dubai');
  assert.equal(ops.zonedToUtc('2026-05-10', '10:00').toISOString(), source);
  ops.setCenterTz(undefined);
  assert.throws(() => ops.zonedToUtc('2026-05-10', '10:00'), /timezone is unavailable/i);
});

test('M2-H06 #127: repeated Paris DST hour picks later offset', () => {
  assert.equal(ops.zonedDateTimeInputToIso('2026-10-25T02:30', 'Europe/Paris'), '2026-10-25T01:30:00.000Z');
});

test('M2-H06 Codex P2: an unchanged end keeps its first DST-overlap offset', () => {
  const original = '2026-10-25T00:30:37.000Z';
  const visible = ops.formatZonedDateTimeInput(original, 'Europe/Paris', true);
  assert.equal(visible, '2026-10-25T02:30:37');
  assert.equal(ops.preservedZonedInstant(visible, original, 'Europe/Paris'), original);
  assert.equal(ops.preservedZonedInstant('2026-10-25T03:30:37', original, 'Europe/Paris'), '2026-10-25T02:30:37.000Z');
});

test('M2-H06 Codex P2: spring-forward nonexistent center time is rejected', () => {
  assert.throws(() => ops.zonedDateTimeInputToIso('2026-03-29T02:30', 'Europe/Paris'), /does not exist/);
  assert.throws(() => ops.preservedZonedInstant('2026-03-29T02:30:00', null, 'Europe/Paris'), /does not exist/);
});

test('M2-H06 #128: machine-readable code does not obscure existing API error details', () => {
  const error = new api.ApiError(409, 'Conflicting version', { code: 'HANDOVER_VERSION_CONFLICT', details: { currentVersion: 3 } });
  assert.equal(error.code, 'HANDOVER_VERSION_CONFLICT');
  assert.equal(error.details.details.currentVersion, 3);
  assert.equal(error.status, 409);
});

test('M2-H06 #127/#128: 401 clears stale CSRF and alerts the shared session listener', async () => {
  const auth = loadTs('apps/web/src/lib/auth.ts', { './api': api });
  const originalFetch = globalThis.fetch;
  const requests = [];
  let firstMutation = true;
  let alerts = 0;
  const json = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
  globalThis.fetch = async (path, options) => {
    requests.push({ path, options });
    if (path === '/api/auth/csrf') return json(200, { csrfToken: 'pre-login' });
    if (path === '/api/auth/login') return json(200, {
      csrfToken: 'new-session', user: { id: 'u', email: 'a@b.test', displayName: 'test' },
      contexts: [], activeContext: null, permissions: [], session: { idleExpiresAt: '', absoluteExpiresAt: '' },
    });
    if (firstMutation) { firstMutation = false; return json(401, { code: 'UNAUTHORIZED', message: 'Expired' }); }
    return json(200, { ok: true });
  };
  const off = auth.onUnauthorized(() => { alerts++; });
  try {
    auth.rest.remember({ csrfToken: 'expired-token' });
    await assert.rejects(auth.rest.send('POST', '/api/test/mutate', { id: 1 }), e => e instanceof api.ApiError && e.status === 401);
    assert.equal(alerts, 1);
    await auth.rest.send('POST', '/api/test/mutate', { id: 2 });
    assert.equal(requests.at(-1).options.headers['X-CSRF-Token'], undefined);
    await auth.authApi.login('synthetic@example.test', 'not-a-secret');
    await auth.rest.send('POST', '/api/test/mutate', { id: 3 });
    assert.equal(requests.at(-1).options.headers['X-CSRF-Token'], 'new-session');
  } finally { off(); globalThis.fetch = originalFetch; }
});

test('M2-H06 #129: cross-route session provider and disabled messaging fail closed', () => {
  assert.match(read('apps/web/src/app/app/layout.tsx'), /AppSessionProvider/);
  assert.match(read('apps/web/src/components/auth/useSession.ts'), /useSharedSession/);
  assert.doesNotMatch(read('apps/web/src/app/app/children/[id]/page.tsx'), /listMessages\s*\(/);
  assert.match(read('apps/web/src/app/app/messages/page.tsx'), /never invokes the disabled thread API/);
});

test('M2-H06 #130: Next.js response headers and existing diagnostics route gates', async () => {
  const config = (await import('../../apps/web/next.config.mjs')).default;
  const entries = await config.headers();
  const h = Object.fromEntries(entries.flatMap(e => e.headers.map(x => [x.key, x.value])));
  assert.equal(h['X-Content-Type-Options'], 'nosniff');
  assert.equal(h['X-Frame-Options'], 'DENY');
  assert.equal(h['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(h['Permissions-Policy'], /microphone=\(\)/);
  assert.match(read('apps/web/src/app/dev/feasibility/page.tsx'), /ENABLE_FEASIBILITY_DIAGNOSTICS.*true/);
  assert.match(read('apps/web/src/app/dev/feasibility/page.tsx'), /notFound\(\)/);
  for (const name of ['error.tsx', 'global-error.tsx', 'not-found.tsx']) {
    assert.match(read('apps/web/src/app/' + name), /role="alert"/);
  }
});

test('Next image optimizer stays disabled and release images never ship sharp/libvips', async () => {
  const config = (await import('../../apps/web/next.config.mjs')).default;
  assert.equal(config.images?.unoptimized, true);
  // Re-enabling optimization requires next/image usage review and a counsel decision on LGPL libvips.
  const { spawnSync } = await import('node:child_process');
  const src = new URL('../../apps/web/src', import.meta.url).pathname;
  const grep = spawnSync('grep', ['-rlE', "from ['\"]next/(legacy/)?image['\"]", src], { encoding: 'utf8' });
  assert.equal(grep.status, 1, 'next/image is imported while the optimizer is disabled: ' + grep.stdout);
  for (const dockerfile of ['Dockerfile.preview', 'apps/web/Dockerfile']) {
    // Join line continuations so each entry is one Dockerfile instruction (= one image layer).
    const instructions = read(dockerfile).replace(/\\\n/g, ' ').split('\n');
    const install = instructions.filter(x => x.includes('yarn install --frozen-lockfile'));
    assert.equal(install.length, 1, dockerfile + ' must install dependencies exactly once');
    // Removal must happen in the SAME layer as the install, or the binaries stay recoverable from it.
    assert.match(install[0], /^RUN yarn install .*-path '\*\/node_modules\/sharp' -o -path '\*\/node_modules\/@img'.*-exec rm -rf/, dockerfile);
    assert.match(install[0], /&&\s+yarn cache clean\s+&&/, dockerfile + ' must drop Yarn cached package copies in the install layer');
    assert.match(install[0], /&&\s+!\s+find \/repo "\$\(yarn cache dir\)" -type d .*\| grep -q \.$/, dockerfile + ' must fail closed if sharp/@img remain');
    assert.ok(instructions.findIndex(x => x.includes('yarn install')) < instructions.findIndex(x => x.includes('yarn workspace @therabridge/web build')), dockerfile);
  }
  // Built images are also scanned layer by layer in CI, not only the merged filesystem.
  const ci = read('.github/workflows/ci.yml');
  assert.match(ci, /check-image-no-sharp\.sh tb-synthetic-preview:ci/);
  assert.match(ci, /check-image-no-sharp\.sh "\$\(docker compose images -q web\)"/);
});
