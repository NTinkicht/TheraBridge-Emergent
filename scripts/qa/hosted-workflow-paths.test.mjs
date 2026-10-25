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
  '/__w/_temp/tb-hosted-cleartext.tar.gz',
  '/__w/_temp/therabridge-hosted-evidence.tbqa'
 ];
 for(const p of expected)assert(workflow.includes(p),'missing shared path '+p);
});
test('blocked collector results are written and still encrypted before being marked incomplete',()=>{
 assert.match(workflow,/id: collect/);
 assert.match(workflow,/set \+e\s+node scripts\/qa\/hosted-readonly\.mjs\s+exit_code=\$\?/);
 assert.match(workflow,/mkdir -p "\/__w\/_temp\/tb-hosted-private"/);
 assert.match(workflow,/printf '%s\\n' "\$exit_code" > "\/__w\/_temp\/tb-hosted-private\/collector-exit"/);
 for(const step of ['Encrypt evidence before upload','Upload ONLY AES-256-GCM ciphertext','Do not mark visual acceptance PASS automatically']){
  const part=workflow.slice(workflow.indexOf('      - name: '+step));
  assert(part.startsWith('      - name: '+step+'\n        if: ${{ always() && steps.collect.outcome == \'success\' }}'),'must continue after prior failure: '+step);
 }
 assert(workflow.indexOf('Encrypt evidence before upload')<workflow.indexOf('Upload ONLY AES-256-GCM ciphertext'));
 assert(workflow.indexOf('Upload ONLY AES-256-GCM ciphertext')<workflow.indexOf('Do not mark visual acceptance PASS automatically'));
 assert.match(workflow,/INCOMPLETE: evidence encrypted and uploaded; #61 baseline remains unchanged/);
});
test('never upload plaintext and always delete private material',()=>{
 const upload=workflow.slice(workflow.indexOf('      - name: Upload ONLY'),workflow.indexOf('      - name: Do not mark'));
 assert(!upload.includes('tb-hosted-cleartext.tar.gz'));
 assert(!upload.includes('tb-hosted-private/evidence'));
 assert.match(workflow,/if: always\(\)\s+run: \|\s+rm -rf "\/__w\/_temp\/tb-hosted-private"/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
});
