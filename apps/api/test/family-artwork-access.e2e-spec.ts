import { FamilyReleaseService } from '../src/clinical/family-release.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
describe('synthetic released artwork access and coverage',()=>{
 const v={userId:'guardian',membershipId:'member',role:'GUARDIAN'} as never;
 const digest='a'.repeat(64),a={templateId:'template',snapshot:{version:1}},b={templateId:'second',snapshot:{version:2}};
 const binding={slot:0,digestSha256:digest,altText:'Signed art',instruction:null};
 const old=process.env.TB_FAMILY_ARTWORK_SYNTHETIC;
 const row={release:{childId:'child'},approval:{kind:'PLAN',rendering:{artwork:[{activityIndex:0,slots:[binding]}]}},snap:{content:{homeActivities:[a]}}};
 function setup(){
  const tx={centerEvent:{create:jest.fn()}};
  const artwork={readFamilyArtwork:jest.fn().mockResolvedValue({altText:'Signed art',width:400,height:300,pngBase64:'fixture'})};
  const service=new FamilyReleaseService({$transaction:async(fn:any)=>fn(tx)} as never,artwork as never);
  const eligible=jest.spyOn(service as any,'eligibleRead').mockResolvedValue(row);
  return {service,artwork,eligible,tx};
 }
 beforeEach(()=>{process.env.TB_FAMILY_ARTWORK_SYNTHETIC='true';});
 afterEach(()=>{if(old===undefined)delete process.env.TB_FAMILY_ARTWORK_SYNTHETIC;else process.env.TB_FAMILY_ARTWORK_SYNTHETIC=old;jest.restoreAllMocks();});
 it('returns only the frozen signed slot after release authorization',async()=>{
  const {service,artwork,eligible,tx}=setup();
  expect(await service.artworkRead('c',v,'release',0,0)).toEqual({activityIndex:0,slot:0,altText:'Signed art',width:400,height:300,pngBase64:'fixture',synthetic:true});
  expect(eligible).toHaveBeenCalledWith(tx,'c',v,'release');
  expect(artwork.readFamilyArtwork).toHaveBeenCalledWith(tx,'c',a,0,digest);
 });
 it('denies feature disabled, invalid parameters and recipient failure before media access',async()=>{
  const {service,artwork,eligible}=setup();
  for(const [i,s] of [[-1,0],[10,0],[1.5,0],[0,-1],[0,65],[0,1.5]])await expect(service.artworkRead('c',v,'r',i,s)).rejects.toBeInstanceOf(NotFoundException);
  delete process.env.TB_FAMILY_ARTWORK_SYNTHETIC;
  await expect(service.artworkRead('c',v,'r',0,0)).rejects.toBeInstanceOf(NotFoundException);
  await expect(service.artworkCoverage('c',v,'r')).rejects.toBeInstanceOf(NotFoundException);
  process.env.TB_FAMILY_ARTWORK_SYNTHETIC='true';eligible.mockRejectedValue(new ForbiddenException());
  await expect(service.artworkRead('c',v,'r',0,0)).rejects.toBeInstanceOf(ForbiddenException);
  expect(artwork.readFamilyArtwork).not.toHaveBeenCalled();
 });
 it.each([undefined,[],[{activityIndex:0,slots:null}],[{activityIndex:0,slots:[binding,binding]}],
 [{activityIndex:0,slots:[{...binding,slot:65}]}],[{activityIndex:0,slots:[{...binding,slot:-1}]}],
 [{activityIndex:0,slots:[{...binding,slot:1.5}]}],[{activityIndex:0,slots:[{...binding,digestSha256:'invalid'}]}],
 [{activityIndex:0,slots:[{...binding,altText:null}]}],[{activityIndex:0,slots:[null]}],
 [{activityIndex:0,slots:[binding]},{activityIndex:0,slots:[binding]}],Array(11).fill({activityIndex:1,slots:[]}),
 [{activityIndex:0,slots:Array(66).fill(binding)}]].map(manifest=>[manifest]))('denies malformed manifest %j',async manifest=>{
  const {service,eligible,artwork}=setup();eligible.mockResolvedValue({...row,approval:{kind:'PLAN',rendering:{artwork:manifest}}});
  await expect(service.artworkRead('c',v,'r',0,0)).rejects.toBeInstanceOf(NotFoundException);
  expect(artwork.readFamilyArtwork).not.toHaveBeenCalled();
 });
 it('rejects report, missing activity source and mismatched alt',async()=>{
  const {service,eligible,artwork}=setup();
  eligible.mockResolvedValueOnce({...row,approval:{...row.approval,kind:'REPORT'}});
  await expect(service.artworkRead('c',v,'r',0,0)).rejects.toBeInstanceOf(NotFoundException);
  for(const homeActivities of [null,[]]){eligible.mockResolvedValueOnce({...row,snap:{content:{homeActivities}}});await expect(service.artworkRead('c',v,'r',0,0)).rejects.toBeInstanceOf(NotFoundException);}
  artwork.readFamilyArtwork.mockResolvedValueOnce({altText:'Changed'});
  await expect(service.artworkRead('c',v,'r',0,0)).rejects.toBeInstanceOf(NotFoundException);
 });
 it('coverage counts unique activities, missing images, revoked candidates and empty denominator',async()=>{
  const {service,eligible,artwork}=setup();
  eligible.mockResolvedValue({...row,snap:{content:{homeActivities:[a,a,b,{}]}}});
  expect(await service.artworkCoverage('c',v,'r')).toMatchObject({total:3,covered:1,percent:33});
  artwork.readFamilyArtwork.mockRejectedValueOnce(new NotFoundException());
  expect(await service.artworkCoverage('c',v,'r')).toMatchObject({total:3,covered:0,percent:0});
  artwork.readFamilyArtwork.mockResolvedValueOnce({altText:'Changed'});
  expect(await service.artworkCoverage('c',v,'r')).toMatchObject({covered:0});
  artwork.readFamilyArtwork.mockRejectedValueOnce(new Error('database down'));
  await expect(service.artworkCoverage('c',v,'r')).rejects.toThrow('database down');
  eligible.mockResolvedValueOnce({...row,snap:{content:{homeActivities:[]}}});
  expect(await service.artworkCoverage('c',v,'r')).toMatchObject({total:0,covered:0,percent:null});
  for(const homeActivities of [null,Array(11).fill(a)]){eligible.mockResolvedValueOnce({...row,snap:{content:{homeActivities}}});await expect(service.artworkCoverage('c',v,'r')).rejects.toBeInstanceOf(NotFoundException);}
  eligible.mockResolvedValueOnce({...row,approval:{...row.approval,kind:'REPORT'}});
  await expect(service.artworkCoverage('c',v,'r')).rejects.toBeInstanceOf(NotFoundException);
 });
});
