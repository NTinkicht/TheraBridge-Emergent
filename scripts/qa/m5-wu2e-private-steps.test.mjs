import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {projectPrivateIllustrationSteps,PRIVATE_STEP_IMAGE_STATE,
  PRIVATE_STEP_PREVIEW_PUBLICATION_ENABLED} from '../../apps/web/src/lib/private-illustration-steps.mjs';
import {ILLUSTRATION_STYLE_VERSION} from '../../apps/web/src/lib/illustration-style.mjs';
import {projectCatalogueActivity,projectPrintableActivity} from '../../apps/web/src/lib/illustrated-catalogue.mjs';

const file=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
const make=steps=>({templateVersion:3,steps});

test('M5 WU2-E exact clinician-authored version-locked steps have private 4:3 placeholders only',()=>{
  const result=projectPrivateIllustrationSteps(make([
    ' Offer a non-proprietary choice card. ', 'Allow time for the child to choose.',
  ]));
  assert.equal(result.styleVersion,ILLUSTRATION_STYLE_VERSION);
  assert.equal(result.styleVersion,'m5-b-v1');
  assert.equal(result.templateVersion,3);
  assert.equal(result.stepCount,2);
  assert.equal(result.state,'STAFF_ONLY_UNRELEASED_STEP_PREVIEW');
  assert.equal(result.displayMedia,false);
  assert.equal(result.publishEnabled,false);
  assert.equal(result.guardianReadEnabled,false);
  assert.equal(result.clinicalReleaseEnabled,false);
  assert.equal(result.steps[0].instruction,' Offer a non-proprietary choice card. ');
  assert.equal(result.steps[0].number,1);
  assert.equal(result.steps[1].number,2);
  assert.equal(result.steps[1].templateVersion,3);
  assert.equal(result.steps[0].placeholder.state,PRIVATE_STEP_IMAGE_STATE);
  assert.deepEqual(result.steps[0].placeholder.safeSquare,{x:200,y:0,width:1200,height:1200});
  assert.equal(result.steps[0].placeholder.aspectRatio,'4:3');
  assert.equal(result.steps[0].placeholder.imageUrl,null);
  assert.equal(result.steps[0].placeholder.altText,null);
  assert.equal(result.steps[0].placeholder.approved,false);
  assert.equal(result.steps[0].placeholder.publishEnabled,false);
  assert.equal(result.steps[0].placeholder.guardianReadEnabled,false);
  assert.equal(result.steps[0].placeholder.clinicalReleaseEnabled,false);
  assert.equal(PRIVATE_STEP_PREVIEW_PUBLICATION_ENABLED,false);
  assert(Object.isFrozen(result.steps[0].placeholder));
  assert(Object.isFrozen(result.steps));
  assert(Object.isFrozen(result));
  const serialized=JSON.stringify(result);
  assert(!/https?:\/\/|imageBytes|storageKey|candidateId|signedUrl|data:image/i.test(serialized));
});

test('malformed or stale step versions, unsafe accessor data, over-limit steps fail closed',()=>{
  for(const bad of [
    null,{}, {templateVersion:0,steps:['One']},
    {templateVersion:3,steps:[null]},
    {templateVersion:3,steps:['']},
    {templateVersion:3,steps:[7]},
    {templateVersion:3,steps:['x'.repeat(401)]},
    {templateVersion:3,steps:Array(2)},
    {templateVersion:3,steps:Array(65).fill('Unsafe unreviewed step')},
    {templateVersion:3,steps:{0:'One',length:1}},
    {templateVersion:3,steps:[{imageUrl:'https://foreign.test'}]},
    {templateVersion:2147483648,steps:['Invalid']},
  ])assert.equal(projectPrivateIllustrationSteps(bad),null);
  const hostile={templateVersion:3,steps:['One']};
  Object.defineProperty(hostile,'templateVersion',{get(){throw Error('unsafe');}});
  assert.equal(projectPrivateIllustrationSteps(hostile),null);
  const arr=['Safe'];
  Object.defineProperty(arr,0,{get(){throw Error('unsafe');}});
  assert.equal(projectPrivateIllustrationSteps(make(arr)),null);
});

test('safe empty and maximum 64 clinician steps, original arrays cannot modify projected results',()=>{
  assert.equal(projectPrivateIllustrationSteps(make([])).stepCount,0);
  const steps=Array.from({length:64},(_,i)=>'Clinician step '+(i+1));
  const projected=projectPrivateIllustrationSteps(make(steps));
  assert.equal(projected.stepCount,64);
  steps[0]='Untrusted later mutation';
  assert.equal(projected.steps[0].instruction,'Clinician step 1');
  assert.equal(projected.steps[63].number,64);
});

test('staff-only preview wired to existing role-scoped panel; no image read or shared guardian regressions',async()=>{
  const component=await file('apps/web/src/components/clinical/PrivateIllustrationStepPreview.tsx');
  const panel=await file('apps/web/src/components/clinical/ActivityMediaDraftPanel.tsx');
  assert.match(panel,/PrivateIllustrationStepPreview/);
  assert.match(panel,/templateVersion=\{templateVersion\} steps=\{steps\}/);
  assert.match(component,/projectPrivateIllustrationSteps/);
  assert.match(component,/data-illustration-style=\{ILLUSTRATION_STYLE_VERSION\}/);
  assert.match(component,/aspect-\[4\/3\]/);
  assert.match(component,/grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3/);
  assert.match(component,/<details/);
  assert.match(component,/<summary/);
  assert.match(component,/<ol/);
  assert.match(component,/focus-visible:outline/);
  assert.match(component,/No approved illustration available/);
  assert.match(component,/not released images/);
  assert(!/<img|<Image|<picture|dangerouslySetInnerHTML|fetch\(|rest\.|src=\{|<a |URL\.createObjectURL/i.test(component));
  for(const path of [
    'apps/web/src/components/clinical/ActivityCard.tsx',
    'apps/web/src/components/clinical/SessionActivityPicker.tsx',
  ]){
    const surface=await file(path);
    assert.match(surface,/data-illustration-style=\{ILLUSTRATION_STYLE_VERSION\}/);
    assert.match(surface,/No approved illustration available/);
    assert(!/<img|<picture|src=\{.*candidate/i.test(surface));
  }
  const example={id:'synthetic-record',title:'Example (not clinical advice)',
    steps:['Authored step'],materials:['Synthetic material'],safety:['Clinician supervision']};
  const catalogue=projectCatalogueActivity(example);
  const printable=projectPrintableActivity(example);
  assert.equal(catalogue.illustration.src,null);
  assert.equal(printable.illustration.src,null);
  assert.equal(printable.status,'SYNTHETIC_PREVIEW_NOT_APPROVED_FOR_RELEASE');
  assert.equal(catalogue.illustration.styleVersion,'m5-b-v1');
});
