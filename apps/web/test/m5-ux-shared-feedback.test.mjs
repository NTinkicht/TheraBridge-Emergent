import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'src', name), 'utf8');
const calendar = read('components/operations/Calendar.tsx');
const schedule = read('app/app/schedule/page.tsx');
const children = read('app/app/children/page.tsx');
const activities = read('app/app/activities/page.tsx');
const shell = read('components/auth/ProductShell.tsx');

test('weekly calendar headers share the scrollport and exact column widths with the body', () => {
  const scroll = calendar.indexOf('className="max-h-[68vh] scroll-pt-12 overflow-auto"');
  const header = calendar.indexOf('sticky top-0 z-20 grid',scroll);
  const body = calendar.indexOf('className="relative grid"',header);
  assert.ok(scroll > 0 && header > scroll && body > header);
  // Sticky day header is ~36px; 48px scroll padding prevents a focused
  // keyboard appointment from being scrolled under it.
  assert.match(calendar, /max-h-\[68vh\] scroll-pt-12 overflow-auto/);
  assert.equal((calendar.match(/gridTemplateColumns: `56px repeat\(/g) || []).length, 2);
  assert.equal((calendar.match(/max-h-\[68vh\] scroll-pt-12 overflow-auto/g) || []).length, 1);
});

test('schedule suggestions use authorized therapist results and keyboard interactions', () => {
  assert.match(schedule, /opsApi\.therapists\(centerId/);
  assert.match(schedule, /aria-autocomplete="list"/);
  assert.match(schedule, /role="listbox"/);
  assert.match(schedule, /e\.key === 'ArrowDown'/);
  assert.match(schedule, /e\.key === 'ArrowUp'/);
  assert.match(schedule, /e\.key === 'Escape'/);
  assert.match(schedule, /chooseTherapist\(therapistSuggestions/);
  assert.match(schedule, /setTherapist\(''\); setChosenTherapistName\(''\)/);
  assert.ok(schedule.includes('revealActiveSuggestion(suggestionListRef.current'));
  assert.ok(schedule.includes('ref={suggestionListRef} id="schedule-therapist-suggestions"'));
});

test('child autocomplete is center-scoped, cancelable, and navigates only to returned IDs', () => {
  assert.match(children, /opsApi\.children\(centerId, \{ q: query\.trim\(\), status: filters\.status \}\)/);
  assert.match(children, /clearTimeout\(timer\)/);
  assert.match(children, /suggestions\?\.key === suggestionKey/);
  assert.match(children, /aria-autocomplete="list"/);
  assert.ok(children.includes('revealActiveSuggestion(suggestionListRef.current'));
  assert.ok(children.includes('ref={suggestionListRef} role="listbox"'));
  assert.match(children, /role="listbox"/);
  assert.match(children, /router\.push\(`\/app\/children\/\$\{c\.id\}`\)/);
  assert.match(children, /md:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(0,1\.65fr\)_8rem\]/);
});

test('activities render consistent action regions with explicit origin and one list thumbnail', () => {
  assert.match(activities, /className="flex h-full min-w-0 flex-col gap-2"/);
  assert.match(activities, /<ActivityCard t=\{t\} visual compact layout=\{view\} artworkScope=\{/);
  assert.match(activities, /activity-actions-zone-/);
  assert.match(activities, /activity-actions-menu-/);
  assert.match(activities, /Activity actions/);
  assert.match(activities, /<details className="rounded-control border/);
  assert.match(activities, /My activity/);
  assert.match(activities, /Shared activity/);
  assert.match(activities, /Sample activity/);
  assert.match(activities, /session\.permissions\.includes\('center\.activities\.manage'\)/);
});

test('family dark mode includes the authenticated navigation shell, not just page body', () => {
  assert.match(shell, /const navSurface = family \? 'border-fam-border bg-fam-surface text-fam-ink'/);
  for (const id of ['product-sidebar','product-top-bar','mobile-nav','mobile-bottom-nav']) {
    assert.match(shell, new RegExp('data-testid="' + id + '"'));
  }
  // All four navigational surfaces plus the More sheet apply the shared
  // family-specific surface class. Do not guess source distance/line breaks.
  assert.ok(shell.split('${navSurface}').length - 1 >= 5);
  assert.match(shell, /theme-family-auto bg-fam-canvas text-fam-ink/);
});
