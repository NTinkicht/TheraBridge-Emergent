import type { Role } from '@prisma/client';

// Shared role-bearing actor shape; clinical code must not import operations.
export interface Viewer { userId: string; membershipId: string; role: Role }
