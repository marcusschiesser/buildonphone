'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    const enableInDev = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction && !enableInDev) return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('[SW] Registration failed:', err));
  }, []);

  return null;
}
