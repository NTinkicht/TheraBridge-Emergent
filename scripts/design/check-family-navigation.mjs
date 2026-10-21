// Usage: SCREENSHOT_BASE_URL=https://localhost:3443 NAV_SESSION_FILE=<private Playwright state>
// NAV_SCREENSHOT_DIR=artifacts/evaluation/after node scripts/design/check-family-navigation.mjs
// Session must belong to a synthetic guardian; never commit the private state file.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.SCREENSHOT_BASE_URL;
const state = process.env.NAV_SESSION_FILE;
if (!base || !state) throw new Error('SCREENSHOT_BASE_URL and NAV_SESSION_FILE are required');
const out = process.env.NAV_SCREENSHOT_DIR ?? 'artifacts/evaluation/after';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ storageState: state, ignoreHTTPSErrors: base.startsWith('https://localhost:') });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const results = [];
async function visibleSelection(width) {
  const selector = width < 768 ? '[data-testid="mobile-nav"] [aria-current="page"]' : '[data-testid="product-sidebar"] [aria-current="page"]';
  await page.waitForSelector(selector, { state: 'visible' });
  await page.waitForTimeout(400);
  const box = await page.locator(selector).boundingBox();
  assert(box && box.x >= 0 && box.x + box.width <= width, `Selection clipped at ${width}: ${JSON.stringify(box)}`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  return box;
}
try {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of [['practice', '/app/practice'], ['progress', '/app/family-progress'], ['design-light', '/design-preview/family?theme=light'], ['design-dark', '/design-preview/family?theme=dark']]) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const box = name.startsWith('design') ? null : await visibleSelection(width);
      await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
      results.push({ width, name, box, overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) });
    }
    if (width < 768) {
      await page.goto(base + '/app/practice', { waitUntil: 'networkidle' });
      const nav = page.getByTestId('mobile-nav');
      assert.equal(await nav.getAttribute('data-overflow-left'), 'true');
      // Keyboard traversal must expose the focused link and the existing global focus ring.
      await page.getByTestId('mobile-nav-home').focus();
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
      const focus = await page.evaluate(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, outline: getComputedStyle(e).outlineStyle }; });
      assert(focus.left >= 0 && focus.right <= width && focus.outline !== 'none', JSON.stringify(focus));
      await page.getByTestId('mobile-nav-family-progress').click();
      await page.waitForURL('**/app/family-progress');
      await visibleSelection(width);
      // Resize from the desktop sidebar back to a narrow phone.
      await page.setViewportSize({ width: 768, height: 900 });
      await page.setViewportSize({ width, height: 900 });
      await visibleSelection(width);
    }
  }
  // Browser-only stress fixture: no database grants or authorization changes.
  // Two guardian workspace choices add the existing Switch link; longer labels
  // exercise the same strip without adding an unapproved localization system.
  await page.route('**/api/auth/session', async route => {
    const response = await route.fetch();
    const session = await response.json();
    session.contexts = [...session.contexts, { ...session.activeContext, centerName: 'Second synthetic family workspace' }];
    await route.fulfill({ response, json: session });
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/app/practice', { waitUntil: 'networkidle' });
    await visibleSelection(width);
    await page.evaluate(() => {
      const nav = document.querySelector('[data-testid="mobile-nav"]');
      const labels = { home: 'Familienübersicht', messages: 'Nachrichten', activities: 'Aktivitäten', practice: 'Übungen zu Hause', 'family-progress': 'Fortschrittsberichte', security: 'Kontosicherheit', switch: 'Familie wechseln' };
      for (const [key, label] of Object.entries(labels)) {
        const link = nav.querySelector(`[data-testid="mobile-nav-${key}"]`);
        if (link) { for (const node of [...link.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.textContent = label; }
      }
    });
    await visibleSelection(width);
    await page.screenshot({ path: `${out}/long-labels-multiple-contexts-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, [], 'Browser runtime errors');
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} screenshots; selection, overflow, keyboard, route changes and resizing.`);
} finally { await browser.close(); }
