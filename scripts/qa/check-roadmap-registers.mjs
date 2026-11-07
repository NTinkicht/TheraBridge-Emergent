#!/usr/bin/env node
/**
 * M4-01 static roadmap register integrity check.
 * Does NOT assert implementation, clinical sign-off, or hosted acceptance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
function csvRows(file) {
  const source=fs.readFileSync(path.join(root,'docs/roadmap',file),'utf8');
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(quoted){
      if(c==='"' && source[i+1]==='"'){value+='"';i++;continue;}
      if(c==='"'){quoted=false;continue;}
      value+=c;continue;
    }
    if(c==='"'){quoted=true;continue;}
    if(c===','){row.push(value);value='';continue;}
    if(c==='\n'){row.push(value.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];value='';continue;}
    value+=c;
  }
  if(quoted)throw new Error(file+': unterminated CSV quoted value');
  if(value.length||row.length){row.push(value);if(row.some(Boolean))rows.push(row);}
  const [header,...data]=rows;
  for(const [idx,r] of data.entries()){if(r.length!==header.length)throw new Error(file+': malformed CSV row '+(idx+2));}
  return {header,data};
}
const sets=[
 ['M4-01-66-FEATURE-CROSSWALK.csv',66,'original_id'],
 ['M4-01-91-WORKFLOW-REGISTER.csv',91,'workflow_id'],
 ['M4-01-55-OWNER-REQUIREMENTS.csv',55,'requirement_id']
];
for(const [filename,expected,key] of sets){
  const {header,data}=csvRows(filename);
  if(data.length!==expected)throw new Error(filename+': expected '+expected+' found '+data.length);
  const i=header.indexOf(key),st=header.indexOf('reconciliation_state');
  if(i<0||st<0)throw new Error(filename+': missing key/status column');
  const ids=data.map(r=>r[i]);if(new Set(ids).size!==expected)throw new Error(filename+': repeated IDs');
  if(data.some(r=>!r[st]))throw new Error(filename+': empty status');
  if(key==='original_id' && ids.some((id,j)=>Number(id)!==j+1))throw new Error('66-feature register is not sequential');
  if(key==='workflow_id' && (!ids.includes('WF-X6')||data.find(r=>r[i]==='WF-X6')[header.indexOf('v1_scope')]!=='V2 EXCLUDED'))throw new Error('WF-X6 must remain V2 excluded');
  if(key==='requirement_id' && ids.some((id,j)=>id!==`OB-${String(j+1).padStart(2,'0')}`))throw new Error('Owner IDs not consecutive');
  process.stdout.write(filename+': '+data.length+' unique entries OK\n');
}
process.stdout.write('M4-01 register structure PASSED (not clinical/implementation qualification)\n');
