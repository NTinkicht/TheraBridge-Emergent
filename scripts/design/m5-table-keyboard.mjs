// Browser-level keyboard accessibility regression for M5-04 compact tables.
// Uses only a static synthetic fixture; does not access sessions or clinical data.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3000';
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
try {
  for (const width of [320, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 780 }, reducedMotion: 'reduce' });
    try {
      const response = await page.goto(base + '/design-preview/m5-patterns', { waitUntil: 'domcontentloaded' });
      assert(response?.ok(), 'Synthetic fixture must load successfully');
      const region = page.getByRole('region', { name: /Synthetic activity table.*scroll horizontally/ });
      await region.waitFor({state:'visible'});
      assert.equal(await region.getAttribute('tabindex'), '0', 'Scroll region must be keyboard focusable');
      const initial = await region.evaluate(el => ({scrollLeft:el.scrollLeft, scrollWidth:el.scrollWidth, clientWidth:el.clientWidth}));
      assert(initial.scrollWidth > initial.clientWidth, `Expected overflow at ${width}px`);
      await region.focus();
      assert(await region.evaluate(el => document.activeElement === el), 'Keyboard focus must reach table region');
      for (let i=0;i<12;i++) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
      const finalLeft = await region.evaluate(el => el.scrollLeft);
      assert(finalLeft > initial.scrollLeft, `ArrowRight must scroll table at ${width}px`);
      assert.equal(await region.locator('table caption').textContent(), 'Synthetic activity table');
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
