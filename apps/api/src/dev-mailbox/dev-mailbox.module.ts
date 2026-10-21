import { Module } from '@nestjs/common';
import { DevMailboxController } from './dev-mailbox.controller';
import { DevMailboxService } from './dev-mailbox.service';

@Module({ controllers: [DevMailboxController], providers: [DevMailboxService], exports: [DevMailboxService] })
export class DevMailboxModule {}
