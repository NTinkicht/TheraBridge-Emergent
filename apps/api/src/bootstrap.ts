import { ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

// Shared by main.ts and the e2e tests so both run the identical HTTP configuration.
export function configureApp(app: NestFastifyApplication, corsOrigins: string[]): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.enableShutdownHooks();
}
