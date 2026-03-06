'use client';

import { IonButton, IonIcon } from '@ionic/react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { logOutOutline } from 'ionicons/icons';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';

export function SignOutButton() {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();

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
