#!/usr/bin/env node
// M4-08: structural QA inventory, NOT an application-wide coverage percentage.
// Print only paths and counts. Actual coverage must come from Istanbul/Jest.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export const JOBS=['secret-scan','test','live-session','demo-journey','preview-container','compose'];

export function coreThresholds(command) {
  if(typeof command!=='string'||!/(?:^|\s)--coverage(?:\s|$)/.test(command))
    throw Error('Measured core coverage gate removed');
  if(!/(?:^|\s)--collectCoverageFrom=src\/common\/fingerprints\.ts(?=\s|$)/.test(command))
    throw Error('Fingerprint-only collection scope has changed');
  const quoted=command.match(/--coverageThreshold='([^']+)'/);
  if(!quoted)throw Error('Coverage threshold configuration missing');
  let parsed;
  try{parsed=JSON.parse(quoted[1]);}catch{throw Error('Invalid coverage JSON');}
  const t=parsed?.global;
  if(!t||typeof t!=='object'||Object.keys(t).sort().join(',')!=='branches,functions,lines,statements')
    throw Error('Coverage threshold dimensions changed');
  const minimum={statements:95,branches:90,functions:95,lines:95};
  for(const [key,value] of Object.entries(minimum)){
    if(!Number.isFinite(t[key])||t[key]<value)
      throw Error('Weakened '+key+' fingerprint coverage threshold');
  }
  return Object.fromEntries(Object.keys(minimum).map(key=>[key,t[key]]));
}
export function workflowJobNames(yaml) {
  // Our workflow uses direct, two-space-indented YAML job keys. Only parse
  // the top-level jobs mapping; environment keys must never substitute jobs.
  const lines=yaml.split(/\r?\n/);
  const start=lines.findIndex(line=>/^jobs:\s*$/.test(line));
  if(start<0)throw Error('CI jobs mapping missing');
  const found=new Set();
  for(let i=start+1;i<lines.length;i++){
    const line=lines[i];
    if(line.trim()&&!/^\s/.test(line)&&!/^#/.test(line))break;
    const match=/^  ([a-z][a-z0-9-]*):\s*(?:#.*)?$/.exec(line);
    if(match)found.add(match[1]);
  }
  return found;
}


// A green CI label cannot be substituted for a disabled or partial secrets scan.
// Keep these checks tied to the actual checked-in workflow, not handover prose.
export function secretScanContract(yaml) {
  const start=yaml.indexOf('\n  secret-scan:\n');
  const end=start<0?-1:yaml.indexOf('\n  test:\n',start);
  if(start<0||end<0)throw Error('Required secret-scan job layout missing');
  const block=yaml.slice(start,end);
  const requirements=[
    [/\bfetch-depth:\s*0\b/,'full Git history checkout'],
    [/\bGITLEAKS_VERSION:\s*\d+\.\d+\.\d+\b/,'pinned gitleaks version'],
    [/\bGITLEAKS_SHA256:\s*[a-f0-9]{64}\b/,'pinned gitleaks checksum'],
    [/sha256sum\s+-c\s+-/,'checksum verification'],
    [/gitleaks git \. .*--log-opts="--all"/,'all-ref history scan'],
    [/gitleaks dir \. .*--redact=100/,'tracked checkout scan'],
    [/--redact=100/,'redacted scan output'],
    [/exit\s+"\$result"/,'nonzero result propagation']
  ];
  for(const [pattern,label] of requirements)
    if(!pattern.test(block))throw Error('Secret scanning missing '+label);
  if(/continue-on-error:\s*true/.test(block)||/\|\|\s*true/.test(block))
    throw Error('Secret scanning must fail closed');
  return true;
}
// Python 3.11+ ships a standards-compliant TOML parser on CI's Ubuntu image.
// No additional package, external request or gitleaks download is required.
export function validateGitleaksToml(contents) {
  if(typeof contents!=='string'||!contents.includes('[[rules]]'))
    throw Error('Gitleaks TOML missing custom rules');
  const proc=spawnSync('python3',['-c',
    'import sys,tomllib; x=tomllib.loads(sys.stdin.read()); assert len(x.get("rules", [])) >= 2'
  ],{input:contents,encoding:'utf8',timeout:5000});
  if(proc.error||proc.status!==0)
    throw Error('Gitleaks TOML syntax or rule structure invalid');
  return true;
}

const root=path.resolve(process.cwd());
function names(dir,filter){
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true})
    .filter(x=>x.isFile()&&filter(x.name)).map(x=>x.name).sort();
}
// The source-controlled suite snapshot is an integrity floor, not a percentage.
// Additions remain allowed and visible, but a missing or renamed suite fails
// until a reviewer explicitly updates this versioned baseline.
export function compareSuiteInventory(expected,current,kind) {
  if(!Array.isArray(expected)||!expected.length||!expected.every(v=>typeof v==='string')||
     new Set(expected).size!==expected.length||expected.some((v,i)=>i>0&&v<=expected[i-1]))
    throw Error('Invalid '+kind+' suite snapshot');
  if(!Array.isArray(current)||new Set(current).size!==current.length)
    throw Error('Invalid current '+kind+' suite inventory');
  const have=new Set(current),pinned=new Set(expected);
  const missing=expected.filter(name=>!have.has(name));
  if(missing.length)throw Error(kind+' reviewed suite missing or renamed: '+missing.join(', '));
  return current.filter(name=>!pinned.has(name)).sort();
}

