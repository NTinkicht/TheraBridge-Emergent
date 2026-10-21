import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { RequirePermission, TbRequest } from '../auth/access';
import type { Viewer } from '../operations/children.service';
import { FeedbackQueryDto, OutcomeDto, PracticeWeekDto } from './clinical.dto';
import { PracticeService } from './practice.service';

const uuid = () => new ParseUUIDPipe();
const viewer = (req: TbRequest): Viewer => ({ userId: req.auth!.session.userId, membershipId: req.auth!.session.activeMembershipId!, role: req.auth!.session.activeRole! });

@Controller('centers/:centerId')
export class PracticeController {
  constructor(private readonly practice: PracticeService) {}

  @Get('family/practice')
  @RequirePermission('family.practice.read')
  week(@Param('centerId', uuid()) c: string, @Query() q: PracticeWeekDto, @Req() req: TbRequest) {
    return this.practice.week(c, viewer(req), q.week);
  }

  @Get('family/practice/history')
  @RequirePermission('family.practice.read')
  history(@Param('centerId', uuid()) c: string, @Query() q: PracticeWeekDto, @Req() req: TbRequest) {
    return this.practice.history(c, viewer(req), q.childId);
  }

  @Get('family/practice/outcomes/:key')
  @RequirePermission('family.practice.read')
  byKey(@Param('centerId', uuid()) c: string, @Param('key', uuid()) key: string, @Req() req: TbRequest) {
    return this.practice.byKey(c, viewer(req), key);
  }

  // A replay of the same submission returns 200 with the original outcome instead of creating a duplicate.
  @Post('family/practice/outcomes')
  @RequirePermission('family.practice.record')
  async record(@Param('centerId', uuid()) c: string, @Body() dto: OutcomeDto, @Req() req: TbRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const r = await this.practice.record(c, viewer(req), dto);
    res.status(r.replayed ? 200 : 201);
    return r;
  }

  @Get('clinical/practice-feedback')
  @RequirePermission('center.practice.read')
  inbox(@Param('centerId', uuid()) c: string, @Query() q: FeedbackQueryDto, @Req() req: TbRequest) {
    return this.practice.inbox(c, viewer(req), q);
  }

  @Post('clinical/practice-feedback/:id/acknowledge')
  @HttpCode(200)
  @RequirePermission('center.practice.acknowledge')
  acknowledge(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() req: TbRequest) {
    return this.practice.acknowledge(c, viewer(req), id);
  }
}
