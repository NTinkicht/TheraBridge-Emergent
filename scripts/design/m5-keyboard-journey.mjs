/**
 * M5-01 synthetic keyboard-path instrumentation.
 * Measures three safe, narrow browser actions, not a clinical/workflow task.
 * No text, credentials, cookies, screenshots or DOM dumps are returned.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseNav } from '../qa/m5-route-audit.mjs';

export const KEYBOARD_EXPECTED = 7;
const ROLE_IDS = new Set(['platform-admin', 'center-admin', 'coordinator',
  'speech-therapist', 'ot-therapist', 'supervisor', 'guardian']);

export function validateKeyboardJourneys(items) {
  if (!Array.isArray(items) || items.length !== KEYBOARD_EXPECTED) {
    throw new Error('M5 keyboard evidence must include exactly seven role personas');
  }
  const seen = new Set();
  for (const item of items) {
    if (!ROLE_IDS.has(item.persona) || seen.has(item.persona)) throw new Error('Duplicate or unknown M5 keyboard persona');
    seen.add(item.persona);
    if (item.desktopHomeViaEnter !== 'OBSERVED' || item.mobileSelectFocus !== 'OBSERVED' ||
        item.desktopRailToggle !== 'OBSERVED' ||
        item.mobileMoreKeyboard !== 'OBSERVED' || item.mobilePermissionLinks !== 'OBSERVED' ||
        !Number.isInteger(item.mobileQuickLinkCount) || item.mobileQuickLinkCount < 1 || item.mobileQuickLinkCount > 3 ||
        !['OBSERVED', 'NOT_OBSERVED'].includes(item.mobileShiftTabToSignOut) ||
        item.signOutViaEnter !== 'OBSERVED' ||
        !Number.isInteger(item.desktopNavigationMs) || item.desktopNavigationMs < 0 ||
        item.desktopNavigationMs > 30000 ||
        Object.keys(item).some(key => /password|cookie|token|email|name|content|html|text|user/i.test(key))) {
      throw new Error('M5 keyboard evidence incomplete, unsafe or falsely certified');
    }
  }
  return true;
}

export async function observeKeyboardJourney(page, persona, { base, settle }) {
  if (!ROLE_IDS.has(persona.id) || !persona.routes?.[1] || !base?.startsWith('http://127.0.0.1:3000')) {
    throw new Error('Keyboard audit requires known synthetic persona and loopback');
  }
  await page.setViewportSize({ width: 1440, height: 850 });
  await page.goto(base + persona.routes[1], { waitUntil: 'domcontentloaded' });
  const startState = await settle(page);
  if (startState.error || startState.timedOut || startState.denied) throw new Error('Cannot assess keyboard route while page is not settled');

  const railToggle = page.getByTestId('sidebar-collapse-toggle');
  await railToggle.waitFor({ state: 'visible' });
  await railToggle.click();
  assert.equal(await page.getByTestId('product-sidebar').getAttribute('data-collapsed'), 'true',
    'Desktop rail must actually collapse');
  await page.getByTestId('nav-home').waitFor({ state: 'visible' });
  await railToggle.click();
  assert.equal(await page.getByTestId('product-sidebar').getAttribute('data-collapsed'), 'false',
    'Desktop rail must expand and preserve Home');

  const home = page.getByTestId('nav-home');
  await home.waitFor({ state: 'visible' });
  await home.focus();
  const desktopFocused = await home.evaluate(el => document.activeElement === el);
  if (!desktopFocused) throw new Error('Desktop home navigation cannot receive keyboard focus');
  const start = performance.now();
  await page.keyboard.press('Enter');
  await page.waitForURL(url => url.origin === base && url.pathname === '/app', { timeout: 12000 });
  const desktopState = await settle(page);
  if (desktopState.error || desktopState.timedOut || desktopState.denied) throw new Error('Keyboard-activated home route did not settle');
  const desktopNavigationMs = Math.max(0, Math.round(performance.now() - start));

  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(base + '/app', { waitUntil: 'domcontentloaded' });
  const mobileState = await settle(page);
  if (mobileState.error || mobileState.timedOut || mobileState.denied) throw new Error('Mobile home route did not settle');
  const mobileNav = page.getByTestId('mobile-nav-select');
  await mobileNav.waitFor({ state: 'visible' });
  await mobileNav.focus();
  const mobileFocused = await mobileNav.evaluate(el => document.activeElement === el);
  if (!mobileFocused) throw new Error('Mobile navigation control cannot receive keyboard focus');
  await page.keyboard.press('Shift+Tab');
  const signOut = page.getByTestId('sign-out-button');
  const shiftBack = await signOut.evaluate(el => document.activeElement === el);
  // Test the new M5-03 UI against the ACTUAL session grants, not role-name guesses.
  const quick = page.getByTestId('mobile-bottom-nav');
  await quick.waitFor({ state: 'visible' });
  const quickLinks = await quick.locator('a').evaluateAll(links => links.map(el => ({
    href: el.getAttribute('href'), label: el.textContent?.trim() ?? '',
  })));
  assert(quickLinks.length >= 1 && quickLinks.length <= 3, 'Mobile quick navigation must stay bounded');

  const more = page.getByTestId('mobile-more-button');
  await more.focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('mobile-more-sheet').waitFor({ state: 'visible' });
  const dialog = page.getByRole('dialog', { name: 'All navigation' });
  assert.equal(await dialog.getAttribute('aria-modal'), 'true');
  const closeButton = page.getByTestId('mobile-more-close');
  assert(await closeButton.evaluate(el => document.activeElement === el), 'More dialog must take keyboard focus');

  const permissions = await page.evaluate(async () => {
    const r = await fetch('/api/auth/session', { credentials: 'include' });
    if (!r.ok) throw new Error('Synthetic session permission lookup failed');
    const session = await r.json();
    if (!Array.isArray(session.permissions)) throw new Error('Missing synthetic session grants');
    return session.permissions;
  });
  const currentNav = parseNav(await readFile(resolve('apps/web/src/components/auth/ProductShell.tsx'), 'utf8'));
  const expected = currentNav.filter(n => !n.permission || permissions.includes(n.permission))
    .map(n => ({ href: n.href, label: n.label })).sort((a,b) => (a.href+'|'+a.label).localeCompare(b.href+'|'+b.label));
  const rendered = await dialog.locator('a[data-testid^="mobile-more-"]').evaluateAll(links =>
    links.map(el => ({ href: el.getAttribute('href'), label: el.textContent?.trim() ?? '' })));
  const actual = rendered.sort((a,b) => (a.href+'|'+a.label).localeCompare(b.href+'|'+b.label));
  assert.deepEqual(actual, expected, 'More panel must contain exactly authorized current-session destinations');
  for (const candidate of quickLinks) {
    assert(expected.some(item => item.href === candidate.href),
      'Mobile shortcut cannot expose a destination absent from the authorized menu');
  }
  // Native dialog-like focus wrap: Shift+Tab from close goes to final link,
  // Tab wraps back; Escape dismisses and restores More-button focus.
  await page.keyboard.press('Shift+Tab');
  assert(!(await closeButton.evaluate(el => document.activeElement === el)),
    'Reverse tab from first dialog action should traverse dialog items');
  await page.keyboard.press('Tab');
  assert(await closeButton.evaluate(el => document.activeElement === el),
    'Tab from last dialog action must wrap to first');
  await page.keyboard.press('Escape');
  await page.getByTestId('mobile-more-sheet').waitFor({ state: 'hidden' });
  assert(await more.evaluate(el => document.activeElement === el),
    'Escape must return keyboard focus to More button');

  await signOut.focus();
  const signOutFocused = await signOut.evaluate(el => document.activeElement === el);
  if (!signOutFocused) throw new Error('Sign-out control cannot receive keyboard focus');
  await page.keyboard.press('Enter');
  await page.waitForURL(url => url.origin === base && url.pathname === '/login', { timeout: 15000 });

  return {
    persona: persona.id,
    desktopHomeViaEnter: 'OBSERVED', desktopRailToggle: 'OBSERVED',
    mobileMoreKeyboard: 'OBSERVED', mobilePermissionLinks: 'OBSERVED',
    mobileQuickLinkCount: quickLinks.length,
    mobileSelectFocus: 'OBSERVED',
    mobileShiftTabToSignOut: shiftBack ? 'OBSERVED' : 'NOT_OBSERVED',
    signOutViaEnter: 'OBSERVED',
    desktopNavigationMs,
  };
}
