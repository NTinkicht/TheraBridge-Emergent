import { Module } from '@nestjs/common';
import { APP_GUARD, DiscoveryModule } from '@nestjs/core';
import { CLOCK, systemClock } from '../common/clock';
import { DevMailboxModule } from '../dev-mailbox/dev-mailbox.module';
import { AccessGuard } from './access.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthorizationService } from './authorization.service';
import { ContextService } from './context.service';
import { PreAuthService } from './preauth.service';
import { RateLimitStore } from './rate-limit.store';
import { RouteAccessVerifier } from './route-access.verifier';
import { SessionService } from './session.service';

@Module({
  imports: [DiscoveryModule, DevMailboxModule],
  controllers: [AuthController],
  providers: [
    { provide: CLOCK, useValue: systemClock },
    AuthService,
    SessionService,
    PreAuthService,
    RateLimitStore,
    AuthorizationService,
    ContextService,
    RouteAccessVerifier,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [SessionService, AuthorizationService, ContextService, RouteAccessVerifier, RateLimitStore, CLOCK],
})
export class AuthModule {}
