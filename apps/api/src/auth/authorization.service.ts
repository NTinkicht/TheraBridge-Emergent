import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthState } from './access';
import { can } from './policy';

// Permissions come only from an active role in an active membership of an active center, or an active platform role.
// Re-read from PostgreSQL on every request, so suspension or revocation applies to the very next request.
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async enforce(auth: AuthState, permission: string, params: Record<string, string>): Promise<void> {
    const s = auth.session;
    if (permission.startsWith('platform.')) {
      const active = s.activePlatform && (await this.prisma.platformRoleAssignment.count({ where: { userId: s.userId, revokedAt: null } })) > 0;
      if (!active || !can('PLATFORM_ADMIN', permission)) throw new ForbiddenException('You do not have access to this area.');
      return;
    }
    if (permission.startsWith('center.')) {
      const centerId = params.centerId;
      if (!s.activeMembershipId || !s.activeRole || !centerId) throw new NotFoundException();
      const m = await this.prisma.membership.findUnique({ where: { id: s.activeMembershipId }, include: { center: true, roles: true } });
      const live = m && m.centerId === centerId && m.status === 'ACTIVE' && m.center.status === 'ACTIVE' && m.roles.some((r) => r.role === s.activeRole);
      if (!live) throw new NotFoundException();
      if (!can(s.activeRole, permission)) throw new ForbiddenException('Your role does not include this action.');
      return;
    }
    throw new ForbiddenException();
  }
}
