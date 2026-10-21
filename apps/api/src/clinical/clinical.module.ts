import { Module } from '@nestjs/common';
import { CentersModule } from '../centers/centers.module';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({ imports: [CentersModule], controllers: [ClinicalController, ReportsController, PracticeController], providers: [ClinicalService, ReportsService, PracticeService] })
export class ClinicalModule {}
