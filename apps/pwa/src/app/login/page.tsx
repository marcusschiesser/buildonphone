'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getServerConfig } from '@/lib/server-config';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const config = await getServerConfig();
      if (!config.requiresPassword) {
        router.replace('/');
      }
    })();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const from = searchParams.get('from') || '/';
      router.replace(from);
    } else {
      setError('Invalid password');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink p-5">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-panel/70 p-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Claw2go</p>
          <h1 className="mt-1 text-xl font-bold text-white">Access Required</h1>
        </div>

        <div className="scanline relative overflow-hidden rounded-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-400" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-white outline-none focus:border-cyan-400"
                autoFocus
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-accent px-4 py-2 font-semibold text-black disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
