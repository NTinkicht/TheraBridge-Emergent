import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const yaml=readFileSync('.github/workflows/ci.yml','utf8');

test('all original six checks plus required commercial job are preserved and verifier is always scheduled',()=>{
 for(const name of ['secret-scan','commercial-provenance','test','live-session','demo-journey','compose','preview-container'])
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
 const scan=yaml.slice(yaml.indexOf('\n  secret-scan:'),yaml.indexOf('\n  commercial-provenance:'));
 assert.doesNotMatch(scan,/^\s+if:/m);
 assert.match(yaml,/test:\n    needs: smart-plan\n    if: needs\.smart-plan\.outputs\.mode == 'full'/);
 assert.match(yaml,/compose:\n    timeout-minutes: 25\n    runs-on: ubuntu-24\.04\n    # Compose is independently required by smart-ci-gate; do not serialize on test\.\n    needs: smart-plan\n    if: needs\.smart-plan\.outputs\.mode == 'full'/);
});
test('always-running gate accounts for all possible worker jobs',()=>{
 const gate=yaml.slice(yaml.indexOf('\n  smart-ci-gate:'));
 for(const name of ['smart-plan','secret-scan','commercial-provenance','test','live-session','demo-journey',
   'compose','preview-container','smart-targeted','sbom','m5-child360-browser'])
  assert.match(gate,new RegExp('^      - '+name+'$','m'));
 assert.match(gate,/run: node scripts\/ci\/smart-ci-gate\.mjs/);
});

test('parallel commercial provenance is required and never silently skipped in full mode',()=>{
 const commercial=yaml.slice(yaml.indexOf('\n  commercial-provenance:'),yaml.indexOf('\n  test:'));
 const app=yaml.slice(yaml.indexOf('\n  test:'),yaml.indexOf('\n  live-session:'));
 assert.match(commercial,/if: needs\.smart-plan\.outputs\.mode == 'full'/);
 assert.match(commercial,/yarn install --frozen-lockfile/);
 assert.match(commercial,/Collect installed package license-file hashes/);
 assert.match(commercial,/Generate fail-closed COM-02 per-component commercial rights and release blocker ledger/);
 assert.match(commercial,/Archive installed license evidence for full CI/);
 assert.doesNotMatch(app,/Collect installed package license-file hashes/);
 assert.doesNotMatch(app,/Archive installed license evidence for full CI/);
 assert.match(app,/run: yarn workspace @therabridge\/api build/);
 assert.match(app,/Generate genuine full-scope Web Istanbul coverage/);
 assert.match(yaml,/^  smart-ci-gate:[\s\S]*^      - commercial-provenance$/m);
});

test('all four browser consumers may reuse only lockfile-scoped public Chromium binaries',()=>{
 const caches=[...yaml.matchAll(/name: Cache Playwright Chromium downloads/g)];
 assert.equal(caches.length,4);
 assert.equal([...yaml.matchAll(/key: tb-playwright-/g)].length,4);
 assert.equal([...yaml.matchAll(/yarn playwright install --with-deps chromium/g)].length,4,
   'Cached browsers must not bypass Playwright runtime/dependency validation');
});
