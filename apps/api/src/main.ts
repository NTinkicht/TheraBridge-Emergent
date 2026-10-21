import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { loadAuthConfig, loadEnv } from './config/env';

async function main(): Promise<void> {
  const env = loadEnv();
  loadAuthConfig();
  // Client IPs are resolved by resolveClientIp() using TRUSTED_PROXY_CIDRS, never by Fastify's trustProxy.
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: false }), {
    logger: ['log', 'warn', 'error'],
  });
  configureApp(app);
  await app.listen(env.PORT, env.HOST);
}

void main();
