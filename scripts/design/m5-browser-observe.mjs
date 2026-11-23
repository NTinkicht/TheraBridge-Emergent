// M5-01 browser observation on an isolated synthetic CI database.
// Distinguishes route/viewport observations from actual usability acceptance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { PERSONAS, VIEWPORTS } from '../qa/m5-route-audit.mjs';
import { observeKeyboardJourney, validateKeyboardJourneys } from './m5-keyboard-journey.mjs';
import { observeSharedShell, buildSharedShellReceipt, SHARED_SHELL_OUTPUT }
  from './m5-wu1-shared-shell.mjs';

const BASE = 'http://127.0.0.1:3000';
const ACCOUNT = Object.freeze({
  'platform-admin': 'platform.demo@childrens-home.therabridge.test',
  'center-admin': 'admin@childrens-home.therabridge.test',
  coordinator: 'coordinator@childrens-home.therabridge.test',
  'speech-therapist': 'speech@childrens-home.therabridge.test',
  'ot-therapist': 'ot@childrens-home.therabridge.test',
  supervisor: 'supervisor@childrens-home.therabridge.test',
  guardian: 'mariam.ahmed@childrens-home.therabridge.test',
});
const safe = p => /^\/[a-z0-9/_-]*$/i.test(p) && !p.includes('//');
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const noGo = { visualApproval: 'NOT_OBTAINED', accessibilityApproval: 'NOT_OBTAINED',
  realTaskTiming: 'NOT_RUN', clinicalGate: 'NO_GO_G2_G2b' };

// A successful document request is not evidence of successful client hydration.
// Explicitly wait for visible skeletons/aria-busy indicators to disappear. Keep
// ambiguous/timeout states in evidence rather than silently calling them PASS.
export async function observeSettledPage(page) {
  await page.waitForTimeout(300); // Allow first React hydration/render to establish loading state.
  let timedOut = false;
  try {
    await page.waitForFunction(() => {
      const visible = el => Boolean(el.getClientRects().length);
      return ![...document.querySelectorAll('[data-testid$="-loading"], [aria-busy="true"]')]
        .some(visible);
    }, null, { timeout: 3500, polling: 150 });
    await page.waitForTimeout(200);
    // A second settled check protects against loaders introduced by immediate effects.
    await page.waitForFunction(() => {
      const visible = el => Boolean(el.getClientRects().length);
      return ![...document.querySelectorAll('[data-testid$="-loading"], [aria-busy="true"]')]
        .some(visible);
    }, null, { timeout: 1200, polling: 150 });
  } catch (err) {
    if (err?.name !== 'TimeoutError') throw err;
    timedOut = true;
  }
  const state = await page.evaluate(() => {
    const visible = el => Boolean(el.getClientRects().length);
    const errorIds = [...document.querySelectorAll('[data-testid$="-error"]')]
      .filter(visible).filter(el => el.getAttribute('role') === 'alert' || el.querySelector('[role="alert"]'));
    return {
      error: errorIds.length > 0 || Boolean(document.querySelector('[data-testid="session-error"]')),
      denied: Boolean(document.querySelector('[data-testid="page-forbidden"]')),
      busy: [...document.querySelectorAll('[data-testid$="-loading"], [aria-busy="true"]')].some(visible),
    };
  });
  return { ...state, timedOut: timedOut || state.busy };
}

export function classifyBrowserOutcome({ route, pathname, httpStatus, state }) {
  if (state.timedOut) return 'LOAD_TIMEOUT';
  if (state.denied) return 'ROUTE_DENIED';
  if (state.error || httpStatus >= 400) return 'ERROR_STATE';
  if (pathname === '/login') return 'LOGIN_REQUIRED';
  if (pathname !== route) return 'ROUTE_REDIRECTED';
  return 'ROUTE_RENDERED';
}

