import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAudit, parseNav } from './m5-route-audit.mjs';
import { buildTaskArchitecture, groupNavigation, visibleNavigation,
  NAV_TASK_AREA } from './m5-task-areas.mjs';

const minimum = [
  { key:'home', href:'/app', label:'Home', permission:null },
  { key:'activities', href:'/app/activities', label:'Activities', permission:'center.activities.read' },
  { key:'activities', href:'/app/activities', label:'At home', permission:'family.activities.read' },
];
const minimalMap = { '/app|':'overview',
  '/app/activities|center.activities.read':'collaboration',
  '/app/activities|family.activities.read':'family' };

test('same route with center and guardian permissions remains separate under task groups', () => {
  const areas = groupNavigation(minimum, ['/app','/app/activities'], minimalMap);
  const all = areas.flatMap(g => g.entries);
  assert.equal(all.length, 3);
  const center = visibleNavigation(areas, ['center.activities.read']).flatMap(g => g.entries);
  assert.deepEqual(center.map(n => n.label), ['Home','Activities']);
  const family = visibleNavigation(areas, ['family.activities.read']).flatMap(g => g.entries);
  assert.deepEqual(family.map(n => n.label), ['Home','At home']);
  assert.deepEqual(visibleNavigation(areas, []).flatMap(g=>g.entries).map(x=>x.label),['Home']);
});

test('cannot accidentally drop or reclassify a permission-specific navigation entry', () => {
  assert.throws(() => groupNavigation(minimum, ['/app','/app/activities'], { '/app|':'overview' }), /Ungrouped/);
  assert.throws(() => groupNavigation(minimum.slice(0,2), ['/app','/app/activities'], minimalMap), /Stale/);
  assert.throws(() => groupNavigation([...minimum,minimum[1]], ['/app','/app/activities'], minimalMap), /Duplicate/);
  assert.throws(() => groupNavigation(minimum, ['/app'], minimalMap), /Invalid route/);
  assert.throws(() => groupNavigation(minimum, ['/app','/app/activities'], {...minimalMap, '/extra|':'care'}), /Stale/);
});

test('never accept unsafe target or forged permission identifiers', () => {
  for (const bad of [
    {href:'https://evil.invalid'}, {href:'//external'}, {href:'/app/private'},
    {permission:undefined}, {permission:'admin || true'}, {permission:'*.all'},
  ]) {
    const broken = minimum.map(x => ({...x}));
    Object.assign(broken[1],bad);
    assert.throws(() => groupNavigation(broken, ['/app','/app/activities'], minimalMap), /Invalid|Ungrouped/);
  }
  assert.throws(() => visibleNavigation([], [null]), /Invalid/);
});

test('actual ProductShell source has complete exact mapping and never rebrands blocked traceability as verified', async () => {
  const audit = await buildAudit();
  const ia = buildTaskArchitecture(audit);
  assert.equal(ia.summary.existingNavEntries, 20);
  assert.equal(ia.summary.mappedNavEntries, ia.summary.existingNavEntries);
  assert.equal(Object.keys(NAV_TASK_AREA).length, ia.summary.mappedNavEntries);
  assert.equal(ia.summary.canonicalPages, audit.summary.canonicalPages);
  assert.equal(ia.controlledSourceGap.status,'BLOCKED_CANONICAL_SPEC_NOT_AVAILABLE');
  assert.deepEqual([ia.controlledSourceGap.capabilityRowsMapped,
    ia.controlledSourceGap.workflowRowsMapped,ia.controlledSourceGap.ownerRowsMapped,
    ia.controlledSourceGap.historicalStepsMapped],[0,0,0,0]);
  assert.equal(ia.governance.clinical,'NO_GO_G2_G2b');
  assert.equal(ia.governance.navigationDeployment,'NOT_IMPLEMENTED');
  const found = new Set(ia.taskAreas.flatMap(g=>g.entries.map(n=>n.href+'|'+(n.permission??''))));
  assert.deepEqual([...found].sort(),Object.keys(NAV_TASK_AREA).sort());
  const centerActivity = ia.taskAreas.flatMap(g=>g.entries).find(n=>n.permission==='center.activities.read');
  const familyActivity = ia.taskAreas.flatMap(g=>g.entries).find(n=>n.permission==='family.activities.read');
  assert.notEqual(centerActivity.group, familyActivity.group);
});

test('source approval must remain explicitly unearned', async () => {
  const audit = await buildAudit();
  audit.approvals.ux='APPROVED';
  assert.throws(() => buildTaskArchitecture(audit), /Only unapproved/);
});
