import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { RequirePermission, TbRequest } from '../auth/access';
import { FamilyReleaseService } from './family-release.service';
import { FamilyApprovalDto, FamilyGrantDto, FamilyConsentDto, FamilyGrantChangeDto } from './family-release.dto';

const uuid = () => new ParseUUIDPipe();
const viewer = (r: TbRequest) => ({ userId: r.auth!.session.userId, membershipId: r.auth!.session.activeMembershipId!, role: r.auth!.session.activeRole! });

@Controller('centers/:centerId/family-releases')
export class FamilyReleaseController {
  constructor(private readonly service: FamilyReleaseService) {}

  @Post('approvals') @RequirePermission('center.clinical.read')
  approve(@Param('centerId', uuid()) centerId: string, @Body() dto: FamilyApprovalDto, @Req() req: TbRequest) {
    return this.service.approve(centerId, viewer(req), dto);
  }

  @Post('grants') @RequirePermission('center.clinical.read')
  grant(@Param('centerId', uuid()) centerId: string, @Body() dto: FamilyGrantDto, @Req() req: TbRequest) {
    return this.service.grant(centerId, viewer(req), dto);
  }

  @Post('grants/:id/change') @RequirePermission('center.clinical.read')
  change(@Param('centerId', uuid()) centerId: string, @Param('id', uuid()) id: string,
    @Body() dto: FamilyGrantChangeDto, @Req() req: TbRequest) {
    return this.service.change(centerId, viewer(req), id, dto);
  }

  @Post('consents') @RequirePermission('family.portal.read')
  consent(@Param('centerId', uuid()) centerId: string, @Body() dto: FamilyConsentDto, @Req() req: TbRequest) {
    return this.service.consent(centerId, viewer(req), dto, false);
  }

  @Post('consents/withdraw') @RequirePermission('family.portal.read')
  withdrawConsent(@Param('centerId', uuid()) centerId: string, @Body() dto: FamilyConsentDto, @Req() req: TbRequest) {
    return this.service.consent(centerId, viewer(req), dto, true);
  }

  @Get('mine') @RequirePermission('family.portal.read') @Header('Cache-Control', 'private, no-store, max-age=0')
  mine(@Param('centerId', uuid()) centerId: string, @Req() req: TbRequest) {
    return this.service.mine(centerId, viewer(req));
  }

  @Get('mine/:id') @RequirePermission('family.portal.read') @Header('Cache-Control', 'private, no-store, max-age=0')
  read(@Param('centerId', uuid()) centerId: string, @Param('id', uuid()) id: string, @Req() req: TbRequest) {
    return this.service.read(centerId, viewer(req), id);
  }
}
