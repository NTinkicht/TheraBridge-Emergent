import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync('.github/workflows/hosted-responsive-private.yml','utf8');

test('private QA file paths are in the same container-mounted temporary volume',()=>{
 assert(!workflow.includes('${{ runner.temp }}'),'host runner.temp path is invisible inside Playwright job container');
 const expected=[
  '/__w/_temp/tb-hosted-private/users.json',
  '/__w/_temp/tb-hosted-private/evidence',
  '/__w/_temp/tb-hosted-private/collector-exit',
  '/__w/_temp/tb-hosted-private/report'
 ];
 for(const p of expected)assert(workflow.includes(p),'missing shared path '+p);
});
test('blocked collector results are reported and still marked incomplete',()=>{
 assert.match(workflow,/id: collect/);
 assert.match(workflow,/set \+e\s+node scripts\/qa\/hosted-readonly\.mjs\s+exit_code=\$\?/);
 assert.match(workflow,/mkdir -p "\/__w\/_temp\/tb-hosted-private"/);
 assert.match(workflow,/printf '%s\\n' "\$exit_code" > "\/__w\/_temp\/tb-hosted-private\/collector-exit"/);
 for(const step of ['Build sanitized synthetic-only HTML and JSON report','Do not mark visual acceptance PASS automatically']){
  const part=workflow.slice(workflow.indexOf('      - name: '+step));
  assert(part.slice(0,240).includes("        if: ${{ always() && steps.collect.outcome == 'success' }}"),'must continue after prior failure: '+step);
 }
 const upload=workflow.slice(workflow.indexOf('      - name: Upload restricted synthetic QA report and screenshots'));
 assert(upload.split('\n')[1]==="        if: ${{ always() && steps.report.outcome == 'success' }}");
 assert(workflow.indexOf('Build sanitized synthetic-only HTML and JSON report')<workflow.indexOf('Upload restricted synthetic QA report and screenshots'));
 assert(workflow.indexOf('Upload restricted synthetic QA report and screenshots')<workflow.indexOf('Do not mark visual acceptance PASS automatically'));
 assert.match(workflow,/INCOMPLETE: synthetic report uploaded; #61 baseline remains unchanged/);
});
test('only sanitized synthetic report is uploaded for one day; private material is cleaned',()=>{
 const upload=workflow.slice(workflow.indexOf('      - name: Upload restricted'),workflow.indexOf('      - name: Do not mark'));
 assert.match(upload,/tb-hosted-private\/report\//);
 assert(!upload.includes('tb-hosted-private/evidence'));
 assert.match(upload,/retention-days: 1/);
 assert(!workflow.includes('TB_HOSTED_QA_EVIDENCE_KEY_HEX'));
 assert.match(workflow,/if: always\(\)\s+run: \|\s+rm -rf "\/__w\/_temp\/tb-hosted-private"/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
});
