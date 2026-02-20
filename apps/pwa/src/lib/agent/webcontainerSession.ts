'use client';

import { WebContainer } from '@webcontainer/api';
import { createWebContainerRuntime } from 'edge-pi/webcontainer';

declare global {
  interface Window {
    __suWebContainerPromise?: Promise<WebContainer>;
  }
}

async function getContainer(): Promise<WebContainer> {
  if (!window.__suWebContainerPromise) {
    window.__suWebContainerPromise = WebContainer.boot();
  }
  return window.__suWebContainerPromise;
}

export async function getBrowserRuntime() {
  const container = await getContainer();
  return createWebContainerRuntime(container);
}

export async function hydrateContainer(files: Record<string, string>) {
  const runtime = await getBrowserRuntime();
  const appJsx = files['app.jsx'] ?? '';

  await runtime.fs.writeFile('app.jsx', appJsx, 'utf-8');
}

export async function readGeneratedAppJsx() {
  const runtime = await getBrowserRuntime();
  const candidates = [
    'app.jsx',
    './app.jsx',
    '/home/project/app.jsx',
  ];

  for (const candidate of candidates) {
    try {
      const content = await runtime.fs.readFile(candidate, 'utf-8');
      if (content.trim()) return content;
    } catch {
      // try next path
    }
  }

  throw new Error('Agent did not generate app.jsx.');
}
