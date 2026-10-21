import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ipPrefix } from '../common/security';
import { PrismaService } from '../prisma/prisma.service';

export type AuditType =
  | 'auth.login.success' | 'auth.login.failure' | 'auth.lockout' | 'auth.rate_limited'
  | 'auth.logout' | 'auth.logout_all' | 'auth.session.rotated'
  | 'auth.password.reset_requested' | 'auth.password.reset_completed' | 'auth.password.changed'
  | 'auth.context.switched' | 'security.csrf_rejected' | 'security.origin_rejected'
  | 'platform.owner_bootstrapped' | 'seed.synthetic';

interface AuditInput {
  actorUserId?: string | null;
  subjectUserId?: string | null;
  ip?: string;
  meta?: Prisma.InputJsonObject;
}

// Append-only. Never pass passwords, tokens, cookies or full IP addresses here.
@Injectable()
export class AuditService {
  private readonly log = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async record(type: AuditType, input: AuditInput = {}): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          type,
          actorUserId: input.actorUserId ?? null,
          subjectUserId: input.subjectUserId ?? null,
          ipPrefix: input.ip ? ipPrefix(input.ip) : null,
          meta: input.meta ?? {},
        },
      });
    } catch (e) {
      this.log.error(`Failed to write audit event ${type}: ${(e as Error).message}`);
      throw e;
    }
  }
}
