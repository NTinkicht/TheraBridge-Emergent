import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { RequirePermission, TbRequest } from '../auth/access';
import {
  AppointmentDto, AppointmentStatusDto, AssignmentDto, ChildDto, ExtendTrialDto, FamilyPreferenceDto, GuardianDto, ListChildrenQuery, MessageDto, RangeQuery, ReasonDto, RescheduleDto,
  SeriesCancelDto, SeriesDto, SeriesUpdateDto, ThreadDto, ThreadListQuery, UpdateChildDto, ReferentDto,
} from './operations.dto';
import { ChildrenService, Viewer } from './children.service';
import { MessagesService } from './messages.service';
import { NoticesService } from './notices.service';
import { ScheduleService } from './schedule.service';
import { SeriesService } from './series.service';
import { TrialService } from './trial.service';

const uuid = () => new ParseUUIDPipe();
const actor = (req: TbRequest) => req.auth!.session.userId;
const viewer = (req: TbRequest): Viewer => ({ userId: req.auth!.session.userId, membershipId: req.auth!.session.activeMembershipId!, role: req.auth!.session.activeRole! });

@Controller('platform/centers/:centerId/trial')
export class PlatformTrialController {
  constructor(private readonly trial: TrialService) {}

  @Get()
  @RequirePermission('platform.centers.read')
  status(@Param('centerId', uuid()) centerId: string) {
    return this.trial.status(centerId);
  }

  @Post('extend')
  @HttpCode(200)
  @RequirePermission('platform.centers.trial')
  extend(@Param('centerId', uuid()) centerId: string, @Body() dto: ExtendTrialDto, @Req() req: TbRequest) {
    return this.trial.extend(centerId, actor(req), dto.days, dto.reason);
  }
}

@Controller('platform/reminders')
export class PlatformRemindersController {
  constructor(private readonly notices: NoticesService) {}

  @Post('run')
  @HttpCode(200)
  @RequirePermission('platform.reminders.run')
  run() {
    return this.notices.runDue();
  }
}

// Tenant-scoped by :centerId (checked against the active membership); therapist visibility is narrowed in the services.
@Controller('centers/:centerId')
export class OperationsController {
  constructor(
    private readonly children: ChildrenService, private readonly schedule: ScheduleService, private readonly trial: TrialService,
    private readonly series: SeriesService, private readonly messages: MessagesService,
  ) {}

  @Get('trial')
  @RequirePermission('center.summary.read')
  trialStatus(@Param('centerId', uuid()) centerId: string) {
    return this.trial.status(centerId);
  }

  @Get('dashboard')
  @RequirePermission('center.summary.read')
  dashboard(@Param('centerId', uuid()) centerId: string, @Req() req: TbRequest) {
    return this.schedule.dashboard(centerId, viewer(req));
  }

