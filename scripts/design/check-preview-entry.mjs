import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.SESSION_UI_BASE_URL ?? 'http://127.0.0.1:3000';
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  const unauthenticated = await browser.newContext();
  const page = await unauthenticated.newPage();
  await page.goto(base + '/');
  assert.equal(new URL(page.url()).pathname, '/login', 'Root must redirect to login');
  await page.getByTestId('login-form').waitFor();
  assert((await page.title()).includes('TheraBridge'));
  assert(!(await page.content()).includes('Feasibility and portability gate'));
  await unauthenticated.close();

  const cookieContext = await browser.newContext();
  await cookieContext.addCookies([{ name: 'tb_session', value: 'synthetic-non-authorizing-check', url: base }]);
  const redir = await cookieContext.request.get(base + '/', { maxRedirects: 0 });
  assert.equal(redir.status(), 307);
  assert.equal(new URL(redir.headers().location, base).pathname, '/app');
  await cookieContext.close();
  console.log('PASS: root redirects to login/app, no feasibility default, correct metadata');
} finally {
  await browser.close();
}
