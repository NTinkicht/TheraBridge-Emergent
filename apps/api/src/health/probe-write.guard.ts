import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export const PROBE_CONFIG = Symbol('PROBE_CONFIG');
export const PROBE_MAX_ROWS = 200;
export const PROBE_WRITES_PER_MINUTE = 10;

export interface ProbeConfig {
  writesEnabled: boolean;
}

export function loadProbeConfig(): ProbeConfig {
  const value = process.env.PROBE_WRITES_ENABLED;
  if (value !== 'true' && value !== 'false') {
    throw new Error('PROBE_WRITES_ENABLED must be set to "true" or "false"');
  }
  return { writesEnabled: value === 'true' };
}

// Disabled → 404 (route behaves as absent). Enabled → per-IP fixed-window limit (single-instance, in-memory).
@Injectable()
export class ProbeWriteGuard implements CanActivate {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(@Inject(PROBE_CONFIG) private readonly config: ProbeConfig) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.config.writesEnabled) throw new NotFoundException();
    const ip = context.switchToHttp().getRequest<FastifyRequest>().ip;
    const now = Date.now();
    const w = this.windows.get(ip);
    if (!w || now - w.start >= 60_000) {
      this.windows.set(ip, { start: now, count: 1 });
      return true;
    }
    if (++w.count > PROBE_WRITES_PER_MINUTE) {
      throw new HttpException('Too many probe writes, try again in a minute', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
