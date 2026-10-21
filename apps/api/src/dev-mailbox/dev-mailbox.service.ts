import { Inject, Injectable } from '@nestjs/common';
import { AUTH_CONFIG, AuthConfig } from '../config/env';

export interface DevMail {
  to: string;
  subject: string;
  body: string;
  at: string;
}

// Local development only: holds messages in memory instead of sending email. Disabled everywhere else.
@Injectable()
export class DevMailboxService {
  private readonly messages: DevMail[] = [];

  constructor(@Inject(AUTH_CONFIG) private readonly cfg: AuthConfig) {}

  get enabled(): boolean {
    return this.cfg.deploymentEnv === 'local' && this.cfg.devMailbox;
  }

  send(mail: Omit<DevMail, 'at'>): void {
    if (!this.enabled) return;
    this.messages.unshift({ ...mail, at: new Date().toISOString() });
    this.messages.splice(50);
  }

  list(): DevMail[] {
    return [...this.messages];
  }
}
