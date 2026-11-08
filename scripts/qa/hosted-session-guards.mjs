// M4-02 in-memory replay of a PRE-logout session cookie.
// Never log or serialize a cookie, token, response body, or session identifier.
import {BASE} from './hosted-readonly.mjs';

export function captureSessionCookie(cookies) {
 const matches=cookies.filter(c=>c?.name==='__Host-tb_session');
 if(matches.length!==1 || typeof matches[0].value!=='string' || !matches[0].value ||
    matches[0].secure!==true || matches[0].httpOnly!==true ||
    matches[0].sameSite!=='Lax' || matches[0].path!=='/' ||
    matches[0].domain!==new URL(BASE).hostname) return null;
 // Only call this helper on private synthetic contexts.
 return {name:matches[0].name,value:matches[0].value};
}

export async function verifyRevokedSession(browser,previousCookie) {
 if(!previousCookie) return false;
 let isolated;
 try {
  // An independent, EMPTY browser context has no cookies carried over from
  // logout and receives the pre-logout value only on this one read-only GET.
  isolated=await browser.newContext({acceptDownloads:false});
  const r=await isolated.request.get(BASE+'/api/auth/session',{
   headers:{Cookie:previousCookie.name+'='+previousCookie.value}
  });
  return r.status()===401;
 }catch{return false;}
 finally{await isolated?.close().catch(()=>{});}
}
