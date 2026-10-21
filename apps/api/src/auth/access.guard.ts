import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../audit/audit.service';
import { parseCookies } from '../common/cookies';
import { safeEqual } from '../common/security';
import { AUTH_CONFIG, AuthConfig } from '../config/env';
import { ACCESS_KEY, Access, TbRequest, UNSAFE_METHODS } from './access';
import { AuthorizationService } from './authorization.service';
import { PreAuthService } from './preauth.service';
import { SessionService } from './session.service';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly preauth: PreAuthService,
    private readonly authz: AuthorizationService,
    private readonly audit: AuditService,
    @Inject(AUTH_CONFIG) private readonly cfg: AuthConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const access = this.reflector.getAllAndOverride<Access | undefined>(ACCESS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!access) throw new ForbiddenException();
    const req = ctx.switchToHttp().getRequest<TbRequest>();
    const cookies = parseCookies(req.headers.cookie);
    const csrf = req.headers['x-csrf-token'];
    const csrfHeader = typeof csrf === 'string' ? csrf : undefined;

    if (access.kind === 'public') {
      if (access.preAuth && !this.preauth.verify(cookies[this.cfg.preCookie], csrfHeader)) {
        return this.rejectCsrf(req, 'preauth');
      }
      return true;
    }

    const token = cookies[this.cfg.sessionCookie];
    const auth = token ? await this.sessions.validate(token) : null;
    if (!auth) throw new UnauthorizedException('Your session has ended. Please sign in again.');
    req.auth = auth;
    if (UNSAFE_METHODS.has(req.method) && !safeEqual(csrfHeader, this.sessions.csrfFor(auth.token))) {
      return this.rejectCsrf(req, 'session', auth.session.userId);
    }
    if (access.kind === 'permission') {
      await this.authz.enforce(auth, access.permission, (req.params ?? {}) as Record<string, string>);
    }
    return true;
  }

  private async rejectCsrf(req: TbRequest, kind: string, userId?: string): Promise<never> {
    await this.audit.record('security.csrf_rejected', { actorUserId: userId, ip: req.clientIp, meta: { kind, path: req.routeOptions?.url ?? '' } });
    throw new ForbiddenException('Security check failed. Refresh the page and try again.');
  }
}
