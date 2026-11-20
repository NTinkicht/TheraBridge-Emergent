/**
 * M5-14: deny-by-default rights/hold decision at the private media boundary.
 * This is NOT an approval authority, storage adapter or publication endpoint.
 * Only a separately signed owner-controlled service may eventually supply
 * release authority. Never infer rights from metadata supplied by a caller.
 */
export class MediaRightsDenied extends Error {
  constructor() { super('Private media rights operation denied.'); }
}
export type CustodyDecision = Readonly<{
  centerId: string;
  assetId: string;
  revision: number;
  legalHold: boolean;
  revoked: boolean;
  rightsState: 'unverified' | 'rejected' | 'review-pending';
  releaseEnabled: false;
  readEnabled: false;
  publishEnabled: false;
}>;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function snapshot(value: unknown): Record<string,unknown> {
  if (!value || typeof value!=='object' || Object.getPrototypeOf(value)!==Object.prototype) throw new MediaRightsDenied();
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const keys=['centerId','assetId','revision','legalHold','revoked','rightsState','releaseEnabled','readEnabled','publishEnabled'];
  if (Reflect.ownKeys(value).length!==keys.length || keys.some(k=>!Object.hasOwn(descriptors,k)||!Object.hasOwn(descriptors[k],'value'))) throw new MediaRightsDenied();
  return Object.fromEntries(keys.map(k=>[k,descriptors[k].value]));
}
export function validatePrivateCustodyDecision(input: unknown): CustodyDecision {
  const v=snapshot(input);
  if(typeof v.centerId!=='string'||!UUID.test(v.centerId)||
     typeof v.assetId!=='string'||!UUID.test(v.assetId)||
     !Number.isSafeInteger(v.revision)||(v.revision as number)<1||
     typeof v.legalHold!=='boolean'||typeof v.revoked!=='boolean'||
     !['unverified','rejected','review-pending'].includes(v.rightsState as string)||
     v.releaseEnabled!==false||v.readEnabled!==false||v.publishEnabled!==false) throw new MediaRightsDenied();
  return Object.freeze(v as CustodyDecision);
}
/** No deletion while a hold exists; no release/read/publication regardless of claimed rights. */
export function requirePrivateCustodyOperation(input: unknown, operation: 'purge'|'read'|'release'|'publish'): void {
  const state=validatePrivateCustodyDecision(input);
  if(operation==='purge' && !state.legalHold && state.revoked) return;
  throw new MediaRightsDenied();
}
