import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/access';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  status() {
    return this.health.status();
  }
}
