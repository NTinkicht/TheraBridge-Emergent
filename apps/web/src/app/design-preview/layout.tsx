import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PreviewProvider } from '@/components/design/PreviewContext';

export const metadata: Metadata = {
  title: 'TheraBridge · Design direction preview',
  description: 'Visual direction proposal with synthetic fixture data. Not connected to the API. Not for clinical use.',
  robots: { index: false, follow: false },
};

export default function DesignPreviewLayout({ children }: { children: ReactNode }) {
  return <PreviewProvider>{children}</PreviewProvider>;
}
