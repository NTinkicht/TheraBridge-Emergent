import { Module } from '@nestjs/common';
import { CentersModule } from '../centers/centers.module';
import { ChildrenService } from './children.service';
import { OperationsController, PlatformTrialController } from './operations.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [CentersModule],
  controllers: [OperationsController, PlatformTrialController],
  providers: [ChildrenService, ScheduleService],
})
export class OperationsModule {}
