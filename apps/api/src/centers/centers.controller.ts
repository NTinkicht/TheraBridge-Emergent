import { Body, Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Authenticated, Public, RequirePermission, TbRequest } from '../auth/access';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { clearCookie } from '../common/cookies';
import { AUTH_CONFIG, AuthConfig } from '../config/env';
import {
  AcceptNewDto, CreateCenterDto, InviteStaffDto, InviteeDto, ListCentersQuery, ListStaffQuery, StatusChangeDto, TokenDto, UpdateCenterDto, UpdateProfileDto, UpdateStaffDto,
} from './centers.dto';
import { InvitationsService } from './invitations.service';
import { ProvisioningService } from './provisioning.service';
import { WorkspaceService } from './workspace.service';

const uuid = () => new ParseUUIDPipe();
const actor = (req: TbRequest) => req.auth!.session.userId;
const meta = (req: TbRequest) => ({ ip: req.clientIp, userAgent: req.headers['user-agent'] });

@Controller('platform/centers')
export class PlatformCentersController {
  constructor(private readonly centers: ProvisioningService, private readonly invitations: InvitationsService) {}

  @Get()
  @RequirePermission('platform.centers.read')
  list(@Query() q: ListCentersQuery) {
    return this.centers.list(q);
  }

  @Post()
  @RequirePermission('platform.centers.create')
  create(@Body() dto: CreateCenterDto, @Req() req: TbRequest) {
    return this.centers.create(actor(req), dto);
  }

  @Get(':centerId')
  @RequirePermission('platform.centers.read')
  detail(@Param('centerId', uuid()) centerId: string) {
    return this.centers.detail(centerId);
  }

  @Post(':centerId/admin-invitations')
  @RequirePermission('platform.centers.invite_admin')
  invite(@Param('centerId', uuid()) centerId: string, @Body() dto: InviteeDto, @Req() req: TbRequest) {
    return this.invitations.inviteFirstAdmin(centerId, actor(req), dto);
  }

  @Post(':centerId/admin-invitations/:invitationId/resend')
  @HttpCode(200)
  @RequirePermission('platform.centers.invite_admin')
  resend(@Param('centerId', uuid()) centerId: string, @Param('invitationId', uuid()) id: string, @Req() req: TbRequest) {
    return this.invitations.resend(centerId, id, actor(req), 'FIRST_ADMIN');
  }

  @Post(':centerId/admin-invitations/:invitationId/revoke')
  @HttpCode(200)
  @RequirePermission('platform.centers.invite_admin')
  revoke(@Param('centerId', uuid()) centerId: string, @Param('invitationId', uuid()) id: string, @Req() req: TbRequest) {
    return this.invitations.revoke(centerId, id, actor(req), 'FIRST_ADMIN');
  }

  @Post(':centerId/admin-invitations/:invitationId/replace')
  @RequirePermission('platform.centers.invite_admin')
  replace(@Param('centerId', uuid()) centerId: string, @Param('invitationId', uuid()) id: string, @Body() dto: InviteeDto, @Req() req: TbRequest) {
    return this.invitations.replaceFirstAdmin(centerId, id, actor(req), dto);
  }
}

// Every route is tenant-scoped by :centerId, which AuthorizationService checks against the session's active membership.
@Controller('centers/:centerId')
export class CenterWorkspaceController {
  constructor(private readonly ws: WorkspaceService, private readonly invitations: InvitationsService) {}

  @Get('settings')
  @RequirePermission('center.settings.read')
  settings(@Param('centerId', uuid()) centerId: string) {
    return this.ws.settings(centerId);
  }

  @Patch('settings')
  @RequirePermission('center.settings.update')
  updateSettings(@Param('centerId', uuid()) centerId: string, @Body() dto: UpdateCenterDto, @Req() req: TbRequest) {
    return this.ws.updateSettings(centerId, actor(req), dto);
  }

  @Get('setup')
  @RequirePermission('center.setup.manage')
  setup(@Param('centerId', uuid()) centerId: string) {
    return this.ws.setup(centerId);
  }

  @Post('setup/:key/complete')
  @HttpCode(200)
  @RequirePermission('center.setup.manage')
  completeStep(@Param('centerId', uuid()) centerId: string, @Param('key') key: string, @Req() req: TbRequest) {
    return this.ws.completeStep(centerId, key, actor(req));
  }

  @Get('staff')
  @RequirePermission('center.staff.read')
  staff(@Param('centerId', uuid()) centerId: string, @Query() q: ListStaffQuery) {
    return this.ws.staff(centerId, q);
  }

  @Get('staff/:membershipId')
  @RequirePermission('center.staff.read')
  member(@Param('centerId', uuid()) centerId: string, @Param('membershipId', uuid()) id: string) {
    return this.ws.memberDetail(centerId, id);
  }

