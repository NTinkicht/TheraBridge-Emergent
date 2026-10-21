import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { Public, RequirePermission, TbRequest } from '../auth/access';
import { DecisionDto, ListApplicationsQuery, StartReviewDto, SubmitApplicationDto } from './applications.dto';
import { ApplicationsService } from './applications.service';

@Controller()
export class ApplicationsController {
  constructor(private readonly apps: ApplicationsService) {}

  @Post('center-applications')
  @Public({ preAuth: true })
  submit(@Body() dto: SubmitApplicationDto, @Req() req: TbRequest) {
    return this.apps.submit(dto, req.clientIp);
  }

  @Get('platform/applications')
  @RequirePermission('platform.applications.read')
  list(@Query() q: ListApplicationsQuery) {
    return this.apps.list(q);
  }

  @Get('platform/applications/:id')
  @RequirePermission('platform.applications.read')
  detail(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.apps.detail(id);
  }

  @Post('platform/applications/:id/start-review')
  @HttpCode(200)
  @RequirePermission('platform.applications.decide')
  startReview(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: StartReviewDto, @Req() req: TbRequest) {
    return this.apps.startReview(id, req.auth!.session.userId, dto.version);
  }

  @Post('platform/applications/:id/decision')
  @HttpCode(200)
  @RequirePermission('platform.applications.decide')
  decide(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: DecisionDto, @Req() req: TbRequest) {
    return this.apps.decide(id, req.auth!.session.userId, dto);
  }
}
