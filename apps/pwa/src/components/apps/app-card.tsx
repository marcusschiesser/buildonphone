'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SuApp } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AppCardProps {
  app: SuApp;
  onRename: (appId: string, nextName: string) => Promise<void>;
  onDelete: (appId: string) => Promise<void>;
  generating?: boolean;
}

export function AppCard({ app, onRename, onDelete, generating = false }: AppCardProps) {
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
          <Input
            id={`rename-${app.id}`}
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
            <h2 className="min-w-0 truncate text-lg font-semibold text-cyan-100">{app.name}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={app.isDefault ? 'default' : 'secondary'}>
                {app.isDefault ? 'Default' : 'My App'}
              </Badge>
              {generating ? <Badge variant="warning">Generating...</Badge> : null}
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{app.description || 'No description'}</p>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="rounded-xl border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-400" href={`/run/${app.id}`}>
          Run
        </Link>
        <Link className="rounded-xl bg-accent-2 px-3 py-2 text-sm font-semibold text-black hover:opacity-90" href={`/edit/${app.id}`}>
          Edit
        </Link>
        {isRenaming ? (
          <>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void saveRename()}>
              Save
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={cancelRename}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsRenaming(true)}>
            Rename
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          disabled={generating}
          onClick={async () => {
            await onDelete(app.id);
          }}
        >
          Delete
        </Button>
      </div>
    </article>
  );
}
