import test from 'node:test';
import assert from 'node:assert/strict';
import {attestHostedDeployment} from './hosted-render-attestation.mjs';
const sha='a'.repeat(40),other='b'.repeat(40);
const key='synthetic-test-token-placeholder-not-real';
const service={id:'srv-dbdbelfavr4c739ftdsg',repo:'https://github.com/NTinkicht/TheraBridge-Emergent',type:'web_service',autoDeploy:'no'};
const deploy={id:'dep-synthetic',status:'live',commit:{id:sha}};
const mock=(svc=service,deploys=[{deploy}])=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method,redirect:options.redirect,
    bearerUsed:options.headers.Authorization==='Bearer '+key});
  return {status:200,json:async()=>url.endsWith('?limit=10')?deploys:svc};
 };
 return {calls,fetchImpl};
};
const run=(fetchImpl,over={})=>attestHostedDeployment({key,operatorSha:sha,
 checkoutSha:sha,fetchImpl,...over});
test('read-only live control-plane SHA query succeeds and emits no API key or personal data',async()=>{
 const {calls,fetchImpl}=mock();const r=await run(fetchImpl);
 assert.equal(r.liveVerified,true);
 assert.equal(r.clinicalReleaseAuthorized,false);
 assert.equal(r.deployedSha,sha);
 assert.deepEqual(calls.map(x=>x.method),['GET','GET']);
 assert(calls.every(x=>x.bearerUsed&&x.redirect==='error'));
 assert(!JSON.stringify(r).includes(key));
});
test('operator SHA never substitutes for current checkout or missing credential',async()=>{
 const {fetchImpl,calls}=mock();
 await assert.rejects(run(fetchImpl,{checkoutSha:other}),/deployment_not_current_checkout/);
 await assert.rejects(run(fetchImpl,{key:''}),/credential_missing/);
 await assert.rejects(run(fetchImpl,{serviceId:'srv-unrelated'}),/unapproved_hosted_service/);
 assert.equal(calls.length,0);
});
test('service identity and repository origin cannot be redirected to a different app',async()=>{
 for(const bad of [{id:'other'}, {repo:'https://github.com/unrelated/repo'},
   {type:'static_site'}, {autoDeploy:'yes'}]){
  const {fetchImpl}=mock({...service,...bad});
  await assert.rejects(run(fetchImpl),/render_service_identity_mismatch/);
 }
});
test('live SHA must match and newer failed/pending deploy must not be ignored',async()=>{
 for(const deployments of [
  [{deploy:{...deploy,commit:{id:other}}}],
  [{deploy:{...deploy,status:'build_in_progress'}}],
  [{deploy:{...deploy,status:'failed'}},{deploy}],
  [{deploy},{deploy:{...deploy,id:'second-live'}}],
  [{deploy:{...deploy,id:null}}],[],
 ]){
  const {fetchImpl}=mock(service,deployments);
  await assert.rejects(run(fetchImpl),/render_live_sha_mismatch|render_live_deploy_ambiguous_or_stale/);
 }
});
test('Render HTTP failures and malformed payloads always fail closed',async()=>{
 await assert.rejects(run(async()=>({status:401,json:async()=>({})})),/render_api_unavailable/);
 const {fetchImpl}=mock(service,{unexpected:'not-array'});
 await assert.rejects(run(fetchImpl),/render_deployments_unavailable/);
});
