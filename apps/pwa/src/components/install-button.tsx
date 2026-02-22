'use client';

import { usePwaInstall } from '@/lib/ui/usePwaInstall';

export function InstallButton() {
  const { canInstall, install } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <button
      onClick={install}
      className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-2 font-semibold text-accent transition-colors hover:bg-accent/20"
    >
      Install Claw2Go
    </button>
  );
}
