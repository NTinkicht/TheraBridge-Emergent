import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async status() {
    const started = Date.now();
    try {
      const [{ server_version }] = await this.prisma.$queryRaw<{ server_version: string }[]>`SHOW server_version`;
      const migrations = await this.prisma.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at, migration_name`;
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
}
