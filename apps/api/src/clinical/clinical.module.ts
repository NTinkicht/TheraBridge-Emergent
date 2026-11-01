import { SessionExecutionService } from './session.service';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';
import { Module } from '@nestjs/common';
import { CLINICAL_AI_PROVIDER, DisabledClinicalAiProvider } from './ai-provider';
import { CentersModule } from '../centers/centers.module';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { HomePlanRequestsService } from './home-plan-requests.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportDecisionsService } from './report-decisions.service';
import { FamilyReleaseService } from './family-release.service';
import { FamilyReleaseController } from './family-release.controller';

@Module({ imports: [CentersModule], controllers: [GovernanceController, ClinicalController, ReportsController, PracticeController, FamilyReleaseController], providers: [SessionExecutionService, GovernanceService, ClinicalService, ReportsService, ReportDecisionsService, PracticeService, HomePlanRequestsService, FamilyReleaseService, { provide: CLINICAL_AI_PROVIDER, useClass: DisabledClinicalAiProvider }] })
export class ClinicalModule {}
