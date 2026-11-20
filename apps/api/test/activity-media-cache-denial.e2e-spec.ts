import {privateMediaDenied,PrivateCacheDenialError} from '../src/clinical/activity-media-cache-denial';
const request={centerId:'11111111-1111-4111-8111-111111111111',assetId:'22222222-2222-4222-8222-222222222222'};
describe('WU4-P private cache denial boundary',()=>{
 it('always returns an immutable generic 404 without cache or storage hints',()=>{
  const response=privateMediaDenied(request);
  expect(response.status).toBe(404);
  expect(response.headers['Cache-Control']).toContain('no-store');
  expect(response.headers.Vary).toContain('Authorization');
  expect(response.headers['X-Content-Type-Options']).toBe('nosniff');
  expect(response.body).toBe('{"error":"Not found"}');
  expect(JSON.stringify(response)).not.toMatch(/objectKey|storagePath|signedUrl|token|centerId|assetId/);
  expect(Object.isFrozen(response)).toBe(true);
  expect(Object.isFrozen(response.headers)).toBe(true);
 });
 it('rejects accessor-backed requests and malformed identities',()=>{
  const accessor=Object.defineProperty({...request},'assetId',{enumerable:true,get(){return request.assetId;}});
  for(const input of [accessor,{...request,centerId:'../../other'},{...request,assetId:''},{...request,extra:true},Object.create(null)])expect(()=>privateMediaDenied(input)).toThrow(PrivateCacheDenialError);
 });
 it('never varies denial by tenant or asset identity',()=>{
  expect(privateMediaDenied(request)).toEqual(privateMediaDenied({centerId:'33333333-3333-4333-8333-333333333333',assetId:'44444444-4444-4444-8444-444444444444'}));
 });
});
