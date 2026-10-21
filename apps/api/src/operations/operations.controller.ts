import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { RequirePermission, TbRequest } from '../auth/access';
import { AppointmentDto, AppointmentStatusDto, AssignmentDto, ChildDto, ExtendTrialDto, GuardianDto, ListChildrenQuery, RangeQuery, ReasonDto, RescheduleDto, UpdateChildDto } from './operations.dto';
import { ChildrenService, Viewer } from './children.service';
import { ScheduleService } from './schedule.service';
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

// Tenant-scoped by :centerId (checked against the active membership); therapist visibility is narrowed in the services.
@Controller('centers/:centerId')
export class OperationsController {
  constructor(private readonly children: ChildrenService, private readonly schedule: ScheduleService, private readonly trial: TrialService) {}

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
  therapists(@Param('centerId', uuid()) centerId: string) {
    return this.children.therapists(centerId);
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
}
