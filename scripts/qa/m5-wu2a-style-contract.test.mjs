import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ILLUSTRATION_STYLE_VERSION,ILLUSTRATION_STYLE_STATE,
  ILLUSTRATION_SCENE_ARCHETYPES,ILLUSTRATION_FAMILIES,ILLUSTRATION_ARTBOARD,
  ILLUSTRATION_REFERENCE_SLOTS} from '../../apps/web/src/lib/illustration-style.mjs';
import {projectCatalogueActivity,projectPrintableActivity} from '../../apps/web/src/lib/illustrated-catalogue.mjs';
const file = path => readFile(new URL('../../'+path,import.meta.url),'utf8');
test('one locked m5-b-v1 style covers all five visual families and five scene archetypes',()=>{
  assert.equal(ILLUSTRATION_STYLE_VERSION,'m5-b-v1');
  assert.equal(ILLUSTRATION_STYLE_STATE,'CANDIDATE_NOT_APPROVED');
  assert.equal(ILLUSTRATION_FAMILIES.length,5);
  assert.equal(ILLUSTRATION_SCENE_ARCHETYPES.length,5);
  assert.equal(ILLUSTRATION_REFERENCE_SLOTS.length,25);
  assert.equal(new Set(ILLUSTRATION_REFERENCE_SLOTS.map(x=>x.id)).size,25);
  for(const family of ILLUSTRATION_FAMILIES)for(const scene of ILLUSTRATION_SCENE_ARCHETYPES){
    const slot=ILLUSTRATION_REFERENCE_SLOTS.find(x=>x.family===family&&x.scene===scene);
    assert(slot && slot.conceptOnly===true&&slot.approved===false);
    assert.equal(slot.imageUrl,null);
    assert.equal(slot.publishEnabled,false);
  }
  assert.deepEqual(ILLUSTRATION_ARTBOARD,{width:1600,height:1200,safeSquare:{x:200,y:0,width:1200,height:1200}});
});
test('proposal, catalogue, print and both activity cards use the SAME version and deny image rendering',async()=>{
  const server=await file('apps/api/src/clinical/illustration-style.ts');
  const dto=await file('apps/api/src/clinical/activity-media.dto.ts');
  const svc=await file('apps/api/src/clinical/activity-media.service.ts');
  const panel=await file('apps/web/src/components/clinical/ActivityMediaDraftPanel.tsx');
  assert.match(server,/ILLUSTRATION_STYLE_VERSION = 'm5-b-v1'/);
  assert.match(dto,/@Equals\(ILLUSTRATION_STYLE_VERSION\)/);
  assert.match(svc,/dto\.styleVersion !== ILLUSTRATION_STYLE_VERSION/);
  assert.match(panel,/value=\{ILLUSTRATION_STYLE_VERSION\} readOnly/);
  for(const path of [
    'apps/web/src/components/clinical/ActivityCard.tsx',
    'apps/web/src/components/clinical/SessionActivityPicker.tsx',
  ]){
    const surface=await file(path);
    assert.match(surface,/data-illustration-style=\{ILLUSTRATION_STYLE_VERSION\}/);
    assert(!/<img|src=\{.*candidate/i.test(surface));
  }
  const activity={id:'fictional',title:'Synthetic activity',steps:['Choice'],safety:['Clinician supervises']};
  const projected=projectCatalogueActivity(activity);
  const printable=projectPrintableActivity(activity);
  assert.equal(projected.illustration.styleVersion,ILLUSTRATION_STYLE_VERSION);
  assert.equal(projected.illustration.src,null);
  assert.equal(printable.styleVersion,ILLUSTRATION_STYLE_VERSION);
  assert.equal(printable.illustration.src,null);
});
test('concept art is recorded only as an unpublished, non-production review artifact',async()=>{
  const doc=await file('docs/product/M5-WU2A-REFERENCE-CONCEPT-REGISTER.md');
  assert(doc.includes('CANDIDATE_NOT_APPROVED'));
  assert(doc.includes('169c34a1589084b2cc7dd722bb0ec839165453a1b2a31b80f2ae6d2ff32e40a5'));
  assert(doc.includes('not** embedded in the repository'));
  assert(!doc.includes('STYLE_APPROVED=true'));
});
