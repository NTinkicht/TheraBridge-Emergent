/**
 * M5 WU2 isolated-browser route qualification (M5-06/07/08), not human usability
 * approval. Do not save screenshots, clinical text, names, cookies or credentials.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { observeSettledPage } from './m5-browser-observe.mjs';

export const WU2_WIDTHS = Object.freeze([320, 390, 768, 1024, 1440]);
const BASE = 'http://127.0.0.1:3000';
const WORKSPACES = Object.freeze([
  { persona: 'speech-therapist', role: 'THERAPIST',
    email: 'speech@childrens-home.therabridge.test', path: '/app/clinical',
    markers: ['clinical-title', 'clinical-caseload-filters', 'm5-therapist-workspace'] },
  { persona: 'coordinator', role: 'COORDINATOR',
    email: 'coordinator@childrens-home.therabridge.test', path: '/app/schedule',
    markers: ['schedule-title', 'm5-operations-summary', 'schedule-timezone-notice'] },
  { persona: 'supervisor', role: 'CLINICAL_SUPERVISOR',
    email: 'supervisor@childrens-home.therabridge.test', path: '/app/governance',
    markers: ['governance-title', 'm5-governance-filters', 'governance-document-search'] },
]);

export function validateWU2Receipt(receipt) {
  const expected = new Set(WORKSPACES.flatMap(r =>
    WU2_WIDTHS.map(width => `${r.persona}|${width}|${r.path}`)));
  if (receipt?.schemaVersion !== 1 || receipt?.environment !== 'ISOLATED_SYNTHETIC_CI' ||
      receipt?.evidenceType !== 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY' ||
      receipt?.governance?.clinicalGate !== 'NO_GO_G2_G2b' ||
      receipt?.governance?.humanApproval !== 'NOT_OBTAINED' ||
      receipt?.governance?.accessibilityApproval !== 'NOT_OBTAINED' ||
      receipt?.governance?.realTaskTiming !== 'NOT_RUN' ||
      !Array.isArray(receipt.observations) || receipt.observations.length !== expected.size ||
      receipt.summary?.observations !== expected.size ||
      receipt.summary?.failed !== 0 ||
      receipt.summary?.screenshotsArchived !== 0) {
    throw new Error('WU2 synthetic browser evidence missing, incomplete or falsely approved');
  }
  const seen = new Set();
  for (const item of receipt.observations) {
    const key = `${item.persona}|${item.width}|${item.route}`;
    if (!expected.has(key) || seen.has(key) ||
        item.outcome !== 'ROUTE_RENDERED' || item.overflow !== 'NONE' ||
        item.keyboardSkip !== 'PASS' || item.roleVerified !== 'PASS' ||
        !/^[a-f0-9]{64}$/.test(item.screenshotSha256) ||
        Object.keys(item).some(k => /password|cookie|token|email|user|child|content|text|html|name/i.test(k))) {
      throw new Error('Unknown, sensitive or failed WU2 browser observation');
    }
    seen.add(key);
  }
  if (seen.size !== expected.size) throw new Error('Missing WU2 viewport/role scenario');
  return true;
}

export async function runWU2BrowserQualification({ passwords, output }) {
  const db = new URL(process.env.DATABASE_URL || '');
  if (process.env.DEPLOYMENT_ENV !== 'ci' ||
      !['localhost', '127.0.0.1'].includes(db.hostname) ||
      !db.pathname.endsWith('_demo_test') ||
      !WORKSPACES.every(r => typeof passwords?.[r.email] === 'string') ||
      output !== '/tmp/therabridge-m5-wu2-browser-qualification.json') {
    throw new Error('WU2 browser qualification requires isolated loopback CI and ephemeral synthetic credentials');
  }
  const observations = [];
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  try {
    for (const persona of WORKSPACES) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 850 }, reducedMotion: 'reduce',
      });
      try {
        const page = await context.newPage();
        await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
        await page.getByTestId('login-email-input').fill(persona.email);
        await page.getByTestId('login-password-input').fill(passwords[persona.email]);
        await page.getByTestId('login-submit-button').click();
        await page.waitForURL(/\/app(?:\/|$)/, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const actual = await page.evaluate(async () => {
          const response = await fetch('/api/auth/session', { credentials: 'include' });
          if (!response.ok) throw Error('Session not authorized');
          return (await response.json()).activeContext?.role ?? null;
        });
        assert.equal(actual, persona.role, 'WU2 synthetic role mismatch');
        for (const width of WU2_WIDTHS) {
          await page.setViewportSize({ width, height: 850 });
          const res = await page.goto(BASE + persona.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
          assert(res?.ok(), 'WU2 route HTTP failure');
          const state = await observeSettledPage(page);
          assert.equal(state.error || state.denied || state.timedOut, false, 'WU2 page not settled');
          for (const marker of persona.markers) {
            await page.getByTestId(marker).waitFor({ state: 'visible', timeout: 10000 });
          }
          // The keyboard skip link is reachable before guarded clinical content.
          const skip = page.getByTestId('skip-to-main');
          await skip.focus();
          await page.keyboard.press('Enter');
          const keyboardSkip = await page.evaluate(() =>
            location.hash === '#main' && document.getElementById('main') !== null);
          assert(keyboardSkip, 'WU2 keyboard skip link failed');
          const dimensions = await page.evaluate(() => ({
            document: document.documentElement.scrollWidth,
            viewport: window.innerWidth,
            main: document.querySelectorAll('main#main').length,
          }));
          assert.equal(dimensions.main, 1, 'Exactly one main landmark');
          assert(dimensions.document <= dimensions.viewport + 1,
            'WU2 horizontal overflow at ' + width + 'px');
          if (persona.role === 'CLINICAL_SUPERVISOR') {
            assert.equal(await page.locator('[data-testid^="family-message-thread"]').count(), 0,
              'Supervisor family conversation cannot be exposed');
          }
          // Full-size screenshots are immediately hashed, never written to
          // disk or uploaded; the numeric-only evidence is safe to archive.
          const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
          observations.push({
            persona: persona.persona, width, route: persona.path,
            outcome: 'ROUTE_RENDERED', overflow: 'NONE',
            keyboardSkip: 'PASS', roleVerified: 'PASS',
            screenshotSha256: createHash('sha256').update(screenshot).digest('hex'),
          });
        }
      } finally { await context.close(); }
    }
    const receipt = {
      schemaVersion: 1, environment: 'ISOLATED_SYNTHETIC_CI',
      evidenceType: 'AUTOMATED_BROWSER_NOT_HUMAN_USABILITY',
      governance: {
        clinicalGate: 'NO_GO_G2_G2b',
        humanApproval: 'NOT_OBTAINED',
        accessibilityApproval: 'NOT_OBTAINED',
        realTaskTiming: 'NOT_RUN',
      },
      summary: { observations: observations.length, failed: 0, screenshotsArchived: 0 },
      observations,
    };
    validateWU2Receipt(receipt);
    await writeFile(output, JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
    console.log('WU2 synthetic browser qualification:', JSON.stringify(receipt.summary));
    return receipt;
  } finally { await browser.close(); }
}
