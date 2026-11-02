import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevMailboxModule } from '../dev-mailbox/dev-mailbox.module';
import { NoticesModule } from '../operations/notices.module';
import { CenterWorkspaceController, InvitationsController, PlatformCentersController } from './centers.controller';
import { InvitationsService } from './invitations.service';
import { ProvisioningService } from './provisioning.service';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [AuthModule, DevMailboxModule, NoticesModule],
  controllers: [PlatformCentersController, CenterWorkspaceController, InvitationsController],
  providers: [InvitationsService, ProvisioningService, WorkspaceService],
  exports: [InvitationsService],
})
export class CentersModule {}
