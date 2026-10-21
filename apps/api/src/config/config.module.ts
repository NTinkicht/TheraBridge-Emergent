import { Global, Module } from '@nestjs/common';
import { AUTH_CONFIG, loadAuthConfig } from './env';

@Global()
@Module({
  providers: [{ provide: AUTH_CONFIG, useFactory: () => loadAuthConfig(process.env) }],
  exports: [AUTH_CONFIG],
})
export class ConfigModule {}
