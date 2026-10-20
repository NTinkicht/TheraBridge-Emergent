import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CreateProbeDto } from './create-probe.dto';
import { HealthService } from './health.service';
import { ProbeWriteGuard } from './probe-write.guard';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  status() {
    return this.health.status();
  }

  @Get('probe')
  list() {
    return this.health.listProbes();
  }

  @Post('probe')
  @HttpCode(201)
  @UseGuards(ProbeWriteGuard)
  create(@Body() dto: CreateProbeDto) {
    return this.health.createProbe(dto);
  }
}
