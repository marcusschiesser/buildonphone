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
      const from = searchParams.get('from') || '/';
      router.replace(from);
    } else {
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
              <IonNote className="ion-display-block ion-margin-bottom">Claw2go</IonNote>
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
