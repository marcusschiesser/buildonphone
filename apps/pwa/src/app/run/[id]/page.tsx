'use client';

import { useEffect, useState } from 'react';
import { useIsClient } from '@/lib/ui/useIsClient';
import { useParams } from 'next/navigation';
import { IonContent, IonPage } from '@ionic/react';
import { localStorageAdapter } from '@/lib/storage/db';
import { PreviewFrame } from '@/components/preview';
import { RunBackOverlay } from '@/components/run-back-overlay';
import styles from './page.module.css';

export default function RunPage() {
  const { id } = useParams<{ id: string }>();  const [files, setFiles] = useState<Record<string, string>>({
    'app.jsx': '',
  });

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const app = await localStorageAdapter.getApp(id);
      if (!app) {
        setFiles({
          'app.jsx': '',
        });
        return;
      }
      const nextFiles = await localStorageAdapter.listArtifacts(id, app.currentVersion);
      setFiles(nextFiles);
    })();
  }, [id]);

  const mounted = useIsClient();

  if (!mounted) return null;

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className={styles.fillVh}>
          <PreviewFrame files={files} className="preview-frame--full" />
          <RunBackOverlay />
        </div>
      </IonContent>
    </IonPage>
  );
}
