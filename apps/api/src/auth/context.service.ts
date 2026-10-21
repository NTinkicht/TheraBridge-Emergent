import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { sha256 } from '../common/security';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthState } from './access';
import { permissionsFor } from './policy';
import { SessionService } from './session.service';

export type ContextOption =
  | { type: 'platform'; role: 'PLATFORM_ADMIN' }
  | { type: 'center'; membershipId: string; centerId: string; centerName: string; centerSlug: string; role: Role };

const ROLE_PRIORITY: Role[] = ['CENTER_ADMIN', 'COORDINATOR', 'CLINICAL_SUPERVISOR', 'THERAPIST', 'GUARDIAN'];

export interface ContextChoice {
  platform?: boolean;
  membershipId?: string;
  role?: Role;
}

@Injectable()
export class ContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async options(userId: string): Promise<ContextOption[]> {
    const [platform, memberships] = await Promise.all([
      this.prisma.platformRoleAssignment.count({ where: { userId, revokedAt: null } }),
      this.prisma.membership.findMany({
        where: { userId, status: 'ACTIVE', center: { status: 'ACTIVE' } },
        include: { center: true, roles: { orderBy: { role: 'asc' } } },
        orderBy: { center: { name: 'asc' } },
      }),
    ]);
    const out: ContextOption[] = platform ? [{ type: 'platform', role: 'PLATFORM_ADMIN' }] : [];
    for (const m of memberships) {
      for (const r of m.roles) {
        out.push({ type: 'center', membershipId: m.id, centerId: m.centerId, centerName: m.center.name, centerSlug: m.center.slug, role: r.role });
      }
    }
    return out;
  }

  private find(options: ContextOption[], c: ContextChoice): ContextOption | undefined {
    if (c.platform) return options.find((o) => o.type === 'platform');
    return options.find((o) => o.type === 'center' && o.membershipId === c.membershipId && o.role === c.role);
  }

  private fields(o: ContextOption) {
    return o.type === 'platform'
      ? { activePlatform: true, activeMembershipId: null, activeRole: null }
      : { activePlatform: false, activeMembershipId: o.membershipId, activeRole: o.role };
  }

  // A fresh login token gets a context only when exactly one is available; otherwise the user chooses.
  async autoSelect(token: string): Promise<void> {
    const session = await this.prisma.session.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
    const options = await this.options(session.userId);
    if (options.length === 1) await this.prisma.session.update({ where: { id: session.id }, data: this.fields(options[0]) });
  }

  // After accepting an invitation the session lands in that center, in the highest-priority role it now holds.
  async membershipFields(userId: string, membershipId: string) {
    const options = await this.options(userId);
    const pick = ROLE_PRIORITY.map((role) => this.find(options, { membershipId, role })).find(Boolean);
    return pick ? this.fields(pick) : {};
  }

  async enterMembership(token: string, membershipId: string): Promise<void> {
    const session = await this.prisma.session.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
    await this.prisma.session.update({ where: { id: session.id }, data: await this.membershipFields(session.userId, membershipId) });
  }

  async select(auth: AuthState, choice: ContextChoice): Promise<string> {
    const option = this.find(await this.options(auth.session.userId), choice);
    if (!option) throw new ForbiddenException('That workspace is not available to you.');
    const token = await this.sessions.rotate(auth.session, 'context_switched', this.fields(option));
    await this.audit.record('auth.context.switched', {
      actorUserId: auth.session.userId,
      meta: option.type === 'platform' ? { type: 'platform' } : { type: 'center', centerId: option.centerId, role: option.role },
    });
    return token;
  }

  async describe(auth: AuthState): Promise<Record<string, unknown>> {
    const s = auth.session;
    const options = await this.options(s.userId);
    const active = s.activePlatform
      ? this.find(options, { platform: true })
      : s.activeMembershipId ? this.find(options, { membershipId: s.activeMembershipId, role: s.activeRole ?? undefined }) : undefined;
    return { contexts: options, activeContext: active ?? null, permissions: active ? permissionsFor(active.role) : [] };
  }
}
