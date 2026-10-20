import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PROBE_CONFIG, ProbeWriteGuard, loadProbeConfig } from './probe-write.guard';

@Module({
  controllers: [HealthController],
  providers: [HealthService, ProbeWriteGuard, { provide: PROBE_CONFIG, useFactory: loadProbeConfig }],
})
export class HealthModule {}
