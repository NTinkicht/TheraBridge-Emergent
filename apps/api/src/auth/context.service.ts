import { Injectable } from '@nestjs/common';
import type { AuthState } from './access';

// Checkpoint A placeholder: tenancy and roles arrive in checkpoint B.
@Injectable()
export class ContextService {
  async autoSelect(_token: string): Promise<void> {}

  async describe(_auth: AuthState): Promise<Record<string, unknown>> {
    return { contexts: [], activeContext: null, permissions: [] };
  }
}
