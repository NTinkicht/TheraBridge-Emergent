import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { clearCookie, cookie } from '../common/cookies';
import { AUTH_CONFIG, AuthConfig } from '../config/env';
import { Authenticated, Public, TbRequest } from './access';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, ResetPasswordDto } from './auth.dto';
import { AuthService } from './auth.service';
import { PreAuthService } from './preauth.service';
import { ClientMeta, SessionService } from './session.service';

const meta = (req: TbRequest): ClientMeta => ({ ip: req.clientIp, userAgent: req.headers['user-agent'] });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly preauth: PreAuthService,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthConfig,
  ) {}

  @Get('csrf')
  @Public()
  csrf(@Res({ passthrough: true }) reply: FastifyReply) {
    const { nonce, token } = this.preauth.issue();
    reply.header('set-cookie', cookie(this.cfg.preCookie, nonce, { maxAgeSec: this.preauth.ttlSec, secure: this.cfg.cookieSecure }));
    return { csrfToken: token };
  }

  @Post('login')
  @HttpCode(200)
  @Public({ preAuth: true })
  async login(@Body() dto: LoginDto, @Req() req: TbRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = await this.auth.login(dto.email, dto.password, meta(req));
    reply.header('set-cookie', [this.sessions.cookieFor(token), clearCookie(this.cfg.preCookie, this.cfg.cookieSecure)]);
    return this.auth.describe(token);
  }

  @Get('session')
  @Authenticated()
  session(@Req() req: TbRequest) {
    return this.auth.describe(req.auth!.token);
  }

  @Post('logout')
  @HttpCode(204)
  @Authenticated()
  async logout(@Req() req: TbRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.logout(req.auth!, meta(req));
    reply.header('set-cookie', clearCookie(this.cfg.sessionCookie, this.cfg.cookieSecure));
  }

  @Post('logout-all')
  @HttpCode(204)
  @Authenticated()
  async logoutAll(@Req() req: TbRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.logoutAll(req.auth!, meta(req));
    reply.header('set-cookie', clearCookie(this.cfg.sessionCookie, this.cfg.cookieSecure));
  }

  @Post('password/forgot')
  @HttpCode(202)
  @Public({ preAuth: true })
  async forgot(@Body() dto: ForgotPasswordDto, @Req() req: TbRequest) {
    await this.auth.forgot(dto.email, meta(req));
    return { status: 'accepted', message: 'If an account exists for that email, a reset link is on its way.' };
  }

  @Post('password/reset')
  @HttpCode(204)
  @Public({ preAuth: true })
  async reset(@Body() dto: ResetPasswordDto, @Req() req: TbRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    await this.auth.reset(dto.token, dto.password, meta(req));
    reply.header('set-cookie', clearCookie(this.cfg.preCookie, this.cfg.cookieSecure));
  }

  @Post('password/change')
  @HttpCode(200)
  @Authenticated()
  async change(@Body() dto: ChangePasswordDto, @Req() req: TbRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = await this.auth.change(req.auth!, dto.currentPassword, dto.newPassword, meta(req));
    reply.header('set-cookie', this.sessions.cookieFor(token));
    return this.auth.describe(token);
  }
}
