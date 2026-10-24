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
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportDecisionsService } from './report-decisions.service';

@Module({ imports: [CentersModule], controllers: [GovernanceController, ClinicalController, ReportsController, PracticeController], providers: [SessionExecutionService, GovernanceService, ClinicalService, ReportsService, ReportDecisionsService, PracticeService, { provide: CLINICAL_AI_PROVIDER, useClass: DisabledClinicalAiProvider }] })
export class ClinicalModule {}
