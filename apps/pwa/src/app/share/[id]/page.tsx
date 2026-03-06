'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IonButton, IonContent, IonPage, IonSpinner, IonText } from '@ionic/react';
import { useIsClient } from '@/lib/ui/useIsClient';
import { ensureImportedSharedApp, fetchSharedSnapshot } from '@/lib/sharing/client';

type ShareLoadState =
  | { status: 'loading'; message: string }
  | { status: 'error'; message: string };

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const mounted = useIsClient();
  const [state, setState] = useState<ShareLoadState>({
    status: 'loading',
    message: 'Preparing shared app...',
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    void (async () => {
      try {
        const snapshot = await fetchSharedSnapshot(id);
        if (cancelled) return;

        setState({
          status: 'loading',
          message: 'Importing your local copy...',
        });

        const appId = await ensureImportedSharedApp(id, snapshot);
        if (cancelled) return;

        router.replace(`/run/${appId}`);
      } catch (error) {
        if (cancelled) return;

        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to open shared app.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (!mounted) return null;

  return (
    <IonPage>
      <IonContent fullscreen>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'grid', gap: '16px', maxWidth: '320px' }}>
            {state.status === 'loading' ? <IonSpinner name="crescent" /> : null}
            <IonText color={state.status === 'error' ? 'danger' : 'medium'}>
              <p>{state.message}</p>
            </IonText>
            {state.status === 'error' ? (
              <IonButton onClick={() => router.replace('/')}>
                Back to Apps
              </IonButton>
            ) : null}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
