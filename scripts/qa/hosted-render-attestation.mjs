// M4-CLOSE-02: independently corroborate the actual LIVE Render deployment
// for the fixed synthetic demo. Never reveal API tokens, secrets or response
// payloads. A matching SHA does NOT prove two-tenant hosted acceptance.
const SERVICE='srv-dbdbelfavr4c739ftdsg';
const API='https://api.render.com/v1';
const SHA=/^[0-9a-f]{40}$/;
export async function attestHostedDeployment({
  key,operatorSha,checkoutSha,fetchImpl=fetch,serviceId=SERVICE
}={}){
  if(serviceId!==SERVICE)throw Error('unapproved_hosted_service');
  if(!SHA.test(operatorSha??'')||!SHA.test(checkoutSha??'')||
    operatorSha!==checkoutSha)throw Error('deployment_not_current_checkout');
  if(typeof key!=='string'||key.length<16)throw Error('render_readonly_credential_missing');
  const headers={Authorization:`Bearer ${key}`,Accept:'application/json'};
  const get=async url=>{
    const response=await fetchImpl(url,{method:'GET',headers,redirect:'error',
      signal:AbortSignal.timeout(15000)});
    if(!response || response.status!==200)throw Error('render_api_unavailable');
    return response.json();
  };
  // Service identity is a separate API GET from operator-provided inputs.
  const service=await get(`${API}/services/${SERVICE}`);
  if(service?.id!==SERVICE||service?.repo!=='https://github.com/NTinkicht/TheraBridge-Emergent'||
    service?.type!=='web_service'||service?.autoDeploy!=='no')
    throw Error('render_service_identity_mismatch');
  const deployments=await get(`${API}/services/${SERVICE}/deploys?limit=10`);
  if(!Array.isArray(deployments))throw Error('render_deployments_unavailable');
  // Render list deploys is ordered newest first; require exactly one LIVE
  // deployment and zero newer pending/failed deployments before it.
  const records=deployments.map(x=>x?.deploy??x);
  const live=records.filter(x=>x?.status==='live');
  if(live.length!==1 || records[0]?.id!==live[0]?.id)
    throw Error('render_live_deploy_ambiguous_or_stale');
  if(live[0]?.commit?.id!==operatorSha)
    throw Error('render_live_sha_mismatch');
  return {schema:1,kind:'render_control_plane_live_deploy_check',serviceId:SERVICE,
    deployedSha:operatorSha,checkoutSha:checkoutSha,liveVerified:true,
    independentlyQueried:true,clinicalReleaseAuthorized:false};
}

if(process.argv[1]?.endsWith('/hosted-render-attestation.mjs')){
  try{
    const result=await attestHostedDeployment({
      key:process.env.TB_HOSTED_RENDER_READONLY_API_KEY,
      operatorSha:process.env.TB_QA_DEPLOY_SHA,
      checkoutSha:process.env.GITHUB_SHA
    });
    // Exact allowed fields only; never print server response or authorization.
    console.log(JSON.stringify(result));
  }catch(err){
    const allowed=new Set(['unapproved_hosted_service','deployment_not_current_checkout',
      'render_readonly_credential_missing','render_api_unavailable',
      'render_service_identity_mismatch','render_deployments_unavailable',
      'render_live_deploy_ambiguous_or_stale','render_live_sha_mismatch']);
    const reason=allowed.has(err?.message)?err.message:'render_attestation_unavailable';
    console.error('Hosted qualification BLOCKED: '+reason);
    process.exitCode=2;
  }
}
