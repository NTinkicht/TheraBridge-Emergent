/** Synthetic-only fail-closed private media cache response policy.
 * This is a pure response-header proof, not an HTTP route or media retrieval grant.
 */
export class PrivateCacheDenialError extends Error {
  constructor() {super('Private media cache response denied.');}
}
export type DenialResponse = Readonly<{status:404;headers:Readonly<Record<string,string>>;body:string}>;
const headers=Object.freeze({
 'Cache-Control':'private, no-store, no-cache, max-age=0, must-revalidate',
 'Pragma':'no-cache','Expires':'0','X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer','Vary':'Authorization, Cookie',
 'Content-Type':'application/json; charset=utf-8',
});
export function privateMediaDenied(request:unknown):DenialResponse {
 if (!request || typeof request!=='object' || Object.getPrototypeOf(request)!==Object.prototype) throw new PrivateCacheDenialError();
 const props=Object.getOwnPropertyDescriptors(request);
 if (Object.keys(props).length!==2||!('value' in (props.centerId||{}))||!('value' in (props.assetId||{}))) throw new PrivateCacheDenialError();
 const centerId=props.centerId.value,assetId=props.assetId.value;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(typeof centerId!=='string'||typeof assetId!=='string'||!uuid.test(centerId)||!uuid.test(assetId)) throw new PrivateCacheDenialError();
 return Object.freeze({status:404 as const,headers,body:'{"error":"Not found"}'});
}
