import type { ReactNode } from 'react';
import { AppSessionProvider } from '@/lib/session-context';

/** The provider survives client navigation within authenticated /app routes. */
export default function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  return <AppSessionProvider>{children}</AppSessionProvider>;
}
