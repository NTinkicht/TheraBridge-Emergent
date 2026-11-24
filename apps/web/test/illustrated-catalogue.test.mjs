import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCatalogueActivity, filterCatalogueActivities, projectPrintableActivity, CATALOGUE_MEDIA_STATE } from '../src/lib/illustrated-catalogue.mjs';

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
  const activities = [fixture(), {...fixture(), id: 'other', specialty: 'SLT', title: 'Language', steps: ['Name objects']}];
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

test('inherited accessors, throwing and revoked proxies are denied without disrupting siblings', () => {
  let invoked = 0;
  const inherited = Object.assign(Object.create({get title() {invoked++; throw Error('inherited');}}), {id:'x'});
  const throwing = new Proxy(fixture(), {getOwnPropertyDescriptor() {throw Error('trap');}});
  const revocable = Proxy.revocable(fixture(), {});
  revocable.revoke();
  for (const entry of [inherited, throwing, revocable.proxy]) {
    assert.equal(projectCatalogueActivity(entry), null);
  }
  assert.equal(invoked, 0);
  assert.deepEqual(filterCatalogueActivities([fixture(), inherited, throwing, revocable.proxy]).map(x => x.id), ['synthetic-1']);
});

test('nested indexed accessors and overridden array methods never execute', () => {
  let invoked = 0;
  for (const key of ['steps','materials','equipment','safety']) {
    const input = fixture();
    const array = ['safe'];
    Object.defineProperty(array, '0', {get() {invoked++; throw Error('nested getter');}});
    array.filter = () => {invoked++; throw Error('override');};
    input[key] = array;
    assert.equal(projectCatalogueActivity(input), null);
  }
  assert.equal(invoked, 0);
});

test('poisoned filters and array entries fail closed without executing getters', () => {
  let invoked = 0;
  const activities = [fixture(), fixture()];
  Object.defineProperty(activities, '1', {get() {invoked++; throw Error('index');}});
  assert.deepEqual(filterCatalogueActivities(activities).map(x => x.id), ['synthetic-1']);
  const filters = {get query() {invoked++; throw Error('filter');}};
  assert.deepEqual(filterCatalogueActivities([fixture()], filters), []);
  assert.equal(invoked, 0);
});


test('strict record boundaries reject ambiguous identity and prevent unsafe media projection', () => {
  const valid = fixture();
  for (const invalid of [
    {...valid, id: '  '}, {...valid, title: ''},
    {...valid, id: 'x'.repeat(129)}, {...valid, title: 'x'.repeat(251)},
    {...valid, id: 123}, {...valid, title: false},
    {...valid, steps: ['valid', 7]}, {...valid, materials: [null]},
    {...valid, equipment: [false]}, {...valid, safety: [17]},
  ]) {
    assert.equal(projectCatalogueActivity(invalid), null);
  }
  const atLimits = projectCatalogueActivity({...valid, id: 'x'.repeat(128), title: 'x'.repeat(250)});
  assert.equal(atLimits.id.length, 128);
  assert.equal(atLimits.title.length, 250);
  assert.equal(atLimits.illustration.src, null);
});

test('whitespace, absent fields and sparse numbered instructions stay immutable and deterministic', () => {
  const source = {id: '  safe-1 ', title: '  Motor practice  ', steps: ['  First  ', ' ', ' Last '],
    materials: ['  Ball ', ' '], equipment: null, safety: undefined};
  const result = projectCatalogueActivity(source);
  assert.equal(result.id, 'safe-1');
  assert.equal(result.title, 'Motor practice');
  assert.deepEqual(result.steps, [
    {number: 1, instruction: 'First'}, {number: 2, instruction: 'Last'},
  ]);
  assert.deepEqual(result.materials, ['Ball']);
  assert.deepEqual(result.equipment, []);
  assert.deepEqual(result.safety, []);
  assert.equal(Object.isFrozen(result.materials), true);
  assert.equal(Object.isFrozen(result.illustration), true);
  const sparse = {...source, steps: Array(2)};
  sparse.steps[1] = ' Second ';
  assert.deepEqual(projectCatalogueActivity(sparse).steps, [{number: 1, instruction: 'Second'}]);
});

