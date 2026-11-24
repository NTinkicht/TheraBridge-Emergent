import { FamilyReleaseService } from '../src/clinical/family-release.service';
import { ForbiddenException,NotFoundException } from '@nestjs/common';
import * as governance from '../src/clinical/governance-core';

describe('centre aggregate released artwork coverage',()=>{
 const v={userId:'supervisor',membershipId:'supervisor-member',role:'CLINICAL_SUPERVISOR'} as never;
 const digest='a'.repeat(64),a={templateId:'template',snapshot:{version:1}},b={templateId:'other',snapshot:{version:2}};
 const slot={slot:0,digestSha256:digest,altText:'Signed art',instruction:null};
 const old=process.env.TB_FAMILY_ARTWORK_SYNTHETIC;
 const grant=(id:string)=>({id,guardianLinkId:'link',childId:'child'});
 const row=(id:string,activities:unknown[],artwork:unknown[])=>({
   release:{status:'ACTIVE',guardianLinkId:'link'},approval:{id,kind:'PLAN',rendering:{artwork}},
   snap:{content:{homeActivities:activities}}});
 function setup(){
   const tx={syntheticFamilyGrant:{findMany:jest.fn().mockResolvedValue([grant('g1')])},
     guardianLink:{findFirst:jest.fn().mockResolvedValue({userId:'guardian'})},
     membership:{findFirst:jest.fn().mockResolvedValue({id:'guardian-member'})}};
   const artwork={readFamilyArtwork:jest.fn().mockResolvedValue({altText:'Signed art'})};
   const service=new FamilyReleaseService({$transaction:async(fn:any)=>fn(tx)} as never,artwork as never);
   const auth=jest.spyOn(governance,'assertActor').mockResolvedValue(undefined);
   const synthetic=jest.spyOn(service as any,'synthetic').mockResolvedValue(undefined);
   const eligible=jest.spyOn(service as any,'eligibleRead').mockResolvedValue(row('approval',[a],[{activityIndex:0,slots:[slot]}]));
   return {tx,artwork,service,auth,synthetic,eligible};
 }
 beforeEach(()=>{process.env.TB_FAMILY_ARTWORK_SYNTHETIC='true';});
 afterEach(()=>{if(old===undefined)delete process.env.TB_FAMILY_ARTWORK_SYNTHETIC;else process.env.TB_FAMILY_ARTWORK_SYNTHETIC=old;jest.restoreAllMocks();});
 it('uses supervisor authority and existing recipient eligibility; exposes only aggregate counts',async()=>{
   const {service,tx,auth,eligible}=setup();
   expect(await service.centerArtworkCoverage('c',v)).toEqual({scope:'CENTER_ACTIVE_SYNTHETIC_PLAN_GRANTS',
     complete:true,reason:null,eligibleGrants:1,total:1,covered:1,percent:100,synthetic:true});
   expect(auth).toHaveBeenCalledWith(tx,'c',v,['CLINICAL_SUPERVISOR']);
   expect(eligible).toHaveBeenCalledWith(tx,'c',{userId:'guardian',membershipId:'guardian-member',role:'GUARDIAN'},'g1');
   expect(tx.syntheticFamilyGrant.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{centerId:'c',purpose:'FAMILY_PLAN',status:'ACTIVE'},take:51}));
 });
 it('denies unauthorized or disabled requests before inventory',async()=>{
   const {service,tx,auth}=setup();auth.mockRejectedValueOnce(new ForbiddenException());
   await expect(service.centerArtworkCoverage('c',v)).rejects.toBeInstanceOf(ForbiddenException);
   delete process.env.TB_FAMILY_ARTWORK_SYNTHETIC;
   await expect(service.centerArtworkCoverage('c',v)).rejects.toBeInstanceOf(NotFoundException);
   expect(tx.syntheticFamilyGrant.findMany).not.toHaveBeenCalled();
 });
 it('never reports a truncated inventory or malformed released source as complete',async()=>{
   const {service,tx,eligible}=setup();tx.syntheticFamilyGrant.findMany.mockResolvedValueOnce(Array(51).fill(grant('g')));
   expect(await service.centerArtworkCoverage('c',v)).toMatchObject({complete:false,reason:'INVENTORY_LIMIT',percent:null,total:null});
   eligible.mockResolvedValueOnce(row('bad',Array(11).fill(a),[]));
   expect(await service.centerArtworkCoverage('c',v)).toMatchObject({complete:false,reason:'INVALID_SOURCE',percent:null});
 });
 it('deduplicates grants to the same approval but requires every distinct release occurrence to have art',async()=>{
   const {service,tx,eligible,artwork}=setup();
   tx.syntheticFamilyGrant.findMany.mockResolvedValue([grant('g1'),grant('g2'),grant('g3')]);
   eligible.mockResolvedValueOnce(row('p1',[a,b],[{activityIndex:0,slots:[slot]},{activityIndex:1,slots:[slot]}]))
     .mockResolvedValueOnce(row('p1',[a,b],[])).mockResolvedValueOnce(row('p2',[a],[]));
   expect(await service.centerArtworkCoverage('c',v)).toMatchObject({eligibleGrants:3,total:2,covered:1,percent:50});
   expect(artwork.readFamilyArtwork).toHaveBeenCalledTimes(2);
 });
 it('skips missing/revoked recipients and never counts absent images',async()=>{
   const {service,tx,eligible,artwork}=setup();
   tx.syntheticFamilyGrant.findMany.mockResolvedValue([grant('g1'),grant('g2'),grant('g3'),grant('g4')]);
   tx.guardianLink.findFirst.mockResolvedValueOnce(null);
   tx.membership.findFirst.mockResolvedValueOnce(null);
   eligible.mockRejectedValueOnce(new NotFoundException());
   artwork.readFamilyArtwork.mockRejectedValueOnce(new NotFoundException());
   expect(await service.centerArtworkCoverage('c',v)).toMatchObject({eligibleGrants:1,total:1,covered:0,percent:0});
 });
 it('uses a null percentage for an empty inventory and propagates unexpected failures',async()=>{
   const {service,tx,eligible,artwork}=setup();
   tx.syntheticFamilyGrant.findMany.mockResolvedValueOnce([]);
   expect(await service.centerArtworkCoverage('c',v)).toMatchObject({total:0,covered:0,percent:null});
   eligible.mockRejectedValueOnce(new Error('database down'));
   await expect(service.centerArtworkCoverage('c',v)).rejects.toThrow('database down');
   artwork.readFamilyArtwork.mockRejectedValueOnce(new Error('storage down'));
   await expect(service.centerArtworkCoverage('c',v)).rejects.toThrow('storage down');
 });
});
