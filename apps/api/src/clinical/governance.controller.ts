import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { RequirePermission, TbRequest } from '../auth/access';
import { GovernanceService } from './governance.service';
import { TransferDraftDto, TransitionDto, HandoverProposalDto } from './governance.dto';
const uuid = () => new ParseUUIDPipe();
const viewer = (r: TbRequest) => ({ userId: r.auth!.session.userId, membershipId: r.auth!.session.activeMembershipId!, role: r.auth!.session.activeRole! });
@Controller('centers/:centerId/governance')
export class GovernanceController {
  constructor(private readonly service: GovernanceService) {}
  @Get('documents') @RequirePermission('center.clinical.read')
  documents(@Param('centerId', uuid()) c: string, @Req() r: TbRequest) { return this.service.documents(c, viewer(r)); }
  @Post('documents/:kind/:id/transitions') @RequirePermission('center.clinical.read')
  transition(@Param('centerId', uuid()) c: string, @Param('kind') k: string, @Param('id', uuid()) id: string, @Body() d: TransitionDto, @Req() r: TbRequest) { return this.service.transition(c, viewer(r), k, id, d); }
  @Get('documents/:kind/:id/history') @RequirePermission('center.clinical.read')
  history(@Param('centerId', uuid()) c: string, @Param('kind') k: string, @Param('id', uuid()) id: string, @Req() r: TbRequest) { return this.service.history(c, viewer(r), k, id); }
  @Get('previews/:id') @RequirePermission('center.clinical.read')
  preview(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() r: TbRequest) { return this.service.preview(c, viewer(r), id); }
  @Get('access') @RequirePermission('center.governance.read')
  access(@Param('centerId', uuid()) c: string, @Req() r: TbRequest) { return this.service.access(c, viewer(r)); }
  @Get('handover-proposals') @RequirePermission('center.handover.read')
  handovers(@Param('centerId', uuid()) c: string, @Req() r: TbRequest,
    @Query('childId') childId?: string, @Query('cancelledOffset') cancelledOffset?: string) {
    return this.service.handovers(c, viewer(r), { childId, cancelledOffset });
  }
  @Get('handover-proposals/:id/readiness') @RequirePermission('center.governance.read')
  handoverReadiness(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() r: TbRequest) {
    return this.service.handoverReadiness(c, viewer(r), id);
  }
  @Post('handover-proposals') @RequirePermission('center.handover.propose')
  proposeHandover(@Param('centerId', uuid()) c: string, @Body() d: HandoverProposalDto, @Req() r: TbRequest) {
    return this.service.proposeHandover(c, viewer(r), d);
  }
  @Post('handover-proposals/:id/acknowledge') @RequirePermission('center.handover.acknowledge')
  acknowledgeHandover(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() r: TbRequest) {
    return this.service.acknowledgeHandover(c, viewer(r), id);
  }
  @Post('handover-proposals/:id/cancel') @RequirePermission('center.handover.cancel')
  cancelHandover(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() r: TbRequest) {
    return this.service.cancelHandover(c, viewer(r), id);
  }
  @Post('transfer-simulations') @RequirePermission('center.governance.read')
  transfer(@Param('centerId', uuid()) c: string, @Body() d: TransferDraftDto, @Req() r: TbRequest) { return this.service.transfer(c, viewer(r), d); }
  @Post('release') @RequirePermission('clinical.report.release')
  release() { throw new Error('Release is disabled'); }
  @Post('consent-grants') @RequirePermission('clinical.consent.grant')
  grant() { throw new Error('Consent grants are disabled'); }
}
