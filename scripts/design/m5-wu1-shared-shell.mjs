/**
 * M5 WU1 — actual seven-role × five-width shared-shell browser qualification.
 * Executes only in isolated synthetic CI as part of the pre-existing real
 * browser audit; this is NOT visual/assistive-technology/owner acceptance.
 * No screenshots, session cookies, user names or DOM text enter this receipt.
 */
import assert from 'node:assert/strict';
import { PERSONAS, VIEWPORTS } from '../qa/m5-route-audit.mjs';
import { contrastRatio } from './m5-shared-guardian-browser.mjs';

const ROLES = new Set(PERSONAS.map(persona => persona.id));
const WIDTHS = new Set(VIEWPORTS);
const OUTPUT = '/tmp/therabridge-m5-wu1-cross-screen-shell.json';
const REQUIRED = Object.freeze([
  'persona', 'width', 'route', 'theme', 'surfaces', 'contrast',
  'overflow', 'keyboard', 'mobileDrawer', 'desktopRail', 'persisted',
]);
const exact = (object, keys) =>
  object !== null && typeof object === 'object' && !Array.isArray(object) &&
  Object.getPrototypeOf(object) === Object.prototype &&
  Reflect.ownKeys(object).length === keys.length &&
  keys.every(key => Object.hasOwn(object, key));

export function validateSharedShellReceipt(receipt) {
  if (!exact(receipt, ['schemaVersion','environment','evidenceType','governance','summary','observations']) ||
      receipt.schemaVersion !== 1 || receipt.environment !== 'ISOLATED_SYNTHETIC_CI' ||
      receipt.evidenceType !== 'AUTOMATED_ROLE_SHELL_NOT_HUMAN_ACCESSIBILITY' ||
      !exact(receipt.governance, ['clinicalGate','screenReaderManual','ownerSignoff','realUsability']) ||
      receipt.governance.clinicalGate !== 'NO_GO_G2_G2b' ||
      receipt.governance.screenReaderManual !== 'NOT_RUN' ||
      receipt.governance.ownerSignoff !== 'NOT_OBTAINED' ||
      receipt.governance.realUsability !== 'NOT_RUN' ||
      !exact(receipt.summary, ['observations','failed','screenshotsArchived']) ||
      receipt.summary.observations !== PERSONAS.length * VIEWPORTS.length ||
      receipt.summary.failed !== 0 || receipt.summary.screenshotsArchived !== 0 ||
      !Array.isArray(receipt.observations) ||
      receipt.observations.length !== PERSONAS.length * VIEWPORTS.length) {
    throw new Error('Missing or falsely qualified WU1 role-shell browser evidence');
  }
  const seen = new Set();
  for (const record of receipt.observations) {
    if (!exact(record, REQUIRED) || typeof record.persona !== 'string' ||
        !ROLES.has(record.persona) || typeof record.width !== 'number' ||
        !Number.isInteger(record.width) || !WIDTHS.has(record.width) ||
        record.route !== '/app' || record.theme !== 'LIGHT_AND_DARK_VERIFIED' ||
        record.surfaces !== 'PASS' || record.contrast !== 'PASS' ||
        record.overflow !== 'NONE' || record.keyboard !== 'PASS' ||
        record.mobileDrawer !== (record.width < 768 ? 'PASS' : 'NOT_APPLICABLE') ||
        record.desktopRail !== (record.width >= 768 ? 'PASS' : 'NOT_APPLICABLE') ||
        record.persisted !== (record.width === 390 ? 'PASS' : 'NOT_APPLICABLE')) {
      throw new Error('Unknown, incomplete, sensitive or failed WU1 shell observation');
    }
    const key = record.persona + ':' + record.width;
    if (seen.has(key)) throw new Error('Duplicate WU1 role/viewport observation');
    seen.add(key);
  }
  if (seen.size !== PERSONAS.length * VIEWPORTS.length)
    throw new Error('Incomplete WU1 role and viewport evidence');
  return true;
}

export function buildSharedShellReceipt(observations) {
  const receipt = {
    schemaVersion: 1, environment: 'ISOLATED_SYNTHETIC_CI',
    evidenceType: 'AUTOMATED_ROLE_SHELL_NOT_HUMAN_ACCESSIBILITY',
    governance: {clinicalGate: 'NO_GO_G2_G2b',screenReaderManual: 'NOT_RUN',
      ownerSignoff: 'NOT_OBTAINED', realUsability: 'NOT_RUN'},
    summary: {observations: observations.length, failed: 0, screenshotsArchived: 0},
    observations,
  };
  validateSharedShellReceipt(receipt);
  return receipt;
}

