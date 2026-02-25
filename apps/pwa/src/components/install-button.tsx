'use client';

import { IonButton } from '@ionic/react';
import { usePwaInstall } from '@/lib/ui/usePwaInstall';

export function InstallButton() {
  const { canInstall, install } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <IonButton fill="outline" color="secondary" onClick={install}>
      Install
    </IonButton>
  );
}
