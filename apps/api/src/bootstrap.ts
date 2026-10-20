import { ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

// Shared by main.ts and the e2e tests so both run the identical HTTP configuration.
export function configureApp(app: NestFastifyApplication, corsOrigins: string[]): void {
  // JSON-only bodies: blocks cross-site "simple" form posts that skip CORS preflight.
  app.getHttpAdapter().getInstance().addHook('onRequest', async (req, reply) => {
    const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
    if (hasBody && !String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      await reply.code(415).send({ statusCode: 415, error: 'Unsupported Media Type', message: 'Request body must be application/json' });
    }
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.enableShutdownHooks();
}
