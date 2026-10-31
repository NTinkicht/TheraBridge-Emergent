import { ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AuditService } from './audit/audit.service';
import { TbRequest, UNSAFE_METHODS } from './auth/access';
import { resolveClientIp } from './common/security';
import { AUTH_CONFIG, AuthConfig } from './config/env';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

export const API_BODY_LIMIT_BYTES = 1024 * 1024;

function requestOrigin(req: TbRequest): string | undefined {
  const origin = req.headers.origin;
  if (origin && origin !== 'null') return origin;
  const referer = req.headers.referer;
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

// Shared by main.ts and the e2e tests so both run the identical HTTP configuration.
export function configureApp(app: NestFastifyApplication): void {
  const cfg = app.get<AuthConfig>(AUTH_CONFIG);
  const audit = app.get(AuditService);
  const reject = (reply: { code: (n: number) => { send: (b: unknown) => unknown } }, status: number, error: string, message: string) =>
    reply.code(status).send({ statusCode: status, error, message });

  app.getHttpAdapter().getInstance().addHook('onRequest', async (request, reply) => {
    const req = request as TbRequest;
    const forwarded = req.headers['x-forwarded-for'];
    req.clientIp = resolveClientIp(req.raw.socket.remoteAddress ?? 'unknown', Array.isArray(forwarded) ? forwarded.join(',') : forwarded, cfg.trustedProxies);
    if (req.url.startsWith('/api/')) {
      reply.header('cache-control', 'no-store, no-cache, must-revalidate, private');
      reply.header('pragma', 'no-cache');
      reply.header('expires', '0');
    }

    // JSON-only bodies: blocks cross-site "simple" form posts that skip CORS preflight.
    const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
    if (hasBody && !String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      return reject(reply, 415, 'Unsupported Media Type', 'Request body must be application/json');
    }
    if (!UNSAFE_METHODS.has(req.method)) return;
    const origin = requestOrigin(req);
    if (req.headers['sec-fetch-site'] === 'cross-site' || !origin || !cfg.corsOrigins.includes(origin)) {
      await audit.record('security.origin_rejected', { ip: req.clientIp, meta: { path: req.url.split('?')[0].slice(0, 120), hasOrigin: !!origin } });
      return reject(reply, 403, 'Forbidden', 'Request origin is not allowed.');
    }
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableCors({ origin: cfg.corsOrigins, credentials: true, allowedHeaders: ['content-type', 'x-csrf-token'] });
  app.enableShutdownHooks();
}
