'use client';

import { setupIonicReact } from '@ionic/react';
import { createElement } from 'react';
import type { ReactNode } from 'react';

let ionicConfigured = false;

function getPlatformMode(): 'ios' | 'md' {
  if (typeof window === 'undefined') return 'md';

  const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const userAgent = navigator.userAgent || '';
  const isiOS = /iPad|iPhone|iPod/i.test(userAgent) || touchMac;

  return isiOS ? 'ios' : 'md';
}

export function IonicRoot({ children }: { children: ReactNode }) {
  if (!ionicConfigured) {
    setupIonicReact({
      mode: getPlatformMode(),
    });
    ionicConfigured = true;
  }

  return createElement('ion-app', { suppressHydrationWarning: true }, children);
}
