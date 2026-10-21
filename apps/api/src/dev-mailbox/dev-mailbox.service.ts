import { Inject, Injectable } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { AUTH_CONFIG, AuthConfig } from '../config/env';

export interface DevMail {
  to: string;
  subject: string;
  body: string;
  at: string;
}

// Restricted delivery for synthetic environments: an in-memory mailbox (local only, loopback HTTP) and/or
// a server-side outbox directory (owner-only file permissions, never served over HTTP). No real email is sent.
@Injectable()
export class DevMailboxService {
  private readonly messages: DevMail[] = [];

  constructor(@Inject(AUTH_CONFIG) private readonly cfg: AuthConfig) {}

  get enabled(): boolean {
    return this.cfg.deploymentEnv === 'local' && this.cfg.devMailbox;
  }

  send(mail: Omit<DevMail, 'at'>): void {
    const entry = { ...mail, at: new Date().toISOString() };
    if (this.cfg.outboxDir) {
      mkdirSync(this.cfg.outboxDir, { recursive: true, mode: 0o700 });
      writeFileSync(join(this.cfg.outboxDir, `${entry.at.replace(/[:.]/g, '-')}-${randomBytes(4).toString('hex')}.json`), JSON.stringify(entry, null, 2), { mode: 0o600 });
    }
    if (!this.enabled) return;
    this.messages.unshift(entry);
    this.messages.splice(50);
  }

  list(): DevMail[] {
    return [...this.messages];
  }
}
