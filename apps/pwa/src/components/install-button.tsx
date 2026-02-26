'use client';

import { IonButton } from '@ionic/react';
import { usePwaInstall } from '@/lib/ui/usePwaInstall';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';

export function InstallButton() {
  const { canInstall, install } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <IonButton
      fill="outline"
      color="secondary"
      onClick={() => {
        captureAnalyticsEvent('pwa_install_clicked');
        void install();
      }}
    >
      Install
    </IonButton>
  );
}