export function baseline(){
  const api=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
  const web=JSON.parse(fs.readFileSync(path.join(root,'apps/web/package.json'),'utf8'));
  const ci=fs.readFileSync(path.join(root,'.github/workflows/ci.yml'),'utf8');
  const apiTests=names('apps/api/test',n=>n.endsWith('.e2e-spec.ts'));
  const webTests=names('apps/web/test',n=>n.endsWith('.test.mjs'));
  const suiteSnapshot=JSON.parse(fs.readFileSync(path.join(root,'docs/qa/M4-08-REVIEWED-SUITE-BASELINE.json'),'utf8'));
  if(suiteSnapshot.schemaVersion!==1||!/^\d{4}-\d{2}-\d{2}$/.test(suiteSnapshot.recordedOn)||
    !/^[0-9a-f]{40}$/.test(suiteSnapshot.sourceCommit)||suiteSnapshot.applicationCoverageMeasured!==false)
    throw Error('Invalid reviewed suite baseline metadata');
  const newApi=compareSuiteInventory(suiteSnapshot.apiSuites,apiTests,'API');
  const newWeb=compareSuiteInventory(suiteSnapshot.webSuites,webTests,'Web');
  if(!api.scripts?.test?.includes('jest')||!web.scripts?.test?.includes('node --test'))
    throw Error('API or web test command missing');
  const core=api.scripts?.['test:coverage:core']||'';
  const thresholds=coreThresholds(core);
  secretScanContract(ci);
  validateGitleaksToml(fs.readFileSync(path.join(root,'.gitleaks.toml'),'utf8'));
  const jobs=workflowJobNames(ci);
  for(const j of JOBS){
    if(!jobs.has(j))throw Error('Missing required CI job '+j);
  }
  return {
    kind:'qa_suite_inventory_not_coverage',
    api_suite_count:apiTests.length,
    web_suite_count:webTests.length,
    reviewed_suite_baseline_commit:suiteSnapshot.sourceCommit,
    reviewed_suite_baseline_date:suiteSnapshot.recordedOn,
    newly_added_api_suites:newApi,
    newly_added_web_suites:newWeb,
    measured_threshold_scope:'apps/api/src/common/fingerprints.ts ONLY',
    existing_core_thresholds:thresholds,
    application_wide_coverage_percent:null,
    application_wide_95_percent_gate:false,
    secret_scan_contract_validated:true,
    six_required_jobs:JOBS
  };
}
if(process.argv[1]?.endsWith('/check-ci-test-inventory.mjs')){
  try{console.log(JSON.stringify(baseline()));}
  catch(e){console.error(e.message);process.exitCode=1;}
}
