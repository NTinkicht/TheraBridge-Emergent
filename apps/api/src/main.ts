import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { loadEnv } from './config/env';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true }), {
    logger: ['log', 'warn', 'error'],
  });
  configureApp(app, env.CORS_ORIGINS);
  await app.listen(env.PORT, env.HOST);
}

void main();
