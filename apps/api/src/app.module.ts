import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { ApplicationsModule } from './applications/applications.module';
import { CentersModule } from './centers/centers.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule, AuthModule, HealthModule, TenancyModule, ApplicationsModule, CentersModule],
})
export class AppModule {}
