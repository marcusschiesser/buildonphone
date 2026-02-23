'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { ensureDefaultAppsSeededClient } from '@/lib/apps/defaultAppsSeedingClient';
import { cleanupCompletedGenerations, useAnyBusy, useGenerationMap } from '@/lib/generation/generationStore';
import { ByokPanel } from '@/components/byok';
import { AppCard } from '@/components/apps/app-card';
import { InstallButton } from '@/components/install-button';

export default function HomePage() {
  const [apps, setApps] = useState<SuApp[]>([]);
  const generationMap = useGenerationMap();
  const anyBusy = useAnyBusy();
  const wasBusyRef = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      cleanupCompletedGenerations();
      const nextApps = await ensureDefaultAppsSeededClient();
      if (active) setApps(nextApps);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (anyBusy) {
      wasBusyRef.current = true;
      return;
    }
    if (!wasBusyRef.current) return;

    let cancelled = false;
    void (async () => {
      cleanupCompletedGenerations();
      const nextApps = await localStorageAdapter.listApps();
      if (cancelled) return;
      setApps(nextApps);
      wasBusyRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, [anyBusy]);

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
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Claw2go</p>
          <h1 className="text-3xl font-bold text-zinc-100">The Open-Source Mobile App Generator</h1>
          <p className="mt-1 text-xs text-[--text-2]">
            Built for the Thumb-First Developer. Powered by{' '}
            <a
              href="https://github.com/marcusschiesser/edge-pi"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              edge-pi
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-3">
          <InstallButton />
          <Link href="/create" className="nm-btn-accent inline-flex items-center justify-center rounded-2xl bg-accent/15 px-4 py-2 font-semibold text-accent">Create App</Link>
        </div>
      </header>

      <div className="mb-6">
        <ByokPanel />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {apps.length === 0 ? (
          <div className="rounded-3xl nm-inset bg-ink p-6 text-[--text-2]">No apps yet. Start with "Create App".</div>
        ) : (
          apps.map((app) => (
            <AppCard key={app.id} app={app} onRename={renameApp} onDelete={deleteApp} generating={generationMap.get(app.id)?.busy ?? false} />
          ))
        )}
      </section>

      {Array.from(generationMap.entries()).some(([appId, state]) => state.busy && !apps.some((app) => app.id === appId)) ? (
        <div className="mt-4 rounded-2xl nm-flat bg-[--accent-warn]/10 p-3 text-sm text-[--accent-warn]">
          Generation is running in the background. It will appear here when app metadata is synced.
        </div>
      ) : null}
    </main>
  );
}
