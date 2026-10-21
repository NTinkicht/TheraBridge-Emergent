import { Module } from '@nestjs/common';
import { CentersModule } from '../centers/centers.module';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';

@Module({ imports: [CentersModule], controllers: [ClinicalController], providers: [ClinicalService] })
export class ClinicalModule {}
