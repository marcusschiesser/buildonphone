'use client';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getServerConfig } from '@/lib/server-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function LoginForm() {
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
    <div className="relative overflow-hidden rounded-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs text-[--text-2]" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </div>

        {error && <p className="text-sm text-[--accent-danger]">{error}</p>}

        <Button type="submit" disabled={loading}>
          {loading ? 'Verifying…' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink p-5">
      <div className="w-full max-w-sm rounded-2xl nm-raised bg-ink p-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Claw2go</p>
          <h1 className="mt-1 text-xl font-bold text-zinc-100">Access Required</h1>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
