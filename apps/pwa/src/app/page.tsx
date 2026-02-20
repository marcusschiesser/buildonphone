'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { ByokPanel } from '@/components/byok';

export default function HomePage() {
  const [apps, setApps] = useState<SuApp[]>([]);

  useEffect(() => {
    void localStorageAdapter.listApps().then(setApps);
  }, []);

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
            <article key={app.id} className="rounded-3xl border border-cyan-200/20 bg-panel/70 p-4">
              <h2 className="text-lg font-semibold text-cyan-100">{app.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{app.description || 'No description'}</p>
              <div className="mt-4 flex gap-2">
                <Link className="rounded-xl border border-zinc-600 px-3 py-2 text-sm text-zinc-200" href={`/run/${app.id}`}>Run</Link>
                <Link className="rounded-xl bg-accent-2 px-3 py-2 text-sm font-semibold text-black" href={`/edit/${app.id}`}>Edit</Link>
                <button
                  onClick={async () => {
                    await localStorageAdapter.deleteApp(app.id);
                    setApps((prev) => prev.filter((x) => x.id !== app.id));
                  }}
                  className="rounded-xl border border-red-400/50 px-3 py-2 text-sm text-red-200"
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
