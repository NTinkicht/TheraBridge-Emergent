import { reportArtworkCoverage } from '../src/cli/report-artwork-coverage';
import { FamilyReleaseService } from '../src/clinical/family-release.service';
import { PrismaService } from '../src/prisma/prisma.service';
describe('private artwork coverage CLI',()=>{
 afterEach(()=>jest.restoreAllMocks());
 it('delegates to guarded report and disconnects even on failure',async()=>{
   const close=jest.spyOn(PrismaService.prototype,'$disconnect').mockResolvedValue(undefined);
   const report=jest.spyOn(FamilyReleaseService.prototype,'platformArtworkCoverage').mockResolvedValueOnce({
     scope:'PLATFORM_ACTIVE_SYNTHETIC_PLAN_GRANTS',complete:true,reason:null,centers:0,eligibleGrants:0,total:0,covered:0,percent:null,synthetic:true});
   expect(await reportArtworkCoverage()).toMatchObject({complete:true,total:0,percent:null});
   report.mockRejectedValueOnce(new Error('denied'));
   await expect(reportArtworkCoverage()).rejects.toThrow('denied');
   expect(close).toHaveBeenCalledTimes(2);
 });
});
