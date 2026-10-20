import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { FeasibilityProbe } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProbeDto } from './create-probe.dto';
import { PROBE_CONFIG, PROBE_MAX_ROWS, PROBE_WRITES_PER_MINUTE, type ProbeConfig } from './probe-write.guard';

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
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROBE_CONFIG) private readonly probeConfig: ProbeConfig,
  ) {}

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
        probeWrites: {
          enabled: this.probeConfig.writesEnabled,
          maxRows: PROBE_MAX_ROWS,
          perMinutePerIp: PROBE_WRITES_PER_MINUTE,
        },
        time: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded', database: { status: 'down' } });
    }
  }

  async createProbe(dto: CreateProbeDto): Promise<ProbeView> {
    const label = `probe-${dto.source}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
    const [created] = await this.prisma.$transaction([
      this.prisma.feasibilityProbe.create({ data: { label, source: dto.source } }),
      // Runs in the same transaction as the insert, so the new row is visible here.
      this.prisma.$executeRaw`DELETE FROM feasibility_probe WHERE id IN (
        SELECT id FROM feasibility_probe ORDER BY created_at DESC, id DESC OFFSET ${PROBE_MAX_ROWS})`,
    ]);
    return toView(created);
  }

  async listProbes(): Promise<{ total: number; items: ProbeView[] }> {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.feasibilityProbe.count(),
      this.prisma.feasibilityProbe.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    return { total, items: rows.map(toView) };
  }
}
