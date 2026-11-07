import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file='.github/workflows/hosted-interactive-private.yml';
const workflow=readFileSync(file,'utf8');

test('hosted acceptance remains operator gated, main-only and protected',()=>{
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/synthetic_only_authorized == true/);
 assert.match(workflow,/environment: hosted-responsive-private/);
 assert.match(workflow,/deployed_sha:/);
 assert.match(workflow,/secrets\.TB_HOSTED_QA_USERS_JSON/);
 assert.match(workflow,/secrets\.TB_HOSTED_QA_EXTRA_USERS_JSON/);
});
test('extra QA records sanitized evidence without uploading credentials or cookies',()=>{
 assert.match(workflow,/TB_QA_EXTRA_OUTPUT: \/__w\/_temp\/tb-interactive-private\/report/);
 assert.match(workflow,/hosted-extra-results\.json/);
 assert.match(workflow,/hosted-interactive-results\.json/);
 assert.match(workflow,/retention-days: 1/);
 const upload=workflow.slice(workflow.indexOf('      - name: Upload secret-free interaction results'));
 assert(!upload.includes('users.json'));
 assert(!upload.includes('TB_QA_EXTRA_USERS_JSON'));
 assert(!upload.includes('cookies'));
 assert.match(workflow,/if: always\(\)\s+run: \|\s+rm -rf \/__w\/_temp\/tb-interactive-private/);
});
test('separate extra-role failure cannot skip original seven-role check',()=>{
 assert.match(workflow,/id: preflight/);
 assert.match(workflow,/id: extra\s+if: \$\{\{ steps\.preflight\.outcome == 'success' \}\}/);
 assert.match(workflow,/id: run\s+if: \$\{\{ always\(\) && steps\.preflight\.outcome == 'success' \}\}/);
 assert.match(workflow,/always\(\) && \(steps\.run\.outcome != 'skipped' \|\| steps\.extra\.outcome != 'skipped'\)/);
});
test('both private contract suites execute before protected credential tests',()=>{
 const tests=workflow.indexOf('node --test scripts/qa/hosted-extra-contracts.test.mjs scripts/qa/hosted-role-guards.test.mjs');
 const credential=workflow.indexOf('      - name: Private credential and live health preflight');
 assert(tests>0&&credential>tests);
});
