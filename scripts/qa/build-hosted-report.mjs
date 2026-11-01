// Build a short-lived, restricted artifact from the fixed fictional hosted demo.
// Copy only explicitly referenced PNGs and allowlisted, non-secret report fields.
import {readFile,readdir,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BASE,ROLES,WIDTHS} from './hosted-readonly.mjs';

const STATES=new Set(['PASS','FAIL','BLOCKED']);
const CLEANUP=new Set(['CONFIRMED','UNCONFIRMED','NOT_AUTHENTICATED']);
const SAFE_FILE=/^N-\d{3}-(platform|admin|coordinator|speech|ot|supervisor|guardian)-(320|390|768|1024|1440)-_[A-Za-z0-9_]+\.png$/;
const SAFE_CODE=/^[a-z][a-z0-9_]*$/;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function cleanCodes(values){
 if(!Array.isArray(values)||values.some(x=>typeof x!=='string'||!SAFE_CODE.test(x)))throw Error('unsafe_issue_code');
 return values;
}
function cleanGeometry(g){
 if(g===null||g===undefined)return null;
 const keys=['viewport','documentWidth','mainLeft','mainRight','mainVisible','headerVisible','navigationVisible'];
 if(typeof g!=='object'||Object.keys(g).some(k=>!keys.includes(k)))throw Error('unsafe_geometry');
 const result={};
 for(const key of keys){
  if(!(key in g))continue;
  if(typeof g[key]!==(['mainVisible','headerVisible','navigationVisible'].includes(key)?'boolean':'number')||
     (typeof g[key]==='number'&&!Number.isFinite(g[key])))throw Error('unsafe_geometry_value');
  result[key]=g[key];
 }
 return result;
}
function cleanChecks(checks){
 if(checks===undefined)return undefined;
 if(!checks||typeof checks!=='object'||Object.keys(checks).some(k=>!['header','browser'].includes(k)))throw Error('unsafe_cookie_checks');
 const result={};
 for(const [group,flags] of Object.entries(checks)){
  if(!flags||typeof flags!=='object')throw Error('unsafe_cookie_flags');
  result[group]={};
  for(const [name,ok] of Object.entries(flags)){
   if(!/^[A-Za-z][A-Za-z0-9]*$/.test(name)||typeof ok!=='boolean')throw Error('unsafe_cookie_flag');
   result[group][name]=ok;
  }
 }
 return result;
}
export function sanitizeReport(raw){
 if(raw?.schema!==1||raw?.target!==BASE||!Array.isArray(raw.rows)||raw.rows.length!==42||
    raw?.scope!=='N-052..N-093 only'||raw.baseline104Unchanged!==true)throw Error('invalid_hosted_ledger');
 const expected=new Set(Array.from({length:42},(_,i)=>'N-'+String(i+52).padStart(3,'0')));
 const screenshots=new Set();
 const rows=raw.rows.map(row=>{
  if(!expected.delete(row.id)||!Object.hasOwn(ROLES,row.role)||!STATES.has(row.status)||
    !CLEANUP.has(row.sessionCleanup??'NOT_AUTHENTICATED'))throw Error('invalid_ledger_row');
  const c=ROLES[row.role];
  if(row.id!==('N-'+String(row.width===undefined?c.cookie:c.start+WIDTHS.indexOf(row.width)).padStart(3,'0'))||
    (row.width!==undefined&&!WIDTHS.includes(row.width)))throw Error('role_case_mismatch');
  if(typeof row.reason!=='string'||!SAFE_CODE.test(row.reason))throw Error('unsafe_reason');
  if(row.diagnostic!==undefined&&!SAFE_CODE.test(row.diagnostic))throw Error('unsafe_diagnostic');
  const pages=row.pages?.map(p=>{
   if(!c.routes.includes(p.route)||!STATES.has(p.outcome))throw Error('unsafe_route');
   const clean={route:p.route,outcome:p.outcome,issues:cleanCodes(p.issues??[]),geometry:cleanGeometry(p.geometry)};
   if(p.screenshotPrivate!==undefined){
    if(!SAFE_FILE.test(p.screenshotPrivate)||!p.screenshotPrivate.startsWith(row.id+'-'+row.role+'-'+row.width+'-')||
      !/^[a-f0-9]{64}$/.test(p.screenshotHash??''))throw Error('unsafe_screenshot_reference');
    screenshots.add(p.screenshotPrivate);
    clean.screenshot='screenshots/'+p.screenshotPrivate;
    clean.screenshotHash=p.screenshotHash;
   }
   return clean;
  });
  const clean={id:row.id,role:row.role,status:row.status,reason:row.reason,
   sessionCleanup:row.sessionCleanup??'NOT_AUTHENTICATED'};
  if(row.width!==undefined)clean.width=row.width;
  if(row.diagnostic!==undefined)clean.diagnostic=row.diagnostic;
  if(row.checks!==undefined)clean.checks=cleanChecks(row.checks);
  if(pages!==undefined)clean.pages=pages;
  return clean;
 });
 if(expected.size)throw Error('missing_ledger_rows');
 const counts=Object.fromEntries(['PASS','FAIL','BLOCKED'].map(s=>[s,rows.filter(r=>r.status===s).length]));
 if(JSON.stringify(counts)!==JSON.stringify(raw.counts))throw Error('invalid_report_counts');
 const sha=/^[a-f0-9]{40}$/.test(raw.claimedDeploymentSha??'')?raw.claimedDeploymentSha:null;
 return {report:{schema:1,target:BASE,scope:raw.scope,baseline104Unchanged:true,
  claimedDeploymentSha:sha,deploymentIndependentlyVerified:false,counts,rows,
  caution:'Synthetic-only automated evidence. Visual/dialog acceptance and #61 baseline require independent review.'},
  screenshots:[...screenshots].sort()};
}
export function renderHtml(report){
 const tr=report.rows.map(row=>{
  const details=(row.pages??[]).map(p=>{
   const link=p.screenshot?` <a href="${escapeHtml(p.screenshot)}">screenshot</a>`:'';
   return `<li>${escapeHtml(p.route)}: ${escapeHtml(p.outcome)} (${escapeHtml(p.issues.join(', ')||'geometry OK')})${link}</li>`;
  }).join('');
  return `<tr><td>${escapeHtml(row.id)}</td><td>${escapeHtml(row.role)}</td><td>${row.width??'cookie'}</td><td class="${escapeHtml(row.status.toLowerCase())}">${escapeHtml(row.status)}</td><td>${escapeHtml(row.reason)}${details?`<details><summary>Page checks</summary><ul>${details}</ul></details>`:''}</td></tr>`;
 }).join('\n');
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TheraBridge Synthetic QA</title><style>body{font:16px system-ui;max-width:1200px;margin:2rem auto;padding:0 1rem;color:#15313a}table{border-collapse:collapse;width:100%}th,td{border:1px solid #b9c8ce;padding:.6rem;text-align:left;vertical-align:top}th{background:#eef5f6}.pass{color:#176b3a}.fail{color:#a21d23}.blocked{color:#825500}li{margin:.3rem 0}a{color:#0f5692}</style></head><body><h1>TheraBridge · synthetic hosted QA</h1><p>PASS ${report.counts.PASS} · FAIL ${report.counts.FAIL} · BLOCKED ${report.counts.BLOCKED}</p><p><strong>Not a clinical release or visual acceptance certificate.</strong> The 104-case baseline stays unchanged until independent review. Browser screenshots may only show fictional test data.</p><table><thead><tr><th>Case</th><th>Role</th><th>Viewport</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${tr}</tbody></table></body></html>`;
}
export async function buildReport(source,destination){
 const input=resolve(source),output=resolve(destination);
 if(input===output||output.startsWith(input+'/'))throw Error('unsafe_report_output');
 const raw=JSON.parse(await readFile(join(input,'hosted-readonly-results.json'),'utf8'));
 const {report,screenshots}=sanitizeReport(raw);
 const names=new Set(await readdir(input));
 for(const name of screenshots){
  if(!names.has(name))throw Error('missing_screenshot');
  const image=await readFile(join(input,name));
  if(image.length<24||image.length>12*1024*1024||!image.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))
   throw Error('invalid_png_evidence');
 }
 await mkdir(join(output,'screenshots'),{recursive:true,mode:0o700});
 for(const name of screenshots)await copyFile(join(input,name),join(output,'screenshots',name));
 await writeFile(join(output,'hosted-readonly-results.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
 await writeFile(join(output,'index.html'),renderHtml(report),{mode:0o600,flag:'wx'});
 return {counts:report.counts,screenshots:screenshots.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 buildReport(process.argv[2],process.argv[3]).then(({counts,screenshots})=>
  console.log('Synthetic-only sanitized report prepared: '+JSON.stringify({counts,screenshots})))
  .catch(()=>{console.error('Synthetic QA report sanitization failed; no evidence uploaded.');process.exitCode=2;});
}
