import { BlockList, isIP } from 'node:net';

export type DeploymentEnv = 'local' | 'ci' | 'preview' | 'shared-synthetic' | 'staging' | 'production';
const DEPLOYMENT_ENVS: DeploymentEnv[] = ['local', 'ci', 'preview', 'shared-synthetic', 'staging', 'production'];

export interface ApiEnv {
  PORT: number;
  HOST: string;
  CORS_ORIGINS: string[];
}

export interface AuthConfig {
  deploymentEnv: DeploymentEnv;
  secret: string;
  cookieSecure: boolean;
  sessionCookie: string;
  preCookie: string;
  trustedProxies: BlockList;
  corsOrigins: string[];
  devMailbox: boolean;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

type Source = Record<string, string | undefined>;

function required(src: Source, name: string): string {
  const value = src[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function bool(src: Source, name: string): boolean {
  const v = required(src, name);
  if (v !== 'true' && v !== 'false') throw new Error(`${name} must be "true" or "false"`);
  return v === 'true';
}

export function parseOrigins(raw: string): string[] {
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function parseTrustedProxies(raw: string): BlockList {
  const list = new BlockList();
  for (const entry of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [addr, bits] = entry.split('/');
    const family = isIP(addr);
    const prefix = Number(bits);
    if (!family || bits === undefined || !Number.isInteger(prefix) || prefix < 0 || prefix > (family === 4 ? 32 : 128)) {
      throw new Error(`TRUSTED_PROXY_CIDRS entry "${entry}" is not a valid CIDR`);
    }
    list.addSubnet(addr, prefix, family === 4 ? 'ipv4' : 'ipv6');
  }
  return list;
}

export function loadEnv(src: Source = process.env): ApiEnv {
  required(src, 'DATABASE_URL');
  return {
    PORT: Number(required(src, 'PORT')),
    HOST: required(src, 'HOST'),
    CORS_ORIGINS: parseOrigins(required(src, 'CORS_ORIGINS')),
  };
}

export function loadAuthConfig(src: Source = process.env): AuthConfig {
  const deploymentEnv = required(src, 'DEPLOYMENT_ENV') as DeploymentEnv;
  if (!DEPLOYMENT_ENVS.includes(deploymentEnv)) throw new Error(`DEPLOYMENT_ENV must be one of ${DEPLOYMENT_ENVS.join(', ')}`);
  const secret = required(src, 'AUTH_SECRET');
  if (Buffer.byteLength(secret) < 32) throw new Error('AUTH_SECRET must be at least 32 bytes');
  const cookieSecure = bool(src, 'COOKIE_SECURE');
  if (!cookieSecure && deploymentEnv !== 'local' && deploymentEnv !== 'ci') {
    throw new Error('COOKIE_SECURE=false is only allowed when DEPLOYMENT_ENV is local or ci');
  }
  if (src.TRUSTED_PROXY_CIDRS === undefined) throw new Error('Missing required environment variable TRUSTED_PROXY_CIDRS (empty = trust none)');
  const prefix = cookieSecure ? '__Host-' : '';
  return {
    deploymentEnv,
    secret,
    cookieSecure,
    sessionCookie: `${prefix}tb_session`,
    preCookie: `${prefix}tb_pre`,
    trustedProxies: parseTrustedProxies(src.TRUSTED_PROXY_CIDRS),
    corsOrigins: parseOrigins(required(src, 'CORS_ORIGINS')),
    devMailbox: bool(src, 'DEV_MAILBOX_ENABLED'),
  };
}
