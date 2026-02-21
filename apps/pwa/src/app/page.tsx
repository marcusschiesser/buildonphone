'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { ensureDefaultAppsSeededClient } from '@/lib/apps/defaultAppsSeedingClient';
import { ByokPanel } from '@/components/byok';
import { AppCard } from '@/components/apps/app-card';

export default function HomePage() {
  const [apps, setApps] = useState<SuApp[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const nextApps = await ensureDefaultAppsSeededClient();
      if (active) setApps(nextApps);
    })();

    return () => {
      active = false;
    };
  }, []);

  const renameApp = async (appId: string, nextName: string) => {
    const updated = await localStorageAdapter.updateApp(appId, { name: nextName });
    setApps((prev) => prev.map((app) => (app.id === appId ? updated : app)));
  };

  const deleteApp = async (appId: string) => {
    await localStorageAdapter.deleteApp(appId);
    setApps((prev) => prev.filter((app) => app.id !== appId));
  };

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-5 lg:p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Claw2go</p>
          <h1 className="text-3xl font-bold text-white">The Open-Source Mobile App Generator</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Built for the Thumb-First Developer. Powered by{' '}
            <a
              href="https://github.com/marcusschiesser/edge-pi"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline"
            >
              edge-pi
            </a>
            .
          </p>
        </div>
        <Link href="/create" className="rounded-2xl bg-accent px-4 py-2 font-semibold text-black">New App</Link>
      </header>

      <div className="mb-6">
        <ByokPanel />
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {apps.length === 0 ? (
          <div className="rounded-3xl border border-zinc-700 bg-panel/70 p-6 text-zinc-300">No apps yet. Start with “New App”.</div>
        ) : (
          apps.map((app) => (
            <AppCard key={app.id} app={app} onRename={renameApp} onDelete={deleteApp} />
          ))
        )}
      </section>
    </main>
  );
}
