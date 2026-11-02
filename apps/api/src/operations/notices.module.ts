import { Module } from '@nestjs/common';
import { DevMailboxModule } from '../dev-mailbox/dev-mailbox.module';
import { NoticesService } from './notices.service';

@Module({ imports: [DevMailboxModule], providers: [NoticesService], exports: [NoticesService] })
export class NoticesModule {}