  @Patch('staff/:membershipId')
  @RequirePermission('center.staff.manage')
  updateMember(@Param('centerId', uuid()) centerId: string, @Param('membershipId', uuid()) id: string, @Body() dto: UpdateStaffDto, @Req() req: TbRequest) {
    return this.ws.updateMember(centerId, id, actor(req), dto);
  }

  @Post('staff/:membershipId/suspend')
  @HttpCode(200)
  @RequirePermission('center.staff.manage')
  suspend(@Param('centerId', uuid()) centerId: string, @Param('membershipId', uuid()) id: string, @Body() dto: StatusChangeDto, @Req() req: TbRequest) {
    return this.ws.changeStatus(centerId, id, { userId: actor(req), membershipId: req.auth!.session.activeMembershipId! }, 'suspend', dto.reason);
  }

  @Post('staff/:membershipId/reactivate')
  @HttpCode(200)
  @RequirePermission('center.staff.manage')
  reactivate(@Param('centerId', uuid()) centerId: string, @Param('membershipId', uuid()) id: string, @Req() req: TbRequest) {
    return this.ws.changeStatus(centerId, id, { userId: actor(req), membershipId: req.auth!.session.activeMembershipId! }, 'reactivate');
  }

  @Post('staff/:membershipId/revoke')
  @HttpCode(200)
  @RequirePermission('center.staff.manage')
  revokeMember(@Param('centerId', uuid()) centerId: string, @Param('membershipId', uuid()) id: string, @Body() dto: StatusChangeDto, @Req() req: TbRequest) {
    return this.ws.changeStatus(centerId, id, { userId: actor(req), membershipId: req.auth!.session.activeMembershipId! }, 'revoke', dto.reason);
  }

  @Get('invitations')
  @RequirePermission('center.staff.read')
  invitationList(@Param('centerId', uuid()) centerId: string) {
    return this.invitations.list(centerId, 'STAFF');
  }

  @Post('invitations')
  @RequirePermission('center.staff.invite')
  invite(@Param('centerId', uuid()) centerId: string, @Body() dto: InviteStaffDto, @Req() req: TbRequest) {
    return this.invitations.inviteStaff(centerId, actor(req), dto);
  }

  @Post('invitations/:invitationId/resend')
  @HttpCode(200)
  @RequirePermission('center.staff.invite')
  resend(@Param('centerId', uuid()) centerId: string, @Param('invitationId', uuid()) id: string, @Req() req: TbRequest) {
    return this.invitations.resend(centerId, id, actor(req), 'STAFF');
  }

  @Post('invitations/:invitationId/revoke')
  @HttpCode(200)
  @RequirePermission('center.staff.invite')
  revokeInvitation(@Param('centerId', uuid()) centerId: string, @Param('invitationId', uuid()) id: string, @Req() req: TbRequest) {
    return this.invitations.revoke(centerId, id, actor(req), 'STAFF');
  }

  @Get('me')
  @RequirePermission('center.profile.self')
  me(@Param('centerId', uuid()) centerId: string, @Req() req: TbRequest) {
    return this.ws.me(centerId, req.auth!.session.activeMembershipId!);
  }

  @Patch('me')
  @RequirePermission('center.profile.self')
  updateMe(@Param('centerId', uuid()) centerId: string, @Body() dto: UpdateProfileDto, @Req() req: TbRequest) {
    const s = req.auth!.session;
    return this.ws.updateMe(centerId, s.activeMembershipId!, { userId: s.userId, role: s.activeRole! }, dto);
  }
}

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly sessions: SessionService,
    private readonly auth: AuthService,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthConfig,
  ) {}

  // The token travels only in POST bodies (never in a URL the server sees), so it cannot land in access logs.
  @Post('inspect')
  @HttpCode(200)
  @Public({ preAuth: true })
  inspect(@Body() dto: TokenDto, @Req() req: TbRequest) {
    return this.invitations.inspect(dto.token, req.clientIp);
  }

  @Post('accept-new')
  @HttpCode(200)
  @Public({ preAuth: true })
  async acceptNew(@Body() dto: AcceptNewDto, @Req() req: TbRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = await this.invitations.acceptNew(dto, meta(req));
    reply.header('set-cookie', [this.sessions.cookieFor(token), clearCookie(this.cfg.preCookie, this.cfg.cookieSecure)]);
    return this.auth.describe(token);
  }

  @Post('accept')
  @HttpCode(200)
  @Authenticated()
  async accept(@Body() dto: TokenDto, @Req() req: TbRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = await this.invitations.acceptExisting(req.auth!, dto.token, meta(req));
    reply.header('set-cookie', this.sessions.cookieFor(token));
    return this.auth.describe(token);
  }
}
