import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCatalogueActivity, filterCatalogueActivities, CATALOGUE_MEDIA_STATE } from '../src/lib/illustrated-catalogue.mjs';

const fixture = () => ({
  id: 'synthetic-1', title: 'Équilibre with blocks', specialty: 'OT',
  category: 'Movement', skill: 'Balance', equipment: ['Blocks'],
  materials: ['Foam blocks'], steps: ['Place blocks', 'Step carefully'],
  safety: ['Supervise throughout'],
  imageUrl: 'https://unapproved.example/child.png',
  approved: true, publicationStatus: 'PUBLISHED',
});

test('never projects unapproved media even when caller forges approval or URL', () => {
  const item = projectCatalogueActivity(fixture());
  assert.equal(item.illustration.state, CATALOGUE_MEDIA_STATE);
  assert.equal(item.illustration.src, null);
  assert.equal(item.illustration.alt, null);
  assert.equal('imageUrl' in item, false);
  assert.deepEqual(item.steps.map(s => s.number), [1, 2]);
  assert.equal(Object.isFrozen(item.steps[0]), true);
  assert.equal(Object.isFrozen(item), true);
});

test('search is accent-insensitive and AND-combines controlled filters', () => {
  const activities = [fixture(), {...fixture(), id: 'other', specialty: 'SLT', title: 'Language'}];
  assert.deepEqual(filterCatalogueActivities(activities, {query: 'equilibre', specialty: 'OT', equipment: 'blocks'}).map(x => x.id), ['synthetic-1']);
  assert.equal(filterCatalogueActivities(activities, {query: 'equilibre', specialty: 'SLT'}).length, 0);
  assert.equal(filterCatalogueActivities(activities, {query: 'place blocks'}).length, 1);
});

test('malformed and accessor-backed activity data are denied without invoking getters', () => {
  let invoked = 0;
  const poisoned = {id: 'synthetic', get title() {invoked++; throw Error('must not run');}};
  assert.equal(projectCatalogueActivity(poisoned), null);
  assert.equal(invoked, 0);
  for (const input of [null, [], {}, {id: [], title: 'Bad'}, {id: 'x', title: {toString() {throw Error('bad');}}}]) {
    assert.equal(projectCatalogueActivity(input), null);
  }
});

test('caller mutation cannot modify frozen projected instructions', () => {
  const source = fixture(), result = projectCatalogueActivity(source);
  source.steps[0] = 'Tampered';
  assert.equal(result.steps[0].instruction, 'Place blocks');
  assert.throws(() => { result.steps[0].instruction = 'Tampered'; }, TypeError);
});