export function validateBrowserReceipt(receipt) {
  if (receipt?.schemaVersion !== 1 || receipt?.environment !== 'ISOLATED_SYNTHETIC_CI' ||
      receipt?.evidenceType !== 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY' ||
      receipt?.governance?.clinicalGate !== 'NO_GO_G2_G2b' ||
      receipt?.governance?.visualApproval !== 'NOT_OBTAINED' ||
      receipt?.governance?.accessibilityApproval !== 'NOT_OBTAINED' ||
      receipt?.governance?.realTaskTiming !== 'NOT_RUN' ||
      !Array.isArray(receipt?.observations) || receipt.observations.length !== 175 ||
      !validateKeyboardJourneys(receipt.keyboardJourneys))
    throw new Error('M5 browser receipt missing or falsely approved');
  const expected = new Set(PERSONAS.flatMap(p => VIEWPORTS.flatMap(width => p.routes.map(route => [p.id, width, route].join('|')))));
  const observed = new Set();
  for (const x of receipt.observations) {
    const key = [x.persona, x.viewportWidth, x.route].join('|');
    if (!expected.has(key) || observed.has(key) || !safe(x.route)) throw new Error('Unknown or duplicate browser observation');
    observed.add(key);
    if (x.screenshotStatus !== 'CAPTURED_NOT_REVIEWED' ||
        !/^[0-9a-f]{64}$/.test(x.screenshotSha256) ||
        !Number.isFinite(x.documentWidth) || !Number.isFinite(x.viewportWidth) ||
        !Number.isInteger(x.routeSettleMs) || x.routeSettleMs < 0 || x.routeSettleMs > 30000 ||
        !['ROUTE_RENDERED', 'ROUTE_REDIRECTED', 'ERROR_STATE', 'LOGIN_REQUIRED', 'LOAD_TIMEOUT', 'ROUTE_DENIED'].includes(x.outcome) ||
        !['PRESENT', 'ABSENT'].includes(x.navigationStatus) ||
        !['PRESENT', 'ABSENT'].includes(x.mainLandmarkStatus) ||
        !['NONE', 'OBSERVED'].includes(x.horizontalOverflow))
      throw new Error('Browser observation is incomplete or claims acceptance');
    if (Object.keys(x).some(k => /cookie|password|token|email|user|text|html|clinical|content/i.test(k))) {
      throw new Error('Sensitive browser fields must not be emitted');
    }
  }
  if (observed.size !== expected.size) throw new Error('Missing browser observations');
  return true;
}

