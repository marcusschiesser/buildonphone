'use client';

import { useEffect, useState } from 'react';
import { clearAnthropicKey, hasAnthropicKey, setAnthropicKey } from '@/lib/security/byok';
import { getServerConfig } from '@/lib/server-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ByokPanel() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [serverManaged, setServerManaged] = useState(false);

  useEffect(() => {
    void Promise.all([
      getServerConfig(),
      hasAnthropicKey(),
    ]).then(([{ hasServerKey }, present]) => {
      setServerManaged(hasServerKey);
      setHasKey(present);
      if (present) setStatus('Key saved in this browser.');
    });
  }, []);

  if (serverManaged) return null;

  return (
    <div className="rounded-2xl nm-raised bg-ink p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">Anthropic BYOK</div>
      <p className="mb-3 text-xs text-[--text-2]">Your key is encrypted in browser storage and never persisted server-side.</p>
      <div className="flex gap-2">
        <Input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hasKey ? '•••••••••••••••• (saved)' : 'sk-ant-...'}
        />
        <Button
          onClick={async () => {
            if (!value.trim()) return;
            await setAnthropicKey(value.trim());
            setValue('');
            setHasKey(true);
            setStatus('Saved');
          }}
          size="sm"
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await clearAnthropicKey();
            setHasKey(false);
            setStatus('Removed');
          }}
        >
          Forget
        </Button>
      </div>
      {status ? <div className="mt-2 text-xs text-accent">{status}</div> : null}
    </div>
  );
}
