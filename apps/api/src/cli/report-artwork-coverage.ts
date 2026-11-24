import 'dotenv/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { systemClock } from '../common/clock';
import { TrialService } from '../operations/trial.service';
import { ActivityMediaService } from '../clinical/activity-media.service';
import { FamilyReleaseService } from '../clinical/family-release.service';

export async function reportArtworkCoverage(){
  const prisma=new PrismaService();
  try {
    const media=new ActivityMediaService(prisma,new TrialService(prisma,new AuditService(prisma),systemClock));
    return await new FamilyReleaseService(prisma,media).platformArtworkCoverage();
  } finally {await prisma.$disconnect();}
}

if(require.main===module)reportArtworkCoverage().then(report=>{
  console.log(JSON.stringify(report));
  if(!report.complete)process.exitCode=1;
}).catch(()=>{console.error('Synthetic artwork coverage unavailable.');process.exitCode=1;});
