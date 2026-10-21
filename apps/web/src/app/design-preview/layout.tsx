import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PreviewProvider } from '@/components/design/PreviewContext';

export const metadata: Metadata = {
  title: 'TheraBridge · Design direction preview',
  description: 'Visual direction proposal with synthetic fixture data. Not connected to the API. Not for clinical use.',
  robots: { index: false, follow: false },
};

// Runs during HTML parsing, before first paint, so the family dark theme never flashes light.
const THEME_SCRIPT = `try{var q=new URLSearchParams(location.search).get('theme');var t=q==='dark'||q==='light'?q:localStorage.getItem('tb-family-theme');document.documentElement.dataset.familyTheme=t==='dark'?'dark':'light'}catch(e){}`;

export default function DesignPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <PreviewProvider>{children}</PreviewProvider>
    </>
  );
}
