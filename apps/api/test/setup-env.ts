// Deterministic auth configuration for every integration test (DATABASE_URL comes from the caller).
import { randomBytes } from 'node:crypto';

Object.assign(process.env, {
  DEPLOYMENT_ENV: 'ci',
  AUTH_SECRET: randomBytes(32).toString('base64url'),
  COOKIE_SECURE: 'false',
  TRUSTED_PROXY_CIDRS: '',
  CORS_ORIGINS: 'http://localhost:3000',
  DEV_MAILBOX_ENABLED: 'false',
  DEV_OUTBOX_DIR: '',
  FAMILY_MESSAGING_DEMO: 'true',
  FAMILY_PRACTICE_DEMO: 'true',
});
