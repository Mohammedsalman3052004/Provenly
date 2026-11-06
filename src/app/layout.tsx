import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './globals.css';
import { APP_NAME, APP_TAGLINE, SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${APP_NAME} — project portfolio dashboard for freelancers`, template: `%s · ${APP_NAME}` },
  description: `${APP_TAGLINE} Track client work, hide the numbers you want private, and share a link you can put on your resume.`,
  applicationName: APP_NAME,
  openGraph: { type: 'website', siteName: APP_NAME },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
};
export const viewport: Viewport = { themeColor: '#040a22', width: 'device-width', initialScale: 1 };

const themeScript = `document.documentElement.classList.add('js');try{var t=localStorage.getItem('fb-theme')||'dark';if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
