import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const yaml=readFileSync('.github/workflows/ci.yml','utf8');

test('old six CI names are preserved and verifier is always scheduled',()=>{
 for(const name of ['secret-scan','test','live-session','demo-journey','compose','preview-container'])
  assert.match(yaml,new RegExp('^  '+name+':','m'),name);
 assert.match(yaml,/^  smart-plan:/m);
 assert.match(yaml,/^  smart-targeted:/m);
 assert.match(yaml,/^  smart-ci-gate:\n    name: smart-ci-gate\n    if: always\(\)/m);
});
test('never turn targeted selection on without an explicit protected gate opt-in',()=>{
 assert.match(yaml,/TB_SMART_CI_MODE: \$\{\{ vars\.TB_SMART_CI_MODE \}\}/);
 assert.match(yaml,/TB_SMART_CI_REQUIRED_GATE_READY: \$\{\{ vars\.TB_SMART_CI_REQUIRED_GATE_READY \}\}/);
 assert.match(yaml,/fetch-depth: 0/);
 assert.match(yaml,/TB_SMART_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(yaml,/TB_SMART_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
});
test('secret scan remains unconditional and full workloads are conditional',()=>{
 const scan=yaml.slice(yaml.indexOf('\n  secret-scan:'),yaml.indexOf('\n  test:'));
 assert.doesNotMatch(scan,/^\s+if:/m);
 assert.match(yaml,/test:\n    needs: smart-plan\n    if: needs\.smart-plan\.outputs\.mode == 'full'/);
 assert.match(yaml,/compose:\n    timeout-minutes: 25\n    runs-on: ubuntu-24\.04\n    needs: \[smart-plan, test\]\n    if: needs\.smart-plan\.outputs\.mode == 'full'/);
});
test('always-running gate accounts for all possible worker jobs',()=>{
 const gate=yaml.slice(yaml.indexOf('\n  smart-ci-gate:'));
 for(const name of ['smart-plan','secret-scan','test','live-session','demo-journey',
   'compose','preview-container','smart-targeted','sbom'])
  assert.match(gate,new RegExp('^      - '+name+'$','m'));
 assert.match(gate,/run: node scripts\/ci\/smart-ci-gate\.mjs/);
});
