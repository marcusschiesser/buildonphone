'use client';

import { IonButton, IonButtons, IonFooter, IonIcon, IonLabel, IonToolbar } from '@ionic/react';
import { addCircleOutline, gridOutline } from 'ionicons/icons';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export function MobileTabs({ active, topContent }: { active: 'home' | 'studio'; topContent?: ReactNode }) {
  const router = useRouter();

  return (
    <IonFooter className="mobile-tabs-shell">
      {topContent ? <IonToolbar className="mobile-tabs-extra">{topContent}</IonToolbar> : null}
      <IonToolbar>
        <IonButtons style={{ display: 'grid', width: '100%', gridTemplateColumns: '1fr 1fr' }}>
          <IonButton
            fill="clear"
            color={active === 'home' ? 'primary' : 'medium'}
            onClick={() => router.push('/')}
            aria-label="Apps"
          >
            <IonIcon icon={gridOutline} slot="start" />
            <IonLabel>Apps</IonLabel>
          </IonButton>
          <IonButton
            fill="clear"
            color={active === 'studio' ? 'primary' : 'medium'}
            onClick={() => router.push('/create')}
            aria-label="Create app"
          >
            <IonIcon icon={addCircleOutline} slot="start" />
            <IonLabel>Create app</IonLabel>
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonFooter>
  );
}
