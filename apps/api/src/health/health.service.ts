import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { FeasibilityProbe } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProbeDto } from './create-probe.dto';

export interface ProbeView {
  id: string;
  label: string;
  source: string;
  createdAt: string;
}

const toView = (p: FeasibilityProbe): ProbeView => ({
  id: p.id,
  label: p.label,
  source: p.source,
  createdAt: p.createdAt.toISOString(),
});

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    const started = Date.now();
    try {
      const [{ server_version }] = await this.prisma.$queryRaw<{ server_version: string }[]>`SHOW server_version`;
      const migrations = await this.prisma.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at`;
      return {
        status: 'ok',
        service: 'therabridge-api',
        framework: 'nestjs-fastify',
        database: { status: 'up', engine: 'postgresql', version: server_version, latencyMs: Date.now() - started },
        migrations: { applied: migrations.length, latest: migrations.at(-1)?.migration_name ?? null },
        time: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded', database: { status: 'down' } });
    }
  }

  async createProbe(dto: CreateProbeDto): Promise<ProbeView> {
    return toView(await this.prisma.feasibilityProbe.create({ data: { label: dto.label, source: dto.source } }));
  }

  async listProbes(): Promise<{ total: number; items: ProbeView[] }> {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.feasibilityProbe.count(),
      this.prisma.feasibilityProbe.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    return { total, items: rows.map(toView) };
  }
}
