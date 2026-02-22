'use client';

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

export function canUseNotifications(): boolean {
  return hasWindow() && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!canUseNotifications()) return false;

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

export function notifyGenerationComplete(input: { appName: string; ok: boolean; error?: string }) {
  if (!canUseNotifications()) return;
  if (Notification.permission !== 'granted') return;
  if (typeof document !== 'undefined' && !document.hidden) return;

  const title = input.ok ? 'Your app is ready!' : 'Generation failed';
  const body = input.ok
    ? `${input.appName} finished generating.`
    : `${input.appName}: ${input.error ?? 'Please open Studio to review the error.'}`;

  try {
    // Best-effort mobile notification, no click action required.
    new Notification(title, { body });
  } catch {
    // no-op
  }
}
