// Manual-only hosted preflight. Never log or store session passwords in Git.
import {mkdir,writeFile,chmod} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROLES,BASE} from './hosted-readonly.mjs';

export function verifySyntheticUsers(raw){
 let users;
 try{users=JSON.parse(raw);}catch{throw Error('invalid_private_users_json');}
 if(!users||typeof users!=='object'||Array.isArray(users))throw Error('invalid_private_users_object');
 const keys=Object.keys(ROLES).sort(),supplied=Object.keys(users).sort();
 if(JSON.stringify(keys)!==JSON.stringify(supplied))throw Error('all_seven_role_keys_required');
 for(const role of keys){
  const u=users[role];
  if(!u||typeof u.email!=='string'||!/^\S+@\S+\.\S+$/.test(u.email)||
   typeof u.password!=='string'||!u.password.length)throw Error('invalid_private_role_entry');
 }
 if(new Set(keys.map(k=>users[k].email.toLowerCase())).size!==7)throw Error('duplicate_role_email');
 return users;
}

export async function publicHealth({url=BASE,fetchImpl=fetch,attempts=3}={}) {
 let reason='network_or_timeout';
 for(let i=0;i<attempts;i++){
  try{
   const r=await fetchImpl(url+'/api/health',{redirect:'error',signal:AbortSignal.timeout(25000)});
   if(r.status!==200){reason='non_200_response';}
   else if(!(r.headers.get('content-type')??'').toLowerCase().includes('application/json')){
    reason='non_json_response';
   }else{
    try{
     const data=await r.json();
     if(data?.status==='ok'&&data?.database?.status==='up')return true;
     reason='unhealthy_json';
    }catch{reason='invalid_json';}
   }
  }catch{reason='network_or_timeout'; /* Never include URLs, headers, or tokens in logs. */}
  if(i+1<attempts)await new Promise(done=>setTimeout(done,4000));
 }
 throw Error('hosted_public_health_'+reason);
}

export async function prepare({directory,raw,expectedSha}){
 if(!/^[a-f0-9]{40}$/.test(expectedSha??''))throw Error('deployment_sha_input_required');
 const users=verifySyntheticUsers(raw);
 const dest=resolve(directory);
 await mkdir(dest,{recursive:true,mode:0o700});
 if(process.platform!=='win32')await chmod(dest,0o700);
 await writeFile(join(dest,'users.json'),JSON.stringify(users),{mode:0o600,flag:'wx'});
 return join(dest,'users.json');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 prepare({directory:process.env.TB_QA_PRIVATE_DIR,raw:process.env.TB_QA_USERS_JSON,
  expectedSha:process.env.TB_QA_DEPLOY_SHA})
  .then(()=>{
   console.log('Hosted QA private credential schema validated; no credentials printed.');
   return publicHealth();
  })
  .then(()=>console.log('Private role preflight and public health verified; operator-supplied deployment SHA is NOT independently verified.'))
  .catch(e=>{
   // Only explicit internal reason codes are safe; never print unknown error detail.
   const allowed=new Set([
    'invalid_private_users_json','invalid_private_users_object',
    'all_seven_role_keys_required','invalid_private_role_entry',
    'duplicate_role_email','deployment_sha_input_required',
    'hosted_public_health_network_or_timeout','hosted_public_health_non_200_response',
    'hosted_public_health_non_json_response','hosted_public_health_unhealthy_json',
    'hosted_public_health_invalid_json'
   ]);
   const reason=allowed.has(e?.message)?e.message:'private_preflight_unclassified';
   console.error('Hosted QA preflight blocked: '+reason+'. No secrets printed.');
   process.exitCode=2;
  });
}
