import type { Metadata } from 'next';
import { Nunito, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Nunito({ variable: '--font-sans', subsets: ['latin'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Claw2go',
  description: 'Built for the Thumb-First Developer. Powered by edge-pi.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} bg-ink text-zinc-100 antialiased`}>{children}</body>
    </html>
  );
}
