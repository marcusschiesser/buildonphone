'use client';

import { IonButton, IonIcon } from '@ionic/react';
import { logOutOutline } from 'ionicons/icons';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';
import { useAppAuth, useAppClerk } from '@/lib/auth/client';

export function SignOutButton() {
  const { isSignedIn } = useAppAuth();
  const clerk = useAppClerk();

  if (!isSignedIn) return null;

  return (
    <IonButton
      fill="outline"
      color="medium"
      onClick={() => {
        captureAnalyticsEvent('sign_out_clicked');
        void clerk.signOut({ redirectUrl: '/' });
      }}
    >
      <IonIcon icon={logOutOutline} aria-hidden="true" />
      <span style={{ marginInlineStart: 8 }}>Sign out</span>
    </IonButton>
  );
}
