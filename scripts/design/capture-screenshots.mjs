// Captures the design-acceptance screenshot set. Usage:
//   SCREENSHOT_BASE_URL=http://localhost:3000 node scripts/design/capture-screenshots.mjs
// Requires: yarn install (playwright) and `npx playwright install chromium`.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.SCREENSHOT_BASE_URL;
if (!base) throw new Error('SCREENSHOT_BASE_URL is required');
const out = join(dirname(fileURLToPath(import.meta.url)), '../../docs/emergent/design/screenshots');

const SHOTS = [
  ['00-direction', '/design-preview', [1440, 390]],
  ['01-platform', '/design-preview/platform', [1440, 1024, 390]],
  ['02-center', '/design-preview/center', [1440, 768, 390]],
  ['03-therapist', '/design-preview/therapist', [1440, 1024, 390]],
  ['04-child', '/design-preview/child', [1440, 768, 390, 320]],
  ['05-family-light', '/design-preview/family?theme=light', [1440, 390, 320]],
  ['06-family-dark', '/design-preview/family?theme=dark', [1440, 768, 390]],
];

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const failures = [];
for (const [name, path, widths] of SHOTS) {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 900 }, deviceScaleFactor: 1 });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) failures.push(`${name}@${width}: ${overflow}px horizontal overflow`);
    await page.screenshot({ path: join(out, `${name}-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 78 });
    await page.close();
    console.log(`captured ${name}-${width}.jpg (overflow ${overflow}px)`);
  }
}
await browser.close();
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
