import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const activity = fs.readFileSync(path.join(root, 'src/components/clinical/ActivityCard.tsx'), 'utf8');
const library = fs.readFileSync(path.join(root, 'src/app/app/activities/page.tsx'), 'utf8');

test('M5-12 image-first staff preview fails closed until approved assets exist', () => {
  assert.match(activity, /visual = false/);
  assert.match(activity, /No approved illustration available/);
  assert.match(activity, /activity-media-placeholder-/);
  assert.doesNotMatch(activity, /<img\b|<Image\b|mediaDraft\.url|draft\.url|approve\(/);
  assert.match(library, /<ActivityCard t=\{t\} visual compact layout=\{view\} \/>/);
  assert.match(activity, /compact = false/);
  assert.match(activity, /<details className=/);
  assert.match(activity, /activity-details-/);
  assert.match(library, /<ActivityCard key=\{t.id\} t=\{t\} tone="family" \/>/);
  assert.match(library, /session\.permissions\.includes\('center\.activities\.manage'\) && t\.library === 'center'/);
});

test('M5-12 supports accessible staff grid/list without weakening server discovery', () => {
  assert.match(library, /useState<'grid' \| 'list'>\('grid'\)/);
  assert.match(library, /aria-label="Activity layout"/);
  assert.match(library, /aria-pressed=\{view === 'grid'\}/);
  assert.match(library, /aria-pressed=\{view === 'list'\}/);
  assert.match(library, /data-layout=\{view\}/);
  assert.match(library, /clinicalApi\.templates\(centerId/);
  assert.match(library, /ownership, limit: 100/);
  assert.match(library, /data-testid="activities-load-more"/);
  assert.match(library, /data-testid="activities-no-results"/);
  assert.match(library, /<ErrorState onRetry=\{\(\) => void reload\(\)\} testId="activities-error"/);
});
