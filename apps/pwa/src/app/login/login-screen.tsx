'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { getServerConfig } from '@/lib/server-config';
import { markIdentityPromptPendingAfterLogin } from '@/lib/analytics/identity';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';

export default function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const config = await getServerConfig();
      if (!config.requiresPassword) {
        router.replace('/');
      }
    })();
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      markIdentityPromptPendingAfterLogin();
      captureAnalyticsEvent('login_success');
      const from = searchParams.get('from') || '/';
      router.replace(from);
    } else {
      captureAnalyticsEvent('login_failed');
      setError('Invalid password');
      setLoading(false);
    }
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Access Required</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="page-shell page-shell--narrow ion-padding">
          <IonCard>
            <IonCardContent>
              <IonNote className="ion-display-block ion-margin-bottom">buildonphone</IonNote>
              <IonNote className="ion-display-block ion-margin-bottom">
                Browsing the app is open. This password only unlocks AI generation features.
              </IonNote>
              <IonNote className="ion-display-block ion-margin-bottom">
                To get the password, send a message to{' '}
                <a href="https://www.linkedin.com/in/marcusschiesser/" target="_blank" rel="noreferrer">
                  Marcus Schiesser on LinkedIn
                </a>
                .
              </IonNote>
              <form onSubmit={handleSubmit}>
                <IonItem lines="inset">
                  <IonLabel position="stacked">Password</IonLabel>
                  <IonInput
                    type="password"
                    value={password}
                    onIonInput={(e) => setPassword(e.detail.value ?? '')}
                    autocomplete="current-password"
                    autofocus
                    required
                  />
                </IonItem>

                {error ? (
                  <IonText color="danger" className="ion-display-block ion-margin-top">
                    {error}
                  </IonText>
                ) : null}

                <IonButton type="submit" expand="block" disabled={loading} className="ion-margin-top">
                  {loading ? 'Verifying…' : 'Sign In'}
                </IonButton>
              </form>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
}
