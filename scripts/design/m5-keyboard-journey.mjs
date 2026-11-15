/**
 * M5-01 synthetic keyboard-path instrumentation.
 * Measures three safe, narrow browser actions, not a clinical/workflow task.
 * No text, credentials, cookies, screenshots or DOM dumps are returned.
 */
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
  await signOut.focus();
  const signOutFocused = await signOut.evaluate(el => document.activeElement === el);
  if (!signOutFocused) throw new Error('Sign-out control cannot receive keyboard focus');
  await page.keyboard.press('Enter');
  await page.waitForURL(url => url.origin === base && url.pathname === '/login', { timeout: 15000 });

  return {
    persona: persona.id,
    desktopHomeViaEnter: 'OBSERVED',
    mobileSelectFocus: 'OBSERVED',
    mobileShiftTabToSignOut: shiftBack ? 'OBSERVED' : 'NOT_OBSERVED',
    signOutViaEnter: 'OBSERVED',
    desktopNavigationMs,
  };
}
