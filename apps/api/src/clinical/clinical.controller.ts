import { SessionExecutionService } from './session.service';
import { SessionStartDto, SessionSaveDto } from './session.dto';
import { BadRequestException, Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { RequirePermission, TbRequest } from '../auth/access';
import type { Viewer } from '../operations/children.service';
import { AssessmentDto, AssessmentUpdateDto, ObservationDto, PlanDto, PlanVersionUpdateDto, ReviewDto, SessionNoteDto, SessionNoteUpdateDto, TemplateDto, TemplateUpdateDto, TemplateCopyDto, GoalReviewCheckpointDto } from './clinical.dto';
import { GovernanceService } from './governance.service';
import { ReportVersionDto } from './clinical.dto';
import { ClinicalService } from './clinical.service';

const uuid = () => new ParseUUIDPipe();
const viewer = (req: TbRequest): Viewer => ({ userId: req.auth!.session.userId, membershipId: req.auth!.session.activeMembershipId!, role: req.auth!.session.activeRole! });

@Controller('centers/:centerId')
export class ClinicalController {
  constructor(private readonly clinical: ClinicalService, private readonly governance: GovernanceService, private readonly execution: SessionExecutionService) {}

  @Get('clinical/children/:childId')
  @RequirePermission('center.clinical.read')
  workspace(@Param('centerId', uuid()) c: string, @Param('childId', uuid()) id: string, @Req() req: TbRequest,
    @Query('planOffset') rawOffset?: string, @Query('assessmentOffset') rawAssessmentOffset?: string) {
    const offset = rawOffset === undefined ? 0 : Number(rawOffset);
    const assessmentOffset = rawAssessmentOffset === undefined ? 0 : Number(rawAssessmentOffset);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000 || (rawOffset !== undefined && !/^\d+$/.test(rawOffset))) {
      throw new BadRequestException('Invalid plan pagination offset.');
    }
    if (!Number.isSafeInteger(assessmentOffset) || assessmentOffset < 0 || assessmentOffset > 100_000 ||
        (rawAssessmentOffset !== undefined && !/^\d+$/.test(rawAssessmentOffset))) {
      throw new BadRequestException('Invalid assessment pagination offset.');
    }
    return this.clinical.workspace(c, viewer(req), id, offset, assessmentOffset);
  }

  @Post('clinical/children/:childId/assessments')
  @RequirePermission('center.clinical.draft')
  assess(@Param('centerId', uuid()) c: string, @Param('childId', uuid()) id: string, @Body() dto: AssessmentDto, @Req() req: TbRequest) {
    return this.clinical.createAssessment(c, viewer(req), id, dto);
  }

  @Patch('clinical/assessments/:id')
  @RequirePermission('center.clinical.draft')
  updateAssessment(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: AssessmentUpdateDto, @Req() req: TbRequest) {
    return this.clinical.updateAssessment(c, viewer(req), id, dto);
  }

  @Post('clinical/children/:childId/plans')
  @RequirePermission('center.clinical.draft')
  plan(@Param('centerId', uuid()) c: string, @Param('childId', uuid()) id: string, @Body() dto: PlanDto, @Req() req: TbRequest) {
    return this.clinical.createPlan(c, viewer(req), id, dto);
  }

  @Post('clinical/plans/:planId/versions')
  @RequirePermission('center.clinical.draft')
  newVersion(@Param('centerId', uuid()) c: string, @Param('planId', uuid()) id: string, @Req() req: TbRequest) {
    return this.clinical.newVersion(c, viewer(req), id);
  }

  @Patch('clinical/plan-versions/:id')
  @RequirePermission('center.clinical.draft')
  saveVersion(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: PlanVersionUpdateDto, @Req() req: TbRequest) {
    return this.clinical.updateVersion(c, viewer(req), id, dto);
  }

  @Post('clinical/plan-versions/:id/goal-checkpoints')
  @HttpCode(200)
  @RequirePermission('center.clinical.draft')
  checkpoint(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string,
    @Body() dto: GoalReviewCheckpointDto, @Req() req: TbRequest) {
    return this.clinical.recordGoalCheckpoint(c, viewer(req), id, dto);
  }

  @Post('clinical/plan-versions/:id/submit')
  @HttpCode(200)
  @RequirePermission('center.clinical.draft')
  submit(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: ReportVersionDto, @Req() req: TbRequest) {
    return this.governance.transition(c, viewer(req), 'PLAN', id, { version: dto.version, action: 'SUBMIT', reason: 'Submitted for internal review' });
  }

  @Post('clinical/plan-versions/:id/return')
  @HttpCode(200)
  @RequirePermission('center.clinical.review')
  giveBack(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: ReviewDto, @Req() req: TbRequest) {
    return this.governance.transition(c, viewer(req), 'PLAN', id, { version: dto.version, action: 'RETURN', reason: dto.comment });
  }

  // Deliberately unreachable: approval needs clinical.plan.approve, which is DENY for every role.
  @Post('clinical/plan-versions/:id/approve')
  @HttpCode(200)
  @RequirePermission('clinical.plan.approve')
  approve() {
    return { ok: false };
  }

  @Get('clinical/plan-versions/:id/family-preview')
  @RequirePermission('center.clinical.read')
  preview(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Req() req: TbRequest) {
    return this.governance.capturePreview(c, viewer(req), 'PLAN', id);
  }

  @Post('clinical/children/:childId/sessions')
  @RequirePermission('center.clinical.draft')
  startSession(@Param('centerId', uuid()) c: string, @Param('childId', uuid()) id: string, @Body() dto: SessionStartDto, @Req() req: TbRequest) {
    return this.execution.start(c, viewer(req), id, dto);
  }

  @Patch('clinical/sessions/:id')
  @RequirePermission('center.clinical.draft')
  saveSession(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: SessionSaveDto, @Req() req: TbRequest) {
    return this.execution.save(c, viewer(req), id, dto);
  }

  @Post('clinical/children/:childId/notes')
  @RequirePermission('center.clinical.draft')
  note(@Param('centerId', uuid()) c: string, @Param('childId', uuid()) id: string, @Body() dto: SessionNoteDto, @Req() req: TbRequest) {
    return this.clinical.createNote(c, viewer(req), id, dto);
  }

  @Patch('clinical/notes/:id')
  @RequirePermission('center.clinical.draft')
  saveNote(@Param('centerId', uuid()) c: string, @Param('id', uuid()) id: string, @Body() dto: SessionNoteUpdateDto, @Req() req: TbRequest) {
    return this.clinical.updateNote(c, viewer(req), id, dto);
  }

  // Deliberately unreachable: signing needs clinical.note.sign, which is DENY for every role.
  @Post('clinical/notes/:id/sign')
  @HttpCode(200)
  @RequirePermission('clinical.note.sign')
  sign() {
    return { ok: false };
  }

  @Post('clinical/children/:childId/observations')
  @RequirePermission('center.clinical.draft')
  observe(@Param('centerId', uuid()) c: string, @Param('childId', uuid()) id: string, @Body() dto: ObservationDto, @Req() req: TbRequest) {
    return this.clinical.addObservation(c, viewer(req), id, dto);
  }

  @Get('activities')
  @RequirePermission('center.activities.read')
  templates(@Param('centerId', uuid()) c: string, @Req() req: TbRequest,
    @Query('offset') rawOffset?: string, @Query('limit') rawLimit?: string,
    @Query('search') rawSearch?: string, @Query('service') rawService?: string,
    @Query('ownership') rawOwnership?: string) {
    const offset = rawOffset === undefined ? 0 : Number(rawOffset);
    const limit = rawLimit === undefined ? 100 : Number(rawLimit);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000 || (rawOffset !== undefined && !/^\d+$/.test(rawOffset)) ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > 200 || (rawLimit !== undefined && !/^\d+$/.test(rawLimit))) {
      throw new BadRequestException('Invalid activity pagination.');
    }
    if ((rawSearch?.length ?? 0) > 100 || (rawService?.length ?? 0) > 80 ||
        (rawOwnership !== undefined && !['all', 'mine', 'center', 'samples'].includes(rawOwnership))) {
      throw new BadRequestException('Invalid activity search filters.');
    }
    return this.clinical.templatePage(c, viewer(req), { offset, limit, search: rawSearch?.trim(),
      service: rawService || undefined, ownership: rawOwnership as 'all' | 'mine' | 'center' | 'samples' | undefined });
  }

  @Post('activities')
  @RequirePermission('center.activities.manage')
  createTemplate(@Param('centerId', uuid()) c: string, @Body() dto: TemplateDto, @Req() req: TbRequest) {
    return this.clinical.createTemplate(c, viewer(req), dto);
  }

  @Post('activities/:templateId/duplicate')
  @RequirePermission('center.activities.manage')
  duplicateTemplate(@Param('centerId', uuid()) c: string, @Param('templateId', uuid()) id: string, @Body() dto: TemplateCopyDto, @Req() req: TbRequest) {
    return this.clinical.duplicateTemplate(c, viewer(req), id, dto);
  }

  @Patch('activities/:templateId')
  @RequirePermission('center.activities.manage')
  updateTemplate(@Param('centerId', uuid()) c: string, @Param('templateId', uuid()) id: string, @Body() dto: TemplateUpdateDto, @Req() req: TbRequest) {
    return this.clinical.updateTemplate(c, viewer(req), id, dto);
  }

  @Get('family/activities')
  @RequirePermission('family.activities.read')
  family(@Param('centerId', uuid()) c: string, @Req() req: TbRequest) {
    return this.clinical.familyActivities(c, viewer(req));
  }
}
