import { ActivityMediaService } from '../src/clinical/activity-media.service';
import * as evidence from '../src/clinical/activity-artwork-approval';
import { NotFoundException } from '@nestjs/common';

describe('signed artwork inventory and frozen family source matching',()=>{
 const centerId='00000000-0000-4000-8000-000000000002',templateId='00000000-0000-4000-8000-000000000003';
 const digest='70da78a9234c4ba733265c35b0bfbe5693c5e865e0e1130c6e74c090d03cf226';
 const template={id:templateId,centerId,version:7,service:'speech',title:'Activity',ageBand:'6-8',minutes:5,steps:['Step',' '],safety:['Safe'],materials:['Paper']};
 const draft={id:'draft',centerId,templateId,templateVersion:7,version:1,state:'DRAFT',stepNumber:null,service:'speech',
  sourceType:'GENERATED',styleVersion:'m5-b-v1',sceneType:'therapist-guided',sourceReference:'m5-b-v1:WU2A-S1-SPEECH:sha256:'+digest,altText:'Signed illustration',license:'License',providerTerms:'Terms'};
 const candidate={id:'candidate',centerId,templateId,templateVersion:7,kind:'ACTIVITY_IMAGE',status:'QUARANTINED',revokedAt:null,digestSha256:digest,
 width:400,height:300,scannerName:'ClamAV',scannerVersion:'1',mediaDraft:draft};
 const row={slot:0,candidate};
 const snapshot={templateId,snapshot:{...template}};
 function setup(rows:unknown[]=[row]){
  const tx={$queryRaw:jest.fn(),activityTemplate:{findFirst:jest.fn().mockResolvedValue(template)},
   activityArtworkApproval:{findMany:jest.fn().mockResolvedValue(rows)}};
  const service=new ActivityMediaService({$transaction:async(fn:any)=>fn(tx)} as never,{} as never);
  const verified=jest.spyOn(evidence,'verifiesArtworkApproval').mockReturnValue(true);
  jest.spyOn(service as any,'authorizedTemplate').mockResolvedValue(template);
  return {tx,service,verified};
 }
 afterEach(()=>jest.restoreAllMocks());
 it('returns redacted signed inventory and frozen whole/step bindings',async()=>{
  const {service,tx}=setup([row,{slot:1,candidate:{...candidate,id:'step-candidate',mediaDraft:{...draft,stepNumber:1}}}]);
  const r=await service.approvedArtwork(centerId,{} as never,templateId);
  expect(r.items).toEqual([{stepNumber:null,altText:draft.altText,width:400,height:300},{stepNumber:1,altText:draft.altText,width:400,height:300}]);
  expect(r.coverage).toMatchObject({wholeActivityVerified:true,verifiedSteps:1,expectedSteps:1,stepCoveragePercent:100,publishedCoverageAvailable:false});
  expect(await service.familyArtworkBindings(tx as never,centerId,snapshot)).toEqual([
   {slot:0,digestSha256:digest,altText:draft.altText,instruction:null},{slot:1,digestSha256:digest,altText:draft.altText,instruction:'Step'}]);
 });
 it.each([
  {mediaDraft:null},{centerId:'foreign'},{templateId:'foreign'},{templateVersion:6},{kind:'CHILD_PHOTO'},
  {status:'REVOKED'},{revokedAt:new Date()},{scannerName:'other'},{scannerVersion:''},{width:399},{height:299},{digestSha256:'b'.repeat(64)},
 ])('excludes invalid candidate %j',async patch=>{
  const {service}=setup([{...row,candidate:{...candidate,...patch}}]);
  expect((await service.approvedArtwork(centerId,{} as never,templateId)).items).toEqual([]);
 });
 it.each([
  {centerId:'foreign'},{templateId:'foreign'},{templateVersion:6},{state:'REJECTED'},{service:'physical'},
  {sourceType:'ORIGINAL'},{styleVersion:'other'},{stepNumber:1},{sourceReference:'legacy'},{sourceReference:'m5-b-v1:bad'},{sceneType:'home-support'},
 ])('excludes invalid draft %j',async patch=>{
  const {service}=setup([{...row,candidate:{...candidate,mediaDraft:{...draft,...patch}}}]);
  expect((await service.approvedArtwork(centerId,{} as never,templateId)).items).toEqual([]);
 });
 it.each([-1,65,2])('excludes invalid or empty step %s',async slot=>{
  const {service}=setup([{slot,candidate:{...candidate,mediaDraft:{...draft,stepNumber:slot}}}]);
  expect((await service.approvedArtwork(centerId,{} as never,templateId)).items).toEqual([]);
 });
 it('denies bad signatures and excessive inventory, reports empty denominator as null',async()=>{
  const {service,verified,tx}=setup();verified.mockReturnValue(false);
  expect((await service.approvedArtwork(centerId,{} as never,templateId)).items).toEqual([]);
  verified.mockReturnValue(true);tx.activityArtworkApproval.findMany.mockResolvedValue(Array(66).fill(row));
  jest.spyOn(service as any,'authorizedTemplate').mockResolvedValue({...template,steps:[]});
  expect((await service.approvedArtwork(centerId,{} as never,templateId)).coverage.stepCoveragePercent).toBeNull();
 });
 it.each([null,{}, {templateId:'bad',snapshot:{id:'bad',version:7}},{templateId,snapshot:{id:'wrong',version:7}},
 {templateId,snapshot:{id:templateId,version:'7'}}])('denies missing or malformed source %j',async a=>{
  const {service,tx}=setup();expect(await service.familyArtworkBindings(tx as never,centerId,a)).toEqual([]);
  expect(tx.activityTemplate.findFirst).not.toHaveBeenCalled();
 });
 it.each([{version:6},{title:'Changed'},{service:'physical'},{ageBand:'other'},{minutes:10},{steps:['Changed']},{safety:[]},{materials:[]}])('denies changed frozen source %j',async patch=>{
  const {service,tx}=setup();expect(await service.familyArtworkBindings(tx as never,centerId,{templateId,snapshot:{...template,...patch}})).toEqual([]);
 });
 it('denies deleted activity or wrong release digest',async()=>{
  const {service,tx}=setup();tx.activityTemplate.findFirst.mockResolvedValueOnce(null);
  expect(await service.familyArtworkBindings(tx as never,centerId,snapshot)).toEqual([]);
  await expect(service.readFamilyArtwork(tx as never,centerId,snapshot,0,'b'.repeat(64))).rejects.toBeInstanceOf(NotFoundException);
 });
 it('passes exact released binding to private reader and denies deletion between reads',async()=>{
  const {service,tx}=setup();const reader=jest.spyOn(service as any,'readVerifiedArtwork').mockResolvedValue({altText:draft.altText});
  expect(await service.readFamilyArtwork(tx as never,centerId,snapshot,0,digest)).toEqual({altText:draft.altText});
  expect(reader).toHaveBeenCalledWith(tx,centerId,templateId,template,7,0,digest);
  tx.activityTemplate.findFirst.mockResolvedValueOnce(template).mockResolvedValueOnce(null);
  await expect(service.readFamilyArtwork(tx as never,centerId,snapshot,0,digest)).rejects.toBeInstanceOf(NotFoundException);
 });
});