export async function runBrowserAudit({ passwords, output }) {
  const db = new URL(process.env.DATABASE_URL || '');
  if (process.env.DEPLOYMENT_ENV !== 'ci' || !['localhost', '127.0.0.1'].includes(db.hostname) ||
      !db.pathname.endsWith('_demo_test') || !output || !Object.values(ACCOUNT).every(e => typeof passwords?.[e] === 'string')) {
    throw new Error('M5-01 browser audit requires isolated synthetic loopback CI and all seven in-memory accounts');
  }
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const dir = await mkdtemp(join(tmpdir(), 'therabridge-m5-audit-'));
  const observations = [];
  const keyboardJourneys = [];
  const sharedShellObservations = [];
  try {
    for (const persona of PERSONAS) {
      const context = await browser.newContext({ viewport: { width: 390, height: 850 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        // A busy CI runner can stall the first Next.js login/hydration transition.
        // Retry the *real* sign-in once on timeout; never treat the retry itself as
        // acceptance. Both paths must reach /app and pass server session-role validation.
        let signedIn = false;
        for (let attempt = 1; attempt <= 2 && !signedIn; attempt++) {
          await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
          if (!new URL(page.url()).pathname.startsWith('/app')) {
            await page.getByTestId('login-email-input').fill(ACCOUNT[persona.id]);
            await page.getByTestId('login-password-input').fill(passwords[ACCOUNT[persona.id]]);
            await page.getByTestId('login-submit-button').click();
          }
          try {
            // Client-side navigation need not emit another full document load.
            await page.waitForFunction(() =>
              window.location.pathname === '/app' || window.location.pathname.startsWith('/app/'),
              null, { timeout: 20000, polling: 100 });
            signedIn = true;
          } catch (error) {
            if (error?.name !== 'TimeoutError' || attempt === 2) {
              throw new Error('Synthetic login route did not reach /app for ' +
                persona.id + ' after ' + attempt + ' attempt(s)', { cause: error });
            }
            // Do not log credentials, cookies, page content or clinical details.
            console.warn('Synthetic login navigation retry for ' + persona.id);
          }
        }
        const role = await page.evaluate(async () => {
          const r = await fetch('/api/auth/session', { credentials: 'include' });
          const session = await r.json();
          return session.activeContext?.role ?? null;
        });
        assert.equal(role, persona.role, 'Synthetic sign-in role mismatch for ' + persona.id);
        for (const width of VIEWPORTS) {
          await page.setViewportSize({ width, height: 850 });
          for (const route of persona.routes) {
            assert(safe(route), 'Refuse non-local or dynamic unseeded route');
            // Navigation only; do not perform clinical mutations or persist browser state.
            const pageStart = performance.now();
            const response = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
            const settled = await observeSettledPage(page);
            const routeSettleMs = Math.max(0, Math.round(performance.now() - pageStart));
            const dimensions = await page.evaluate(() => ({
              viewport: document.documentElement.clientWidth,
              document: document.documentElement.scrollWidth,
              main: Boolean(document.querySelector('main')),
              nav: Boolean(document.querySelector('[data-testid="product-sidebar"],[data-testid="mobile-nav"]')),
            }));
            const location = new URL(page.url());
            assert.equal(location.origin, BASE, 'M5 observation escaped local synthetic CI');
            const outcome = classifyBrowserOutcome({ route, pathname: location.pathname,
              httpStatus: response?.status() ?? 0, state: settled });
            const snap = await page.screenshot({ fullPage: false, animations: 'disabled' });
            // Never upload screenshots: screenshots can include synthetic family/clinical narrative.
            // Retain only digest and basic shape, and delete all transient screenshots on exit.
            const path = join(dir, persona.id + '-' + width + '-' + persona.routes.indexOf(route) + '.png');
            await writeFile(path, snap, { mode: 0o600 });
            observations.push({
              persona: persona.id, viewportWidth: width, route, outcome, routeSettleMs,
              screenshotStatus: 'CAPTURED_NOT_REVIEWED', screenshotSha256: hash(snap),
              documentWidth: dimensions.document, navigationStatus: dimensions.nav ? 'PRESENT' : 'ABSENT',
              mainLandmarkStatus: dimensions.main ? 'PRESENT' : 'ABSENT',
              horizontalOverflow: dimensions.document > dimensions.viewport + 1 ? 'OBSERVED' : 'NONE',
            });
            // The seven-role × five-width shell exercise is real browser
            // interaction, not a source assertion or a fabricated manual pass.
            if (route === '/app' && outcome === 'ROUTE_RENDERED') {
              sharedShellObservations.push(await observeSharedShell(page, persona.id, width));
            }
          }
        }
        keyboardJourneys.push(await observeKeyboardJourney(page, persona, { base: BASE, settle: observeSettledPage }));
      } finally {
        await context.close();
      }
    }
    const receipt = {
      schemaVersion: 1, environment: 'ISOLATED_SYNTHETIC_CI',
      evidenceType: 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY',
      governance: noGo,
      sourceCommit: /^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA || '') ? process.env.GITHUB_SHA : 'UNKNOWN',
      summary: {
        expectedObservations: 175, observed: observations.length,
        screenshotsArchived: 0, screenshotsReviewedByHuman: 0,
        overflowObservations: observations.filter(x => x.horizontalOverflow === 'OBSERVED').length,
        routeErrorsOrRedirects: observations.filter(x => x.outcome !== 'ROUTE_RENDERED').length,
        keyboardPersonasMeasured: keyboardJourneys.length,
        completeHumanTasksMeasured: 0,
      },
      observations, keyboardJourneys,
    };
    validateBrowserReceipt(receipt);
    const shellReceipt = buildSharedShellReceipt(sharedShellObservations);
    await writeFile(SHARED_SHELL_OUTPUT, JSON.stringify(shellReceipt, null, 2) + '\n', {mode:0o600});
    console.log('M5 WU1 real-browser seven-role shared-shell qualification:', JSON.stringify(shellReceipt.summary));
    await writeFile(output, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
    console.log('M5-01 synthetic-browser observation:', JSON.stringify(receipt.summary));
    return receipt;
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
}
