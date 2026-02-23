'use client';

import { usePwaInstall } from '@/lib/ui/usePwaInstall';

export function InstallButton() {
  const { canInstall, install } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <button
      onClick={install}
      className="nm-btn-accent inline-flex items-center justify-center rounded-2xl bg-accent/15 px-4 py-2 font-semibold text-accent"
    >
      Install Claw2Go
    </button>
  );
}
