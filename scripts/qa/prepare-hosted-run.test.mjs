import test from 'node:test';
import assert from 'node:assert/strict';
import {publicHealth,verifySyntheticUsers} from './prepare-hosted-run.mjs';
const response=(status,contentType,data)=>({
 status,headers:{get:k=>k==='content-type'?contentType:null},
 json:async()=>data
});
test('hosted preflight accepts only real healthy JSON status and database up',async()=>{
 assert.equal(await publicHealth({url:'https://test.example',attempts:1,
  fetchImpl:async()=>response(200,'application/json',{status:'ok',database:{status:'up'}})}),true);
});
test('all failed health categories are safe identifiers with no URL, response body, or cookies',async()=>{
 const fixtures=[
  [async()=>{throw Error('secret-cookie/password: network failure')},'hosted_public_health_network_or_timeout'],
  [async()=>response(503,'text/html','SECRET'),'hosted_public_health_non_200_response'],
  [async()=>response(200,'text/html','SECRET'),'hosted_public_health_non_json_response'],
  [async()=>response(200,'application/json',{status:'ok',database:{status:'down'},secret:'SECRET'}),'hosted_public_health_unhealthy_json'],
  [async()=>({status:200,headers:{get:()=> 'application/json'},json:async()=>{throw Error('SECRET')}}),'hosted_public_health_invalid_json'],
 ];
 for(const [fetchImpl,expected] of fixtures){
  await assert.rejects(publicHealth({url:'https://private-secret.example',attempts:1,fetchImpl}),
   e=>e.message===expected&&!/secret|cookie|password|https?:/i.test(e.message));
 }
});
test('never accept 200 HTML, 200 JSON without database UP, or redirects as valid health',async()=>{
 for(const res of [
  response(302,'text/html',{}),
  response(200,'application/json',{status:'ok'}),
  response(200,'application/json',{status:'error',database:{status:'up'}})
 ]){
  await assert.rejects(publicHealth({attempts:1,fetchImpl:async()=>res}),/hosted_public_health/);
 }
});
test('private credential parser keeps seven-account strictness unchanged',()=>{
 assert.throws(()=>verifySyntheticUsers('{}'),/all_seven_role_keys_required/);
 assert.throws(()=>verifySyntheticUsers('not-json'),/invalid_private_users_json/);
});
