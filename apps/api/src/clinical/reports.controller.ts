import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { RequirePermission, TbRequest } from '../auth/access';
import type { Viewer } from '../operations/children.service';
import { ProgressQueryDto, ReportCreateDto, ReportSaveDto, ReportVersionDto, ReviewDto } from './clinical.dto';
import { FAMILY_PROGRESS_SAMPLE, ReportsService } from './reports.service';

const uuid = () => new ParseUUIDPipe();
const viewer = (req: TbRequest): Viewer => ({ userId: req.auth!.session.userId, membershipId: req.auth!.session.activeMembershipId!, role: req.auth!.session.activeRole! });

@Controller('centers/:centerId')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('clinical/progress')
  @RequirePermission('center.clinical.read')
  progress(@Param('centerId', uuid()) c: string, @Query() q: ProgressQueryDto, @Req() req: TbRequest) {
    return this.reports.dashboard(c, viewer(req), q);
  }

  @Get('clinical/children/:childId/reports')
  @RequirePermission('center.clinical.read')
  list(@Param('centerId', uuid()) c: string, @Param('childId', uuid()) id: string, @Req() req: TbRequest) {
    return this.reports.list(c, viewer(req), id);
  }

  @Post('clinical/children/:childId/reports')
  @RequirePermission('center.clinical.draft')
  create(@Param('centerId', uuid()) c: string, @Param('childId', uuid()) id: string, @Body() dto: ReportCreateDto, @Req() req: TbRequest) {
    return this.reports.create(c, viewer(req), id, dto);
  }

  @Get('clinical/reports/:id')
  @RequirePermission('center.clinical.read')
  detail(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() req: TbRequest) {
    return this.reports.detail(c, viewer(req), id);
  }

  @Patch('clinical/reports/:id')
  @RequirePermission('center.clinical.draft')
  autosave(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: ReportSaveDto, @Req() req: TbRequest) {
    return this.reports.autosave(c, viewer(req), id, dto);
  }

  @Post('clinical/reports/:id/versions')
  @RequirePermission('center.clinical.draft')
  saveVersion(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: ReportVersionDto, @Req() req: TbRequest) {
    return this.reports.saveVersion(c, viewer(req), id, dto.version);
  }

  @Post('clinical/reports/:id/submit')
  @HttpCode(200)
  @RequirePermission('center.clinical.draft')
  submit(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: ReportVersionDto, @Req() req: TbRequest) {
    return this.reports.submit(c, viewer(req), id, dto.version);
  }

  @Post('clinical/reports/:id/comments')
  @HttpCode(200)
  @RequirePermission('center.clinical.review')
  comment(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: ReviewDto, @Req() req: TbRequest) {
    return this.reports.review(c, viewer(req), id, dto, false);
  }

  @Post('clinical/reports/:id/return')
  @HttpCode(200)
  @RequirePermission('center.clinical.review')
  giveBack(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: ReviewDto, @Req() req: TbRequest) {
    return this.reports.review(c, viewer(req), id, dto, true);
  }

  // Deliberately unreachable: release needs clinical.report.release, which is DENY for every role.
  @Post('clinical/reports/:id/release')
  @HttpCode(200)
  @RequirePermission('clinical.report.release')
  release() {
    return { ok: false };
  }

  @Get('clinical/report-versions/:id')
  @RequirePermission('center.clinical.read')
  version(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() req: TbRequest) {
    return this.reports.versionDetail(c, viewer(req), id);
  }

  @Get('clinical/reports/:id/family-preview')
  @RequirePermission('center.clinical.read')
  preview(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() req: TbRequest) {
    return this.reports.familyPreview(c, viewer(req), id);
  }

  @Get('family/progress-demo')
  @RequirePermission('family.progress.demo')
  familyDemo() {
    return FAMILY_PROGRESS_SAMPLE;
  }
}
