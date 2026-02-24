import { useSyncExternalStore } from 'react';

let hydrated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!hydrated) {
    queueMicrotask(() => {
      hydrated = true;
      listeners.forEach((notify) => notify());
    });
  }

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return hydrated;
}

function getServerSnapshot() {
  return false;
}

export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