async function apply(page, theme) {
  const toggle = page.getByTestId('app-theme-toggle');
  const pressed = theme === 'dark' ? 'true' : 'false';
  if (await toggle.getAttribute('aria-pressed') !== pressed) await toggle.click();
  await page.waitForFunction(expected => {
    const root = document.documentElement.dataset;
    const shell = document.querySelector('[data-testid="product-shell"]');
    // With no stored preference, the prepaint bootstrap legitimately leaves
    // attributes unset and the shell defaults to light. A toggled dark value
    // MUST be explicit in both dataset slots.
    return (root.appTheme ?? 'light') === expected &&
      (root.familyTheme ?? 'light') === expected &&
      shell?.getAttribute('data-theme') === expected;
  }, theme, { timeout: 7000, polling: 100 });
  return page.evaluate(() => {
    const get = id => document.querySelector('[data-testid="' + id + '"]');
    const shell = get('product-shell');
    const header = get('product-top-bar');
    const nav = window.innerWidth < 768 ? get('mobile-nav') : get('product-sidebar');
    const visible = element => Boolean(element && element.getClientRects().length);
    if (!visible(shell) || !visible(header) || !visible(nav))
      throw Error('Shared shell header/navigation absent in selected viewport');
    const style = element => getComputedStyle(element);
    return {
      headerBackground: style(header).backgroundColor,
      headerForeground: style(header).color,
      navBackground: style(nav).backgroundColor,
      navForeground: style(nav).color,
      canvasBackground: style(shell).backgroundColor,
      // Non-identifying computed design-token diagnostics. Never DOM text.
      semanticSurfaceRgb: style(shell).getPropertyValue('--tb-rgb-surface-white').trim(),
      semanticSurfaceHex: style(shell).getPropertyValue('--tb-surface-white').trim(),
      matchedDarkRule: document.documentElement.matches('[data-app-theme="dark"]') &&
        shell.matches('.theme-clinical-auto, .theme-family-auto'),
      mainCount: document.querySelectorAll('main#main').length,
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    };
  });
}

export async function observeSharedShell(page, persona, width) {
  assert(ROLES.has(persona) && WIDTHS.has(width), 'Unknown role or viewport');
  assert.equal(new URL(page.url()).pathname, '/app', 'WU1 shell requires exact authorized home route');
  const light = await apply(page, 'light');
  const dark = await apply(page, 'dark');
  for (const observed of [light, dark]) {
    assert.equal(observed.viewport, width, 'Incorrect measured viewport');
    assert.equal(observed.mainCount, 1, 'Exactly one accessible main landmark');
    assert(observed.document <= width + 1, 'Shared shell creates horizontal overflow');
    assert(contrastRatio(observed.headerForeground, observed.headerBackground) >= 4.5,
      'Shared header text insufficient contrast');
    assert(contrastRatio(observed.navForeground, observed.navBackground) >= 4.5,
      'Shared navigation text insufficient contrast');
  }
  for (const key of ['headerBackground','navBackground','canvasBackground']) {
    assert.notEqual(light[key], dark[key],
      'Theme switch failed to recolor shared shell ' + key +
      '; light=' + JSON.stringify({
        surfaceRgb:light.semanticSurfaceRgb,surfaceHex:light.semanticSurfaceHex,
        darkSelector:light.matchedDarkRule,header:light.headerBackground,canvas:light.canvasBackground,
      }) + '; dark=' + JSON.stringify({
        surfaceRgb:dark.semanticSurfaceRgb,surfaceHex:dark.semanticSurfaceHex,
        darkSelector:dark.matchedDarkRule,header:dark.headerBackground,canvas:dark.canvasBackground,
      }));
  }
  const toggle = page.getByTestId('app-theme-toggle');
  await toggle.focus();
  assert(await toggle.evaluate(element => document.activeElement === element),
    'Theme control not keyboard focusable');

  if (width < 768) {
    const button = page.getByTestId('mobile-more-button');
    assert.equal(await button.getAttribute('aria-haspopup'), 'dialog');
    await button.click();
    const sheet = page.getByTestId('mobile-more-sheet');
    await sheet.waitFor({state: 'visible'});
    const modal = page.getByRole('dialog', {name: 'All navigation'});
    assert.equal(await modal.getAttribute('aria-modal'), 'true');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-testid') ===
      'mobile-more-close', null, {timeout: 5000});
    // Real keyboard-only dialog exit and return to the original invoker.
    await page.keyboard.press('Escape');
    await sheet.waitFor({state: 'detached'});
    assert(await button.evaluate(element => document.activeElement === element),
      'Mobile More must restore keyboard focus after Escape');
    // React cleans up the scroll lock in an effect after the dialog unmount.
    // Observe the real unlock without racing a queued passive cleanup effect.
    await page.waitForFunction(() =>
      document.body.style.overflow !== 'hidden' &&
      document.documentElement.style.overflow !== 'hidden',
      null, {timeout:5000,polling:100});
  } else {
    const rail = page.getByTestId('sidebar-collapse-toggle');
    await rail.click();
    assert.equal(await rail.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.getByTestId('product-sidebar').getAttribute('data-collapsed'), 'true');
    await rail.click();
    assert.equal(await rail.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.getByTestId('product-sidebar').getAttribute('data-collapsed'), 'false');
  }
  if (width === 390) {
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.getByTestId('product-shell').waitFor({state:'visible',timeout:12000});
    await page.waitForFunction(() =>
      document.documentElement.dataset.appTheme === 'dark' &&
      document.documentElement.dataset.familyTheme === 'dark' &&
      document.querySelector('[data-testid="product-shell"]')?.getAttribute('data-theme') === 'dark',
      null, {timeout:7000,polling:100});
  }
  return {persona,width,route:'/app',theme:'LIGHT_AND_DARK_VERIFIED',
    surfaces:'PASS',contrast:'PASS',overflow:'NONE',keyboard:'PASS',
    mobileDrawer:width<768?'PASS':'NOT_APPLICABLE',
    desktopRail:width>=768?'PASS':'NOT_APPLICABLE',
    persisted:width===390?'PASS':'NOT_APPLICABLE'};
}

export const SHARED_SHELL_OUTPUT = OUTPUT;
