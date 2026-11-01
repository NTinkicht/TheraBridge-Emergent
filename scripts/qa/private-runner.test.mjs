import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encryptFile,decryptFile,keyBytes} from './evidence-crypto.mjs';
import {verifySyntheticUsers,prepare,publicHealth} from './prepare-hosted-run.mjs';
import {ROLES} from './hosted-readonly.mjs';

const sample=Object.fromEntries(Object.keys(ROLES).map(r=>[r,{
 email:r+'@synthetic.example.invalid',password:'ci_only_test',
}]));
const key='a'.repeat(64);
test('synthetic role preflight requires seven distinct records but no evidence key',async()=>{
 assert.equal(Object.keys(verifySyntheticUsers(JSON.stringify(sample))).length,7);
 assert.throws(()=>verifySyntheticUsers('{}'),/all_seven_role_keys_required/);
 assert.throws(()=>verifySyntheticUsers('{invalid'),/invalid_private_users_json/);
 assert.throws(()=>verifySyntheticUsers(JSON.stringify({...sample,ot:sample.speech})),/duplicate_role_email/);
 assert.throws(()=>keyBytes('garbage'),/invalid_256_bit/);
 const root=await mkdtemp(join(tmpdir(),'tb-qa-preflight-'));
 try{
  const f=await prepare({directory:join(root,'private'),raw:JSON.stringify(sample),
   expectedSha:'b'.repeat(40)});
  assert.equal((await stat(f)).mode&0o077,0,'credential file must not be group/world readable');
  assert.deepEqual(JSON.parse(await readFile(f,'utf8')),sample);
  await assert.rejects(prepare({directory:join(root,'wrong'),raw:JSON.stringify(sample),
   expectedSha:'unverified'}),/deployment_sha_input_required/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('hosted public health accepts JSON 200 only, never interstitial HTML',async()=>{
 const response=(status,type,body)=>({status,headers:new Headers({'content-type':type}),json:async()=>body});
 assert.equal(await publicHealth({fetchImpl:async()=>response(200,'application/json',
  {status:'ok',database:{status:'up'}}),attempts:1}),true);
 await assert.rejects(publicHealth({fetchImpl:async()=>response(200,'text/html',{}),attempts:1}),
  /hosted_public_health_unverified/);
 await assert.rejects(publicHealth({fetchImpl:async()=>response(502,'application/json',{}),attempts:1}),
  /hosted_public_health_unverified/);
});
test('authenticated ciphertext round-trips; wrong keys or tampering never leave plaintext',async()=>{
 const root=await mkdtemp(join(tmpdir(),'tb-qa-encryption-'));
 try{
  const source=join(root,'private-evidence.tar.gz'),encrypted=join(root,'receipt.tbqa');
  const output=join(root,'decrypted.tar.gz'),bad=join(root,'bad.tar.gz');
  const raw=Buffer.from('synthetic screenshot data with role metadata. '.repeat(500));
  await writeFile(source,raw,{mode:0o600});
  await encryptFile(source,encrypted,key);
  const ciphertext=await readFile(encrypted);
  assert.equal(ciphertext.subarray(0,5).toString(),'TBQA1');
  assert.equal(ciphertext.includes(Buffer.from('synthetic screenshot')),false);
  await decryptFile(encrypted,output,key);
  assert.deepEqual(await readFile(output),raw);
  // P2 regression: an EEXIST retry must never erase an established evidence file.
  await assert.rejects(decryptFile(encrypted,output,key),{code:'EEXIST'});
  assert.deepEqual(await readFile(output),raw);
  await assert.rejects(encryptFile(source,encrypted,key),{code:'EEXIST'});
  assert.deepEqual(await readFile(encrypted),ciphertext);
  const previouslySaved=join(root,'previously-saved.tar.gz');
  await writeFile(previouslySaved,'KEEP_ME_SAFE');
  await assert.rejects(decryptFile(join(root,'missing.tbqa'),previouslySaved,key));
  assert.equal(await readFile(previouslySaved,'utf8'),'KEEP_ME_SAFE');
  await assert.rejects(encryptFile(join(root,'missing.tar.gz'),previouslySaved,key),{code:'EEXIST'});
  assert.equal(await readFile(previouslySaved,'utf8'),'KEEP_ME_SAFE');
  await assert.rejects(decryptFile(encrypted,bad,'c'.repeat(64)));
  await assert.rejects(stat(bad),{code:'ENOENT'});
  ciphertext[22]^=1;
  const corrupt=join(root,'corrupt.tbqa');
  await writeFile(corrupt,ciphertext);
  await assert.rejects(decryptFile(corrupt,bad,key));
  await assert.rejects(stat(bad),{code:'ENOENT'});
 }finally{await rm(root,{recursive:true,force:true});}
});
