import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { RequirePermission, TbRequest } from '../auth/access';
import type { Viewer } from '../operations/children.service';
import { ActivityMediaDraftDto, ActivityMediaRejectDto } from './activity-media.dto';
import { ActivityMediaService } from './activity-media.service';

const uuid = () => new ParseUUIDPipe();
const viewer = (req: TbRequest): Viewer => ({
  userId: req.auth!.session.userId,
  membershipId: req.auth!.session.activeMembershipId!,
  role: req.auth!.session.activeRole!,
});

@Controller('centers/:centerId/activities/:templateId/media-drafts')
export class ActivityMediaController {
  constructor(private readonly media: ActivityMediaService) {}
  @Get()
  @RequirePermission('center.activities.manage')
  list(@Param('centerId', uuid()) centerId: string, @Param('templateId', uuid()) templateId: string, @Req() req: TbRequest) {
    return this.media.list(centerId, viewer(req), templateId);
  }
  @Post()
  @RequirePermission('center.activities.manage')
  propose(@Param('centerId', uuid()) centerId: string, @Param('templateId', uuid()) templateId: string,
    @Body() dto: ActivityMediaDraftDto, @Req() req: TbRequest) {
    return this.media.propose(centerId, viewer(req), templateId, dto);
  }
  @Post(':draftId/reject')
  @RequirePermission('center.activities.manage')
  reject(@Param('centerId', uuid()) centerId: string, @Param('templateId', uuid()) templateId: string,
    @Param('draftId', uuid()) draftId: string, @Body() dto: ActivityMediaRejectDto, @Req() req: TbRequest) {
    return this.media.reject(centerId, viewer(req), templateId, draftId, dto);
  }
}
