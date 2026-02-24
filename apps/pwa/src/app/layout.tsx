import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

// display:'swap' prevents Flash of Invisible Text (FOIT) while fonts load
const sans = Space_Grotesk({ variable: '--font-sans', subsets: ['latin'], display: 'swap' });
const mono = IBM_Plex_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Claw2go',
  description: 'Built for the Thumb-First Developer. Powered by edge-pi.',
  manifest: '/manifest.webmanifest',
  themeColor: '#0b0f1a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Claw2go',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fallback apple-touch-icon for iOS add-to-home-screen */}
        <link rel="apple-touch-icon" href="/next.svg" />
      </head>
      <body className={`${sans.variable} ${mono.variable} bg-ink text-zinc-100 antialiased`}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
