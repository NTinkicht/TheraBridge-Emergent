import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthState } from './access';

// Checkpoint A placeholder: no permissions exist yet, so every permission check is denied.
@Injectable()
export class AuthorizationService {
  async enforce(_auth: AuthState, _permission: string, _params: Record<string, string>): Promise<void> {
    throw new ForbiddenException();
  }
}
