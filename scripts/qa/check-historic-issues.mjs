#!/usr/bin/env node
// Historical issue register integrity only; does NOT assert implementation.
import fs from 'node:fs';
import path from 'node:path';
const FILE=path.resolve('docs/roadmap/M4-09-HISTORICAL-ISSUE-DISPOSITIONS.csv');
const ALLOWED=new Set(['PENDING_EVIDENCE','VERIFIED_IMPLEMENTED','PARTIAL','MISSING','POLICY_BLOCKED','SUPERSEDED','DUPLICATE']);

const SNAPSHOT=path.resolve('docs/roadmap/M4-01-OPEN-ISSUE-SNAPSHOT.md');
export function frozenIssueIds(snapshot) {
  const ids=[...snapshot.matchAll(/^\| \[#(\d+)\]\(https:\/\/github\.com\/NTinkicht\/TheraBridge-Emergent\/issues\/\1\) \|/gm)].map(m=>m[1]);
  if(ids.length!==75||new Set(ids).size!==75)
    throw Error('Frozen historical issue snapshot is invalid');
  return new Set(ids);
}

export function validateRegister(csv) {
  const lines=csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  const header=lines.shift();
  if(header!=='historic_issue,issue_url,original_title,suggested_owner,disposition,implementation_sha,test_evidence,policy_evidence,reviewer,notes')
    throw Error('Historical audit register schema has changed');
  const rows=lines.map(line=>{
    // Historical titles may contain commas, but never newlines: quoted CSV is
    // parsed with escaped quote support and checked against header length.
    let q=false,v='',fields=[];
    for(let i=0;i<line.length;i++){let c=line[i];if(q){if(c==='"'&&line[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){fields.push(v);v='';}else v+=c;}
    if(q)throw Error('Unterminated row');fields.push(v);
    if(fields.length!==10)throw Error('Unexpected historical row column count');
    return fields;
  });
  if(rows.length!==75)throw Error('Expected exactly 75 historical issues');
  const ids=new Set();
  const frozen=frozenIssueIds(fs.readFileSync(SNAPSHOT,'utf8'));
  for(const r of rows){
    const [id,url,,owner,status,source,test,policy,reviewer]=r;
    // #167 opened the M4 roadmap; this register is ONLY the frozen pre-roadmap issues.
    if(!/^\d+$/.test(id) || +id>=167 || ids.has(id))throw Error('Duplicate/invalid issue id');
    ids.add(id);
    if(!frozen.has(id))throw Error('Register ID missing from frozen snapshot: '+id);
    if(url!==`https://github.com/NTinkicht/TheraBridge-Emergent/issues/${id}`)throw Error('Invalid historical issue URL');
    if(!/^(M4-0[4-9]|M5-10|M7-04)$/.test(owner))throw Error('Invalid suggested owner');
    if(!ALLOWED.has(status))throw Error('Invalid disposition');
    if(status==='VERIFIED_IMPLEMENTED' &&
      (!/^[0-9a-f]{40}$/i.test(source.trim()) || !test.trim() || !reviewer.trim()))
      throw Error('Verified issue without valid source SHA, test and reviewer');
    if(status==='POLICY_BLOCKED'&&!policy.trim())throw Error('Policy blocked without explicit evidence');
  }
  for(const id of frozen)if(!ids.has(id))throw Error('Frozen issue missing from register: '+id);
  return rows.length;
}
if(process.argv[1]?.endsWith('check-historic-issues.mjs')){
  try{console.log('M4-09 historical issues validated: '+validateRegister(fs.readFileSync(FILE,'utf8')));}
  catch(e){console.error(e.message);process.exitCode=1;}
}
