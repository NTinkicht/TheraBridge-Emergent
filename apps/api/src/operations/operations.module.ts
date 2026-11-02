import { Module } from '@nestjs/common';
import { CentersModule } from '../centers/centers.module';
import { DevMailboxModule } from '../dev-mailbox/dev-mailbox.module';
import { ChildrenService } from './children.service';
import { MessagesService } from './messages.service';
import { NoticesService } from './notices.service';
import { NoticesModule } from './notices.module';
import { OperationsController, PlatformRemindersController, PlatformTrialController } from './operations.controller';
import { ScheduleService } from './schedule.service';
import { SeriesService } from './series.service';

@Module({
  imports: [CentersModule, DevMailboxModule, NoticesModule],
  controllers: [OperationsController, PlatformTrialController, PlatformRemindersController],
  providers: [ChildrenService, ScheduleService, SeriesService, MessagesService],
})
export class OperationsModule {}
