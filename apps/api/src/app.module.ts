import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { ApplicationsModule } from './applications/applications.module';
import { CentersModule } from './centers/centers.module';
import { OperationsModule } from './operations/operations.module';
import { ClinicalModule } from './clinical/clinical.module';
import { TrialModule } from './operations/trial.module';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule, AuthModule, HealthModule, TenancyModule, ApplicationsModule, TrialModule, CentersModule, OperationsModule, ClinicalModule],
})
export class AppModule {}
