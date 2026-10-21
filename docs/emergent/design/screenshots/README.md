# Design acceptance screenshots (TB-EM-D01 r2)

Captured 2026-10-20 from the Emergent preview with `scripts/design/capture-screenshots.mjs`. You can re-run it anywhere:

```bash
yarn install && npx playwright install chromium
yarn dev:web   # or any running instance
SCREENSHOT_BASE_URL=http://localhost:3000 node scripts/design/capture-screenshots.mjs
```

The script fails if any page has horizontal overflow. All 21 captures reported 0px overflow.

| File | Screen | Width |
|---|---|---|
| `00-direction-{1440,390}.jpg` | Direction, tokens, type, components, states | desktop, mobile |
| `01-platform-{1440,1024,390}.jpg` | Platform dashboard | desktop, tablet (rail), mobile |
| `02-center-{1440,768,390}.jpg` | Center dashboard (Cedar Grove, trial) | desktop, tablet, mobile |
| `03-therapist-{1440,1024,390}.jpg` | Therapist daily view (Speech context) | desktop timeline, tablet, mobile list |
| `04-child-{1440,768,390,320}.jpg` | Child profile (Alex), Overview tab | all; 320 shows tab scroll cue |
| `05-family-light-{1440,390,320}.jpg` | Parent home, light | desktop day chips, mobile stacked cards |
| `06-family-dark-{1440,768,390}.jpg` | Parent home, family dark theme | desktop, tablet, mobile |

**How to read the full-page captures:** Playwright stitches full-page screenshots at a single scroll position. On mobile captures, the fixed bottom navigation can appear partway down the page. On desktop captures, the sticky sidebar ends at the first viewport height. In a real browser both stay pinned to the viewport.

All people, centers and records are fictional fixture data. The pages are not connected to the API.
