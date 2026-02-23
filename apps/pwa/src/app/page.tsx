'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { ensureDefaultAppsSeededClient } from '@/lib/apps/defaultAppsSeedingClient';
import { cleanupCompletedGenerations, useAnyBusy, useGenerationMap } from '@/lib/generation/generationStore';
import { getAllPersistedJobs } from '@/lib/generation/persistJob';
import { resumeGenerationIfNeeded } from '@/lib/generation/resumeGeneration';
import { ByokPanel } from '@/components/byok';
import { AppCard } from '@/components/apps/app-card';
import { InstallButton } from '@/components/install-button';

export default function HomePage() {
  const [apps, setApps] = useState<SuApp[]>([]);
  const generationMap = useGenerationMap();
  const anyBusy = useAnyBusy();
  const wasBusyRef = useRef(false);

  useEffect(() => {
    const resumeAllPending = () => {
      for (const job of getAllPersistedJobs()) {
        void resumeGenerationIfNeeded(job.appId);
      }
    };

    let active = true;
    void (async () => {
      cleanupCompletedGenerations();
      resumeAllPending();
      const nextApps = await ensureDefaultAppsSeededClient();
      if (active) setApps(nextApps);
    })();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resumeAllPending();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        <div className="flex items-center gap-2">
          <InstallButton />
          <Link href="/create" className="rounded-2xl bg-accent px-4 py-2 font-semibold text-black">Create App</Link>
        </div>
      </header>

      <div className="mb-6">
        <ByokPanel />
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {apps.length === 0 ? (
          <div className="rounded-3xl border border-zinc-700 bg-panel/70 p-6 text-zinc-300">No apps yet. Start with “Create App”.</div>
        ) : (
          apps.map((app) => (
            <AppCard key={app.id} app={app} onRename={renameApp} onDelete={deleteApp} generating={generationMap.get(app.id)?.busy ?? false} />
          ))
        )}
      </section>

      {Array.from(generationMap.entries()).some(([appId, state]) => state.busy && !apps.some((app) => app.id === appId)) ? (
        <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Generation is running in the background. It will appear here when app metadata is synced.
        </div>
      ) : null}
    </main>
  );
}
