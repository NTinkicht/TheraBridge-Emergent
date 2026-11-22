import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const yaml=readFileSync('.github/workflows/ci.yml','utf8');

test('all original six checks plus required commercial job are preserved and verifier is always scheduled',()=>{
 for(const name of ['secret-scan','commercial-provenance','commercial-contracts','source-contracts','test','live-session','demo-journey','compose','preview-container'])
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
 for(const name of ['smart-plan','secret-scan','commercial-provenance','commercial-contracts','source-contracts','test','live-session','demo-journey',
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

test('all three Chromium-installing browser consumers may reuse only lockfile-scoped public Chromium binaries',()=>{
 const caches=[...yaml.matchAll(/name: Cache Playwright Chromium downloads/g)];
 assert.equal(caches.length,3);
 assert.equal([...yaml.matchAll(/key: tb-playwright-/g)].length,3);
 assert.equal([...yaml.matchAll(/yarn playwright install --with-deps chromium/g)].length,3,
   'Cached browsers must not bypass Playwright runtime/dependency validation');
});

test('independent commercial contract shard is required and all offline checks are preserved',()=>{
 const producer=yaml.slice(yaml.indexOf('\n  commercial-provenance:'),yaml.indexOf('\n  commercial-contracts:'));
 const checks=yaml.slice(yaml.indexOf('\n  commercial-contracts:'),yaml.indexOf('\n  test:'));
 const steps=[...checks.matchAll(/^      - name: (.+)$/gm)].map(m=>m[1]);
 assert(steps.length>=33,'missing contract steps');
 assert.equal((checks.match(/run: node --test scripts\/commercial\//g)||[]).length>=31,true);
 assert.match(producer,/Archive installed license evidence for full CI/);
 assert.match(producer,/Batch reconcile WU-LIC-01/);
 assert.match(checks,/if: needs\.smart-plan\.outputs\.mode == 'full'/);
 assert.match(yaml,/^      - commercial-contracts$/m);
});

test('Next.js cache never substitutes for exact-head builds or crosses CI job environments',()=>{
 const jobs=['test','live-session','demo-journey','m5-child360-browser'];
 for(let i=0;i<jobs.length;i++){
  const begin=yaml.indexOf('\n  '+jobs[i]+':');
  const next= i+1<jobs.length ? yaml.indexOf('\n  '+jobs[i+1]+':',begin+1) :
   yaml.indexOf('\n  compose:',begin+1);
  assert(begin>=0&&next>begin);
  const section=yaml.slice(begin,next);
  assert.match(section,/path: apps\/web\/\.next\/cache/);
  assert.match(section,/tb-next-v2-/);
  assert.match(section,/hashFiles\('yarn\.lock'\) \}\}-\$\{\{ hashFiles\('apps\/web\/src\/\*\*'/);
  assert.match(section,/restore-keys: \|/);
  assert.doesNotMatch(section,/path: apps\/web\/\.next\/(?:standalone|server|static)/);
  assert.match(section,new RegExp('tb-next-v2-\\$\\{\\{ runner\\.os \\}\\}-\\$\\{\\{ runner\\.arch \\}\\}-'+jobs[i].replace(/[-]/g,'\\$&')));
  assert.match(section,/run: yarn workspace @therabridge\/web build/);
  assert.doesNotMatch(section,/path: apps\/web\/\.next(?:\/standalone|\/server)?\s*$/m);
 }
 assert.equal((yaml.match(/name: Cache untrusted Next\.js compiler intermediates/g)||[]).length,4);
});

test('source-only architecture and governance validation runs as independently required full job',()=>{
 const source=yaml.slice(yaml.indexOf('\n  source-contracts:'),yaml.indexOf('\n  test:'));
 const runtime=yaml.slice(yaml.indexOf('\n  test:'),yaml.indexOf('\n  live-session:'));
 assert.match(source,/needs: smart-plan/);
 assert.match(source,/if: needs\.smart-plan\.outputs\.mode == 'full'/);
 for(const anchor of [
  'Verify Smart CI classifier, policy gate and workflow wiring',
  'M5-01 source-only route',
  'M5-02 canonical 66/91',
  'Archive M5-01 source-only audit receipt',
  'M4-09 historical issue evidence register',
  'M4-03 independent credential generator and recovery tests',
  'M4-02 private hosted scope and workflow safety regressions'
 ]) {
   assert(source.includes(anchor),'original source validation lost: '+anchor);
   assert(!runtime.includes(anchor),'source validation unexpectedly serial in test: '+anchor);
 }
 assert.match(runtime,/yarn install --frozen-lockfile/);
 assert.match(runtime,/run: yarn workspace @therabridge\/api typecheck/);
 assert.match(runtime,/Generate genuine full-scope Web Istanbul coverage/);
 assert.match(runtime,/run: yarn workspace @therabridge\/web build/);
 assert.match(yaml,/^      - source-contracts$/m);
});


test('PR preview overlap is distinctly labeled and cannot replace exact-SHA endurance on main or release tags',()=>{
  const preview=yaml.slice(yaml.indexOf('\n  preview-container:'),yaml.indexOf('\n  smart-targeted:'));
  assert.match(preview,/PR 200-second overlapping 1\/4\/8 synthetic API smoke/);
  assert.match(preview,/run: node scripts\/qa\/m4-pr-overlap-http\.mjs/);
  assert.match(preview,/run: node --test scripts\/qa\/m4-pr-overlap-receipt\.test\.mjs/);
  assert.match(preview,/run: node scripts\/qa\/m4-pr-overlap-receipt\.mjs/);
  assert.match(preview,/PR 200-second overlap smoke \(NOT M4-07 endurance or SLA\)/);
  assert.match(preview,/M4-07 sustained 10-minute synthetic API load/);
  assert.match(preview,/run: node scripts\/qa\/m4-local-sustained-http\.mjs/);
  assert.match(preview,/run: node scripts\/qa\/m4-sustained-receipt\.mjs/);
  assert.match(preview,/if: github\.event_name == 'pull_request'/);
  assert.match(preview,/if: github\.event_name != 'pull_request'/);
  assert.equal((preview.match(/name: M4-07 sustained 10-minute/g)||[]).length,1);
  assert.equal((preview.match(/name: PR 200-second overlapping/g)||[]).length,1);
  assert.match(yaml,/tags: \["v\*"\]/);
  assert.match(yaml,/schedule:\n    - cron:/);
  assert.match(yaml,/^      - preview-container$/m);
});
test('verified cache cannot bypass full exact-HEAD Docker image, image layer ban or SBOM',()=>{
  const preview=yaml.slice(yaml.indexOf('\n  preview-container:'),yaml.indexOf('\n  smart-targeted:'));
  assert.match(preview,/docker\/setup-buildx-action@v3/);
  assert.match(preview,/docker\/build-push-action@v6/);
  assert.match(preview,/file: Dockerfile\.preview/);
  assert.match(preview,/load: true/);
  assert.match(preview,/push: false/);
  assert.match(preview,/cache-from: type=gha,scope=therabridge-unified-preview/);
  assert.match(preview,/Verify no preview image layer ships sharp\/libvips/);
  assert.match(preview,/anchore\/sbom-action@v0/);
  assert.match(preview,/check-sbom\.mjs \/tmp\/therabridge-preview-image\.cdx\.json image/);
  assert.match(preview,/docker run -d --name tb-preview-ci --network host --memory 512m --memory-swap 512m/);
});


test('browser regressions remain required and run parallel to the main API/Web coverage worker',()=>{
  const app=yaml.slice(yaml.indexOf('\n  test:'),yaml.indexOf('\n  live-session:'));
  const live=yaml.slice(yaml.indexOf('\n  live-session:'),yaml.indexOf('\n  demo-journey:'));
  for(const run of ['node scripts/design/check-preview-entry.mjs',
     'node scripts/design/m5-table-keyboard.mjs',
     'node scripts/design/check-session-workflow.mjs']){
    assert.match(live,new RegExp(run.replaceAll('.','\\.')));
    assert(!app.includes(run),'not serial on test critical path: '+run);
  }
  assert.match(live,/name: Session editor responsive DOM and synthetic dictation regression/);
  assert.match(live,/name: Real two-tab browser → API → PostgreSQL synthetic regression/);
  assert.match(live,/yarn workspace @therabridge\/web build/);
  assert.match(live,/yarn playwright install --with-deps chromium/);
  assert.match(yaml,/^      - live-session$/m);
});