test('catalogue filters AND-match exact taxonomy and search independent authorized text fields', () => {
  const base = fixture();
  const other = {...fixture(), id: 'synthetic-2', title: 'Language work',
    specialty: 'SLT', category: 'Speech', skill: 'Naming',
    equipment: ['Cards'], materials: ['Photos'], steps: ['Name objects']};
  const records = [base, other];
  assert.deepEqual(filterCatalogueActivities(records, {specialty: 'ot', category: 'movement', skill: 'balance'}).map(x=>x.id), ['synthetic-1']);
  assert.deepEqual(filterCatalogueActivities(records, {specialty: 'OT', category: 'Speech'}), []);
  assert.deepEqual(filterCatalogueActivities(records, {equipment: 'CARDS'}).map(x=>x.id), ['synthetic-2']);
  assert.deepEqual(filterCatalogueActivities(records, {query: 'foam blocks'}).map(x=>x.id), ['synthetic-1']);
  assert.deepEqual(filterCatalogueActivities(records, {query: 'name objects'}).map(x=>x.id), ['synthetic-2']);
  assert.deepEqual(filterCatalogueActivities(records, {query: 'slt'}).map(x=>x.id), ['synthetic-2']);
  assert.deepEqual(filterCatalogueActivities(records, {query: 'unmatched'}), []);
  assert.deepEqual(filterCatalogueActivities(null), []);
  assert.deepEqual(filterCatalogueActivities({}, {}), []);
});

test('malformed nested arrays and proxy-backed containers fail closed without denying valid siblings', () => {
  const good = fixture();
  const badArrays = [];
  for (const key of ['steps', 'materials', 'equipment', 'safety']) {
    const excessive = {...fixture(), id: 'bad-' + key, [key]: Array(101).fill('valid')};
    badArrays.push(excessive);
  }
  const oversizeCatalogue = Array(10001);
  assert.deepEqual(filterCatalogueActivities(oversizeCatalogue), []);
  const trapped = new Proxy([good], {getOwnPropertyDescriptor() {throw Error('container trap');}});
  assert.deepEqual(filterCatalogueActivities(trapped), []);
  const revoked = Proxy.revocable([good], {});
  revoked.revoke();
  assert.deepEqual(filterCatalogueActivities(revoked.proxy), []);
  assert.deepEqual(filterCatalogueActivities([good, ...badArrays]).map(x=>x.id), ['synthetic-1']);
});

test('a poisoned catalogue entry cannot invoke a property getter or hide subsequent valid records', () => {
  let getterCalls = 0;
  const poisoned = {id: 'bad', title: 'Bad', steps: ['safe']};
  Object.defineProperty(poisoned.steps, 0, {get() {getterCalls++; throw Error('must not execute');}});
  const normal = fixture();
  const result = filterCatalogueActivities([poisoned, normal], {query: 'blocks'});
  assert.deepEqual(result.map(x=>x.id), ['synthetic-1']);
  assert.equal(getterCalls, 0);
  assert.equal(result[0].illustration.src, null);
});

test('printable instructions are numbered, immutable and never expose unapproved media', () => {
  const source = fixture();
  const print = projectPrintableActivity(source);
  assert.equal(print.status, 'SYNTHETIC_PREVIEW_NOT_APPROVED_FOR_RELEASE');
  assert.equal(print.illustration.src, null);
  assert.equal(print.styleVersion, 'm5-b-v1');
  assert.deepEqual(print.instructions.items.map(step => step.accessibleLabel), [
    'Step 1: Place blocks', 'Step 2: Step carefully',
  ]);
  source.steps[0] = 'Forged';
  source.imageUrl = 'https://untrusted.invalid/updated.jpg';
  assert.equal(print.instructions.items[0].instruction, 'Place blocks');
  assert.equal(JSON.stringify(print).includes('https://'), false);
  assert.equal(Object.isFrozen(print.instructions.items[0]), true);
  assert.equal(Object.isFrozen(print.instructions.items), true);
  assert.equal(Object.isFrozen(print), true);
  assert.throws(() => { print.instructions.items[0].instruction = 'Forged'; }, TypeError);
});

test('print preview fails closed for missing steps and malicious nested accessors', () => {
  assert.equal(projectPrintableActivity({...fixture(), steps: []}), null);
  assert.equal(projectPrintableActivity({...fixture(), steps: ['  ', '  ']}), null);
  let calls = 0;
  const poisoned = fixture();
  Object.defineProperty(poisoned.steps, 0, { get() { calls++; throw Error('must not read'); } });
  assert.equal(projectPrintableActivity(poisoned), null);
  assert.equal(calls, 0);
  assert.equal(projectPrintableActivity({...fixture(), id: ''}), null);
});
