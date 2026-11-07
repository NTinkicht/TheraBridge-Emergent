#!/usr/bin/env node
// M4-08: structural QA inventory, NOT an application-wide coverage percentage.
// Print only paths and counts. Actual coverage must come from Istanbul/Jest.
import fs from 'node:fs';
import path from 'node:path';

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

const root=path.resolve(process.cwd());
function names(dir,filter){
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true})
    .filter(x=>x.isFile()&&filter(x.name)).map(x=>x.name).sort();
}
export function baseline(){
  const api=JSON.parse(fs.readFileSync(path.join(root,'apps/api/package.json'),'utf8'));
  const web=JSON.parse(fs.readFileSync(path.join(root,'apps/web/package.json'),'utf8'));
  const ci=fs.readFileSync(path.join(root,'.github/workflows/ci.yml'),'utf8');
  const apiTests=names('apps/api/test',n=>n.endsWith('.e2e-spec.ts'));
  const webTests=names('apps/web/test',n=>n.endsWith('.test.mjs'));
  if(apiTests.length<30)throw Error('API test suite inventory unexpectedly contracted');
  if(webTests.length<2)throw Error('Web test suite inventory unexpectedly contracted');
  if(!api.scripts?.test?.includes('jest')||!web.scripts?.test?.includes('node --test'))
    throw Error('API or web test command missing');
  const core=api.scripts?.['test:coverage:core']||'';
  const thresholds=coreThresholds(core);
  const jobs=workflowJobNames(ci);
  for(const j of JOBS){
    if(!jobs.has(j))throw Error('Missing required CI job '+j);
  }
  return {
    kind:'qa_suite_inventory_not_coverage',
    api_suite_count:apiTests.length,
    web_suite_count:webTests.length,
    measured_threshold_scope:'apps/api/src/common/fingerprints.ts ONLY',
    existing_core_thresholds:thresholds,
    application_wide_coverage_percent:null,
    application_wide_95_percent_gate:false,
    six_required_jobs:JOBS
  };
}
if(process.argv[1]?.endsWith('/check-ci-test-inventory.mjs')){
  try{console.log(JSON.stringify(baseline()));}
  catch(e){console.error(e.message);process.exitCode=1;}
}