  @Get('therapists')
  @RequirePermission('center.children.read')
  therapists(@Param('centerId', uuid()) centerId: string,
    @Query('offset') rawOffset?: string, @Query('limit') rawLimit?: string,
    @Query('service') rawService?: string, @Query('search') rawSearch?: string,
    @Query('ids') rawIds?: string) {
    if ([rawOffset, rawLimit, rawService, rawSearch, rawIds].some(value => value !== undefined && typeof value !== 'string')) {
      throw new BadRequestException('Invalid therapist filters.');
    }
    const offset = rawOffset === undefined ? 0 : Number(rawOffset);
    const limit = rawLimit === undefined ? 100 : Number(rawLimit);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000 || (rawOffset !== undefined && !/^\d+$/.test(rawOffset)) ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > 200 || (rawLimit !== undefined && !/^\d+$/.test(rawLimit))) {
      throw new BadRequestException('Invalid therapist pagination.');
    }
    const ids = rawIds ? rawIds.split(',') : undefined;
    if ((rawService?.length ?? 0) > 80 || (rawSearch?.length ?? 0) > 100 ||
        (ids && (ids.length > 100 || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))))) {
      throw new BadRequestException('Invalid therapist filters.');
    }
    return this.children.therapists(centerId, { offset, limit, service: rawService || undefined,
      search: rawSearch?.trim(), ids });
  }

  @Get('children')
  @RequirePermission('center.children.read')
  list(@Param('centerId', uuid()) centerId: string, @Query() q: ListChildrenQuery, @Req() req: TbRequest) {
    return this.children.list(centerId, viewer(req), q);
  }

  @Post('children')
  @RequirePermission('center.children.manage')
  create(@Param('centerId', uuid()) centerId: string, @Body() dto: ChildDto, @Req() req: TbRequest) {
    return this.children.create(centerId, actor(req), dto);
  }

  @Get('children/:childId')
  @RequirePermission('center.children.read')
  detail(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Req() req: TbRequest) {
    return this.children.detail(centerId, viewer(req), id);
  }

  @Patch('children/:childId')
  @RequirePermission('center.children.manage')
  async update(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Body() dto: UpdateChildDto, @Req() req: TbRequest) {
    await this.children.update(centerId, actor(req), id, dto);
    return this.children.detail(centerId, viewer(req), id);
  }

  @Post('children/:childId/archive')
  @HttpCode(200)
  @RequirePermission('center.children.manage')
  async archive(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Body() dto: ReasonDto, @Req() req: TbRequest) {
    await this.children.setStatus(centerId, actor(req), id, 'ARCHIVED', dto.reason);
    return this.children.detail(centerId, viewer(req), id);
  }

  @Post('children/:childId/restore')
  @HttpCode(200)
  @RequirePermission('center.children.manage')
  async restore(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Req() req: TbRequest) {
    await this.children.setStatus(centerId, actor(req), id, 'ACTIVE');
    return this.children.detail(centerId, viewer(req), id);
  }

  @Post('children/:childId/guardians')
  @RequirePermission('center.families.manage')
  addGuardian(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Body() dto: GuardianDto, @Req() req: TbRequest) {
    return this.children.addGuardian(centerId, actor(req), id, dto);
  }

  @Post('children/:childId/guardians/:linkId/invite')
  @HttpCode(200)
  @RequirePermission('center.families.manage')
  inviteGuardian(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Param('linkId', uuid()) linkId: string, @Req() req: TbRequest) {
    return this.children.sendGuardianInvite(centerId, actor(req), id, linkId);
  }

  @Post('children/:childId/guardians/:linkId/remove')
  @HttpCode(200)
  @RequirePermission('center.families.manage')
  async removeGuardian(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Param('linkId', uuid()) linkId: string, @Body() dto: ReasonDto, @Req() req: TbRequest) {
    await this.children.removeGuardian(centerId, actor(req), id, linkId, dto.reason);
    return { ok: true };
  }

  @Patch('children/:childId/referent')
  @RequirePermission('center.children.manage')
  setReferent(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string,
    @Body() dto: ReferentDto, @Req() req: TbRequest) {
    return this.children.setReferent(centerId, viewer(req), id, dto);
  }

  @Post('children/:childId/assignments')
  @RequirePermission('center.assignments.manage')
  assign(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Body() dto: AssignmentDto, @Req() req: TbRequest) {
    return this.children.assign(centerId, actor(req), id, dto);
  }

  @Post('children/:childId/assignments/:assignmentId/end')
  @HttpCode(200)
  @RequirePermission('center.assignments.manage')
  async endAssignment(@Param('centerId', uuid()) centerId: string, @Param('childId', uuid()) id: string, @Param('assignmentId', uuid()) aid: string, @Req() req: TbRequest) {
    await this.children.endAssignment(centerId, actor(req), id, aid);
    return { ok: true };
  }

  @Get('appointments')
  @RequirePermission('center.schedule.read')
  appointments(@Param('centerId', uuid()) centerId: string, @Query() q: RangeQuery, @Req() req: TbRequest) {
    return this.schedule.list(centerId, viewer(req), q);
  }

  @Post('appointments')
  @RequirePermission('center.schedule.manage')
  book(@Param('centerId', uuid()) centerId: string, @Body() dto: AppointmentDto, @Req() req: TbRequest) {
    return this.schedule.create(centerId, actor(req), dto);
  }

  @Patch('appointments/:appointmentId')
  @RequirePermission('center.schedule.manage')
  async reschedule(@Param('centerId', uuid()) centerId: string, @Param('appointmentId', uuid()) id: string, @Body() dto: RescheduleDto, @Req() req: TbRequest) {
    await this.schedule.reschedule(centerId, actor(req), id, dto);
    return { ok: true };
  }

  @Post('appointments/:appointmentId/status')
  @HttpCode(200)
  @RequirePermission('center.appointments.status')
  async status(@Param('centerId', uuid()) centerId: string, @Param('appointmentId', uuid()) id: string, @Body() dto: AppointmentStatusDto, @Req() req: TbRequest) {
    await this.schedule.setStatus(centerId, viewer(req), id, dto);
    return { ok: true };
  }

  @Get('family')
  @RequirePermission('family.portal.read')
  family(@Param('centerId', uuid()) centerId: string, @Req() req: TbRequest) {
    return this.schedule.family(centerId, viewer(req));
  }

  @Post('family/preferences')
  @HttpCode(200)
  @RequirePermission('family.preferences.update')
  preference(@Param('centerId', uuid()) centerId: string, @Body() dto: FamilyPreferenceDto, @Req() req: TbRequest) {
    return this.schedule.setPreference(centerId, viewer(req), dto);
  }

  @Post('series')
  @RequirePermission('center.schedule.manage')
  createSeries(@Param('centerId', uuid()) centerId: string, @Body() dto: SeriesDto, @Req() req: TbRequest) {
    return this.series.create(centerId, actor(req), dto);
  }

  @Get('series/:seriesId')
  @RequirePermission('center.schedule.read')
  seriesDetail(@Param('centerId', uuid()) centerId: string, @Param('seriesId', uuid()) id: string, @Req() req: TbRequest) {
    return this.series.detail(centerId, viewer(req), id);
  }

  @Patch('series/:seriesId')
  @RequirePermission('center.schedule.manage')
  updateSeries(@Param('centerId', uuid()) centerId: string, @Param('seriesId', uuid()) id: string, @Body() dto: SeriesUpdateDto, @Req() req: TbRequest) {
    return this.series.update(centerId, actor(req), id, dto);
  }

  @Post('series/:seriesId/cancel')
  @HttpCode(200)
  @RequirePermission('center.schedule.manage')
  cancelSeries(@Param('centerId', uuid()) centerId: string, @Param('seriesId', uuid()) id: string, @Body() dto: SeriesCancelDto, @Req() req: TbRequest) {
    return this.series.cancel(centerId, actor(req), id, dto);
  }

  @Get('threads')
  @RequirePermission('center.messages.use')
  threads(@Param('centerId', uuid()) centerId: string, @Query() q: ThreadListQuery, @Req() req: TbRequest) {
    return this.messages.list(centerId, viewer(req), q);
  }

  @Post('threads')
  @RequirePermission('center.messages.use')
  openThread(@Param('centerId', uuid()) centerId: string, @Body() dto: ThreadDto, @Req() req: TbRequest) {
    return this.messages.create(centerId, viewer(req), dto);
  }

  @Get('threads/:threadId')
  @RequirePermission('center.messages.use')
  thread(@Param('centerId', uuid()) centerId: string, @Param('threadId', uuid()) id: string, @Req() req: TbRequest) {
    return this.messages.detail(centerId, viewer(req), id);
  }

  @Post('threads/:threadId/messages')
  @RequirePermission('center.messages.use')
  reply(@Param('centerId', uuid()) centerId: string, @Param('threadId', uuid()) id: string, @Body() dto: MessageDto, @Req() req: TbRequest) {
    return this.messages.reply(centerId, viewer(req), id, dto);
  }

  @Post('threads/:threadId/close')
  @HttpCode(200)
  @RequirePermission('center.messages.manage')
  closeThread(@Param('centerId', uuid()) centerId: string, @Param('threadId', uuid()) id: string, @Req() req: TbRequest) {
    return this.messages.setStatus(centerId, viewer(req), id, 'CLOSED');
  }

  @Post('threads/:threadId/reopen')
  @HttpCode(200)
  @RequirePermission('center.messages.manage')
  reopenThread(@Param('centerId', uuid()) centerId: string, @Param('threadId', uuid()) id: string, @Req() req: TbRequest) {
    return this.messages.setStatus(centerId, viewer(req), id, 'OPEN');
  }
}
