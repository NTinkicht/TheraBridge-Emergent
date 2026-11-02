import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {BASE,ROLES,WIDTHS,blocked} from './hosted-readonly.mjs';
import {sanitizeReport,renderHtml,buildReport} from './build-hosted-report.mjs';

const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(32)]);
const filename='N-052-platform-320-_app.png';
function fixture(){
 const rows=Object.keys(ROLES).flatMap(role=>blocked(role,'fixture_pending'));
 rows[0]={...rows[0],status:'BLOCKED',reason:'geometry_ok_dialog_and_visual_review_pending',
  sessionCleanup:'CONFIRMED',pages:[{route:'/app',outcome:'PASS',issues:[],geometry:{viewport:320},
   screenshotPrivate:filename,screenshotHash:createHash('sha256').update(png).digest('hex')}]};
 return {schema:1,target:BASE,scope:'N-052..N-093 only',baseline104Unchanged:true,
  counts:{PASS:0,FAIL:0,BLOCKED:42},rows};
}
test('sanitizer emits only allowlisted fields and renders offline screenshot links',()=>{
 const input=fixture();
 input.rows[0].email='NEVER_EXPORT@example.invalid';
 input.rows[0].sessionCookie='NEVER_EXPORT_SESSION';
 input.rows[0].pages[0].unexpectedSensitiveField='NEVER_EXPORT_PRIVATE_FIXTURE';
 const {report,screenshots}=sanitizeReport(input);
 assert.deepEqual(screenshots,[filename]);
 assert(!JSON.stringify(report).includes('NEVER_EXPORT'));
 const html=renderHtml(report);
 assert(html.includes('screenshots/'+filename));
 assert(html.includes('visual acceptance'));
});
test('malformed filenames, roles, routes, case totals and cookie flags fail closed',()=>{
 const variants=[
  r=>{r.rows[0].pages[0].screenshotPrivate='../session.png';},
  r=>{r.rows[0].pages[0].route='https://malicious.invalid';},
  r=>{r.rows[0].role='other';},
  r=>{r.rows.pop();},
  r=>{r.rows[0].checks={browser:{sessionValue:'SECRET'}};},
  r=>{r.rows[0].status='PASS';}
 ];
 for(const mutate of variants){const r=fixture();mutate(r);assert.throws(()=>sanitizeReport(r));}
});
test('approved hyphenated guardian family-progress screenshot is accepted',()=>{
 const r=fixture();
 const guardian=r.rows.find(row=>row.role==='guardian'&&row.width===320);
 guardian.reason='geometry_ok_dialog_and_visual_review_pending';
 guardian.pages=[{route:'/app/family-progress',outcome:'PASS',issues:[],
  screenshotPrivate:'N-082-guardian-320-_app_family-progress.png',
  screenshotHash:createHash('sha256').update(png).digest('hex')}];
 assert.equal(sanitizeReport(r).screenshots.length,2);
});
test('artifact builder copies referenced PNGs only and writes HTML plus sanitized ledger',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tb-qa-report-'));
 try{
  const source=join(root,'source'),output=join(root,'output');await mkdir(source);
  await writeFile(join(source,'hosted-readonly-results.json'),JSON.stringify(fixture()));
  await writeFile(join(source,filename),png);
  await writeFile(join(source,'unreferenced-secret.txt'),'NEVER_EXPORT');
  assert.deepEqual(await buildReport(source,output),{counts:{PASS:0,FAIL:0,BLOCKED:42},screenshots:1});
  assert.deepEqual(await readFile(join(output,'screenshots',filename)),png);
  assert(!String(await readFile(join(output,'hosted-readonly-results.json'))).includes('NEVER_EXPORT'));
  await assert.rejects(readFile(join(output,'unreferenced-secret.txt')),{code:'ENOENT'});
  await assert.rejects(buildReport(source,output),{code:'EEXIST'});
  assert.deepEqual(await readFile(join(output,'screenshots',filename)),png);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('tampered PNG with valid header but wrong SHA-256 is rejected',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tb-qa-report-hash-'));
 try{
  const source=join(root,'source');await mkdir(source);
  await writeFile(join(source,'hosted-readonly-results.json'),JSON.stringify(fixture()));
  const tampered=Buffer.from(png);tampered[20]^=1;
  await writeFile(join(source,filename),tampered);
  await assert.rejects(buildReport(source,join(root,'output')),/invalid_png_evidence/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('builder rejects non-PNG content rather than publishing arbitrary files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tb-qa-report-bad-'));
 try{
  const source=join(root,'source');await mkdir(source);
  await writeFile(join(source,'hosted-readonly-results.json'),JSON.stringify(fixture()));
  await writeFile(join(source,filename),'NOT_A_PNG_SECRET');
  await assert.rejects(buildReport(source,join(root,'output')),/invalid_png_evidence/);
 }finally{await rm(root,{recursive:true,force:true});}
});
