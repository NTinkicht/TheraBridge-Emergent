import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrialService } from './trial.service';

@Global()
@Module({ imports: [AuthModule], providers: [TrialService], exports: [TrialService] })
export class TrialModule {}
