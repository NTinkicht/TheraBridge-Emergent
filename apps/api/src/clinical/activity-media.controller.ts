import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, BadRequestException } from '@nestjs/common';
import { RequirePermission, TbRequest } from '../auth/access';
import type { Viewer } from '../operations/children.service';
import { ActivityMediaDraftDto, ActivityMediaRejectDto, ActivityPrivatePngCandidateDto } from './activity-media.dto';
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
  list(@Param('centerId', uuid()) centerId: string, @Param('templateId', uuid()) templateId: string,
    @Req() req: TbRequest, @Query('cursor') cursor?: string, @Query('limit') rawLimit?: string) {
    if (cursor !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor)) {
      throw new BadRequestException('Invalid media cursor.');
    }
    if (rawLimit !== undefined && !/^[1-9]\d{0,2}$/.test(rawLimit)) {
      throw new BadRequestException('Invalid media page size.');
    }
    const limit = rawLimit === undefined ? 50 : Number(rawLimit);
    if (limit > 100) throw new BadRequestException('Invalid media page size.');
    return this.media.list(centerId, viewer(req), templateId, cursor, limit);
  }
  @Get('mapping')
  @RequirePermission('center.activities.manage')
  mapping(@Param('centerId', uuid()) centerId: string, @Param('templateId', uuid()) templateId: string,
    @Req() req: TbRequest) {
    return this.media.mapping(centerId, viewer(req), templateId);
  }
  @Get('approved-artwork')
  @RequirePermission('center.activities.manage')
  approvedArtwork(@Param('centerId', uuid()) centerId: string, @Param('templateId', uuid()) templateId: string,
    @Req() req: TbRequest) {
    return this.media.approvedArtwork(centerId, viewer(req), templateId);
  }
  @Post()
  @RequirePermission('center.activities.manage')
  propose(@Param('centerId', uuid()) centerId: string, @Param('templateId', uuid()) templateId: string,
    @Body() dto: ActivityMediaDraftDto, @Req() req: TbRequest) {
    return this.media.propose(centerId, viewer(req), templateId, dto);
  }
  @Get(':draftId/candidates')
  @RequirePermission('center.activities.manage')
  candidateStatuses(@Param('centerId',uuid()) centerId:string,
    @Param('templateId',uuid()) templateId:string,@Param('draftId',uuid()) draftId:string,
    @Req() req:TbRequest,@Query('cursor') cursor?:string,@Query('limit') rawLimit?:string) {
    if (cursor !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cursor))
      throw new BadRequestException('Invalid candidate cursor.');
    if (rawLimit !== undefined && !/^[1-9]\d{0,2}$/.test(rawLimit))
      throw new BadRequestException('Invalid candidate page size.');
    const limit = rawLimit === undefined ? 50 : Number(rawLimit);
    if (limit > 100) throw new BadRequestException('Invalid candidate page size.');
    return this.media.candidateStatuses(centerId,viewer(req),templateId,draftId,cursor,limit);
  }
  @Post(':draftId/candidates')
  @RequirePermission('center.activities.manage')
  uploadCandidate(@Param('centerId',uuid()) centerId:string,
    @Param('templateId',uuid()) templateId:string,@Param('draftId',uuid()) draftId:string,
    @Body() dto:ActivityPrivatePngCandidateDto,@Req() req:TbRequest) {
    return this.media.uploadCandidate(centerId,viewer(req),templateId,draftId,dto.pngBase64);
  }
  @Post(':draftId/candidates/:candidateId/revoke')
  @RequirePermission('center.activities.manage')
  revokeCandidate(@Param('centerId',uuid()) centerId:string,
    @Param('templateId',uuid()) templateId:string,
    @Param('draftId',uuid()) draftId:string,
    @Param('candidateId',uuid()) candidateId:string,@Req() req:TbRequest) {
    return this.media.revokeCandidate(centerId,viewer(req),templateId,draftId,candidateId);
  }
  @Post(':draftId/reject')
  @RequirePermission('center.activities.manage')
  reject(@Param('centerId', uuid()) centerId: string, @Param('templateId', uuid()) templateId: string,
    @Param('draftId', uuid()) draftId: string, @Body() dto: ActivityMediaRejectDto, @Req() req: TbRequest) {
    return this.media.reject(centerId, viewer(req), templateId, draftId, dto);
  }
}
