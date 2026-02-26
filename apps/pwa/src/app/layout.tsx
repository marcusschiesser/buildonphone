import type { Metadata, Viewport } from 'next';
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.class.css';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { IonicRoot } from '@/components/ionic-root';
import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { PageTracker } from '@/components/analytics/page-tracker';
import { IdentityPrompt } from '@/components/analytics/identity-prompt';

export const metadata: Metadata = {
  title: 'buildonphone.com',
  description: 'Built for the Thumb-First Developer. Powered by edge-pi.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'buildonphone.com',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192-v2.png" />
      </head>
      <body>
        <IonicRoot>{children}</IonicRoot>
        <PostHogProvider />
        <PageTracker />
        <IdentityPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
