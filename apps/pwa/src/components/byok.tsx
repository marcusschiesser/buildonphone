'use client';

import { useEffect, useState } from 'react';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonInput, IonItem, IonText } from '@ionic/react';
import { clearAnthropicKey, hasAnthropicKey, setAnthropicKey } from '@/lib/security/byok';
import { getServerConfig } from '@/lib/server-config';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';

export function ByokPanel() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [serverManaged, setServerManaged] = useState<boolean | null>(null);

  useEffect(() => {
    void Promise.all([getServerConfig(), hasAnthropicKey()]).then(([{ hasServerKey }, present]) => {
      setServerManaged(hasServerKey);
      setHasKey(present);
      if (present) setStatus('Key saved in this browser.');
    });
  }, []);

  if (serverManaged === null || serverManaged) return null;

  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>Anthropic BYOK</IonCardTitle>
        <IonCardSubtitle>
          Your key is encrypted in browser storage and never persisted server-side.
        </IonCardSubtitle>
      </IonCardHeader>
      <IonCardContent>
        <IonItem lines="inset">
          <IonInput
            type="password"
            value={value}
            onIonInput={(e) => setValue(e.detail.value ?? '')}
            placeholder={hasKey ? '•••••••••••••••• (saved)' : 'sk-ant-...'}
          />
        </IonItem>

        <div className="ion-margin-top">
          <IonButton
            color="primary"
            className="ion-margin-end"
            onClick={async () => {
              if (!value.trim()) return;
              await setAnthropicKey(value.trim());
              setValue('');
              setHasKey(true);
              setStatus('Saved');
              captureAnalyticsEvent('byok_saved');
            }}
          >
            Save
          </IonButton>
          <IonButton
            fill="outline"
            color="medium"
            onClick={async () => {
              await clearAnthropicKey();
              setHasKey(false);
              setStatus('Removed');
              captureAnalyticsEvent('byok_removed');
            }}
          >
            Forget
          </IonButton>
        </div>

        {status ? (
          <IonText color="medium" className="ion-display-block ion-margin-top">
            {status}
          </IonText>
        ) : null}
      </IonCardContent>
    </IonCard>
  );
}
