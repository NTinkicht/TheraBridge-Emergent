import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const activity = fs.readFileSync(path.join(root, 'src/components/clinical/ActivityCard.tsx'), 'utf8');
const library = fs.readFileSync(path.join(root, 'src/app/app/activities/page.tsx'), 'utf8');

test('M5-12 synthetic reference cards stay distinct from fail-closed private staff artwork', () => {
  assert.match(activity, /visual = false/);
  assert.match(activity, /No approved illustration available/);
  assert.match(activity, /activity-media-placeholder-/);
  assert.doesNotMatch(activity, /<img\b|<Image\b|mediaDraft\.url|draft\.url|approve\(/);
  assert.match(library, /<ActivityCard t=\{t\} visual compact layout=\{view\} artworkScope=\{/);
  assert.match(library, /canReviewArtwork && t\.library === 'center' && t\.version/);
  assert.match(library, /session\.activeContext\.role === 'CLINICAL_SUPERVISOR' \|\| t\.mine === true/);
  assert.match(activity, /!fam && artworkScope \? <StaffArtworkImage/);
  assert.match(activity, /!fam && artworkScope && i < 64/);
  const preview = fs.readFileSync(path.join(root, 'src/components/clinical/StaffArtworkImage.tsx'), 'utf8');
  assert.match(preview, /data\.staffPreview !== true/);
  assert.match(preview, /data\.clinicalReleaseEnabled !== false/);
  assert.match(preview, /URL\.revokeObjectURL/);
  assert.doesNotMatch(preview, /https?:\/\/|draft\.url/);
  assert.match(activity, /compact = false/);
  assert.match(activity, /<details className=/);
  assert.match(activity, /activity-details-/);
  // Generic synthetic reference art is distinct from private clinical media.
  // Guardian cards must be visual, but portable matching requires the server's
  // explicit sample/unreleased flags and never supplies a staff artwork scope.
  assert.match(library, /<ActivityCard key=\{t\.id\} t=\{t\} tone="family" visual syntheticSample=\{data\.sample === true && data\.released === false\} \/>/);
  assert.match(activity, /sharedIllustrationForActivity\(t, syntheticSample\)/);
  assert.match(activity, /shared \? <SharedIllustration asset=\{shared\}/);
  const family = library.slice(library.indexOf('function FamilyActivities'), library.indexOf('export default function ActivitiesPage'));
  assert.doesNotMatch(family, /artworkScope=|StaffArtworkImage|FamilyArtworkPreview/);
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
