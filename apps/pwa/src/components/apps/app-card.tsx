'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SuApp } from '@/types';

interface AppCardProps {
  app: SuApp;
  onRename: (appId: string, nextName: string) => Promise<void>;
  onDelete: (appId: string) => Promise<void>;
}

export function AppCard({ app, onRename, onDelete }: AppCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(app.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cancelRename = () => {
    setIsRenaming(false);
    setNameDraft(app.name);
    setError('');
  };

  const saveRename = async () => {
    const next = nameDraft.trim();
    if (!next) {
      setError('Name is required.');
      return;
    }
    if (next === app.name) {
      cancelRename();
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onRename(app.id, next);
      setIsRenaming(false);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Failed to rename app.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-3xl border border-cyan-200/20 bg-panel/70 p-4">
      {isRenaming ? (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-zinc-400" htmlFor={`rename-${app.id}`}>
            App name
          </label>
          <input
            id={`rename-${app.id}`}
            className="w-full rounded-xl border border-zinc-600 bg-zinc-950 px-3 py-2 text-cyan-100 outline-none focus:border-cyan-300"
            maxLength={80}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void saveRename();
              if (event.key === 'Escape') cancelRename();
            }}
          />
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-cyan-100">{app.name}</h2>
            <span
              className={
                app.isDefault
                  ? 'rounded-full border border-cyan-300/50 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200'
                  : 'rounded-full border border-zinc-500/60 bg-zinc-800/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300'
              }
            >
              {app.isDefault ? 'Default' : 'My App'}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{app.description || 'No description'}</p>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="rounded-xl border border-zinc-600 px-3 py-2 text-sm text-zinc-200" href={`/run/${app.id}`}>
          Run
        </Link>
        <Link className="rounded-xl bg-accent-2 px-3 py-2 text-sm font-semibold text-black" href={`/edit/${app.id}`}>
          Edit
        </Link>
        {isRenaming ? (
          <>
            <button
              className="rounded-xl border border-cyan-400/50 px-3 py-2 text-sm text-cyan-100 disabled:opacity-60"
              disabled={busy}
              onClick={() => void saveRename()}
            >
              Save
            </button>
            <button className="rounded-xl border border-zinc-600 px-3 py-2 text-sm text-zinc-200" disabled={busy} onClick={cancelRename}>
              Cancel
            </button>
          </>
        ) : (
          <button className="rounded-xl border border-zinc-600 px-3 py-2 text-sm text-zinc-200" onClick={() => setIsRenaming(true)}>
            Rename
          </button>
        )}
        <button
          onClick={async () => {
            await onDelete(app.id);
          }}
          className="rounded-xl border border-red-400/50 px-3 py-2 text-sm text-red-200"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
