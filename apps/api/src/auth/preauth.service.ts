import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../common/clock';
import { hmac, randomToken, safeEqual } from '../common/security';
import { AUTH_CONFIG, AuthConfig } from '../config/env';

const PRE_TTL_MS = 10 * 60_000;

// Pre-session CSRF for login/forgot/reset: HMAC-signed token bound to a nonce held in a short-lived HttpOnly cookie.
@Injectable()
export class PreAuthService {
  constructor(@Inject(AUTH_CONFIG) private readonly cfg: AuthConfig, @Inject(CLOCK) private readonly clock: Clock) {}

  readonly ttlSec = PRE_TTL_MS / 1000;

  issue(): { nonce: string; token: string } {
    const nonce = randomToken(24);
    const exp = this.clock.now().getTime() + PRE_TTL_MS;
    return { nonce, token: `${exp}.${this.sign(nonce, exp)}` };
  }

  verify(nonce: string | undefined, token: string | undefined): boolean {
    if (!nonce || !token) return false;
    const [exp, mac, extra] = token.split('.');
    if (extra !== undefined || !/^\d{13}$/.test(exp ?? '') || Number(exp) <= this.clock.now().getTime()) return false;
    return safeEqual(mac, this.sign(nonce, Number(exp)));
  }

  private sign(nonce: string, exp: number): string {
    return hmac(this.cfg.secret, `pre:${nonce}:${exp}`);
  }
}
