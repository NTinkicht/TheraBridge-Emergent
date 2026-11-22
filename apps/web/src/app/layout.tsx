import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'TheraBridge · Coordinated care, meaningful progress',
  description: 'Synthetic-data proof of concept. Not for clinical use.',
  icons: {
    icon: [
      { url: '/brand/favicon.ico', sizes: 'any' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
  robots: { index: false, follow: false },
};

// Restore the explicit visual preference before hydration to avoid a light
// header/sidebar flash. The preference is UI-only; it grants no access.
const APP_THEME_BOOTSTRAP = `try{var t=localStorage.getItem('tb-app-theme')||localStorage.getItem('tb-family-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.appTheme=t;document.documentElement.dataset.familyTheme=t}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: APP_THEME_BOOTSTRAP }} /></head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
