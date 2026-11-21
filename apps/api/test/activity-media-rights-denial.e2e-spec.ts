import {MediaRightsDenied,requirePrivateCustodyOperation,validatePrivateCustodyDecision} from '../src/clinical/activity-media-rights-denial';
const valid=()=>({
 centerId:'11111111-1111-4111-8111-111111111111',
 assetId:'22222222-2222-4222-8222-222222222222',
 revision:1,legalHold:true,revoked:false,rightsState:'unverified',
 releaseEnabled:false,readEnabled:false,publishEnabled:false,
});
describe('M5-14 rights and legal-hold denial boundary',()=>{
 it('freezes an unapproved custody snapshot and exposes no grant',()=>{
  const state=validatePrivateCustodyDecision(valid());
  expect(Object.isFrozen(state)).toBe(true);
  expect(state).toMatchObject({legalHold:true,readEnabled:false,releaseEnabled:false,publishEnabled:false});
 });
 it.each(['read','release','publish','purge'] as const)('denies %s while on legal hold',op=>{
  expect(()=>requirePrivateCustodyOperation(valid(),op)).toThrow(MediaRightsDenied);
 });
 it('allows only a previously revoked, hold-free purge policy decision, never release',()=>{
  const v={...valid(),legalHold:false,revoked:true};
  expect(()=>requirePrivateCustodyOperation(v,'purge')).not.toThrow();
  for(const op of ['read','release','publish'] as const)
   expect(()=>requirePrivateCustodyOperation(v,op)).toThrow(MediaRightsDenied);
 });
 it.each([
  {legalHold:'false'},{revoked:0},{rightsState:'approved'},{releaseEnabled:true},
  {readEnabled:true},{publishEnabled:true},{revision:0},{revision:1.2},
  {centerId:'../../other'},{assetId:{toString:()=>valid().assetId}},
  {extra:true},
 ])('rejects forged custody decision %#',change=>{
  expect(()=>validatePrivateCustodyDecision({...valid(),...change})).toThrow(MediaRightsDenied);
 });
 it('rejects getters without invoking them',()=>{
  let invoked=false;
  const hostile=Object.defineProperty(valid(),'legalHold',{enumerable:true,get(){invoked=true;return false;}});
  expect(()=>validatePrivateCustodyDecision(hostile)).toThrow(MediaRightsDenied);
  expect(invoked).toBe(false);
 });
 it('rejects symbol fields and inherited/proxy-like prototypes',()=>{
  expect(()=>validatePrivateCustodyDecision(Object.assign(valid(),{[Symbol('forged')]:true}))).toThrow(MediaRightsDenied);
  expect(()=>validatePrivateCustodyDecision(Object.create(valid()))).toThrow(MediaRightsDenied);
 });
});
