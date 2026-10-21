import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { RequirePermission } from '../auth/access';
import { PrismaService } from '../prisma/prisma.service';

// Guard-proof endpoints for TB-EM-001: counts and names only, no clinical data.
@Controller()
export class TenancyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('platform/summary')
  @RequirePermission('platform.summary.read')
  async platformSummary() {
    const [centers, activeCenters, pendingApplications] = await Promise.all([
      this.prisma.center.count(),
      this.prisma.center.count({ where: { status: 'ACTIVE' } }),
      this.prisma.centerApplication.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
    ]);
    return { centers, activeCenters, pendingApplications };
  }

  @Get('centers/:centerId/summary')
  @RequirePermission('center.summary.read')
  async centerSummary(@Param('centerId', new ParseUUIDPipe()) centerId: string) {
    const center = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId } });
    const members = await this.prisma.membership.count({ where: { centerId, status: 'ACTIVE' } });
    return { center: { id: center.id, name: center.name, slug: center.slug, timezone: center.timezone }, activeMembers: members };
  }
}
