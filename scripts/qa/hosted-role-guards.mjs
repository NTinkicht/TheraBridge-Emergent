// M4-02: read-only forbidden-route contracts for the legacy seven roles.
import {BASE} from './hosted-readonly.mjs';
export const WRONG_CENTER='00000000-0000-4000-8000-000000000001';
const roleRoutes=Object.freeze({
 platform:id=>'/api/centers/'+id+'/children',
 admin:id=>'/api/centers/'+id+'/family',
 coordinator:id=>'/api/centers/'+id+'/family',
 speech:id=>'/api/centers/'+id+'/settings',
 ot:id=>'/api/centers/'+id+'/settings',
 supervisor:id=>'/api/centers/'+id+'/settings',
 guardian:id=>'/api/centers/'+id+'/children',
});
export function deniedRoute(role,session,verifiedExistingCenterId){
 if(!Object.hasOwn(roleRoutes,role))throw Error('unrecognized_private_qa_role');
 // Platform actors have no active center: the caller must first obtain a
 // real center UUID from the authenticated platform.centers.read endpoint.
 // A fabricated/not-found center cannot demonstrate RBAC denial.
 const centerId=role==='platform'?verifiedExistingCenterId:session?.activeContext?.centerId;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(centerId??'') || centerId===WRONG_CENTER)
   throw Error('private_qa_center_context_unavailable');
 const path=roleRoutes[role](centerId);
 if(!path.startsWith('/api/centers/'))throw Error('unsafe_qa_route');
 return BASE+path;
}
// Authenticated access denial must never accept HTTP 401: that would only
// demonstrate a lost/invalid session, not tenant or role isolation.
export const isDeniedStatus=s=>s===403||s===404;
