'use client';

import { useCallback, useEffect, useState } from 'react';
import { useIsClient } from '@/lib/ui/useIsClient';
import { useParams } from 'next/navigation';
import { IonContent, IonPage } from '@ionic/react';
import { localStorageAdapter } from '@/lib/storage/db';
import { useAiAccessGate } from '@/lib/ui/aiAccess';
import { PreviewFrame } from '@/components/preview';
import { RunBackOverlay } from '@/components/run-back-overlay';
import styles from './page.module.css';

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { ensureAiAccess, modal } = useAiAccessGate();
  const [files, setFiles] = useState<Record<string, string>>({
    'app.jsx': '',
  });

  const refreshFiles = useCallback(async () => {
    if (!id) return;
    try {
      const app = await localStorageAdapter.getApp(id);
      if (!app) {
        setFiles({
          'app.jsx': '',
        });
        return;
      }
      const nextFiles = await localStorageAdapter.listArtifacts(id, app.currentVersion);
      setFiles(nextFiles);
    } catch {
      // Ignore transient read errors and keep the last known preview files.
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const initialLoad = window.setTimeout(() => {
      void refreshFiles();
    }, 0);

    const interval = window.setInterval(() => {
      void refreshFiles();
    }, 1500);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshFiles();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [id, refreshFiles]);

  const mounted = useIsClient();

  if (!mounted) return null;

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className={styles.fillVh}>
          <PreviewFrame files={files} className="preview-frame--full" ensureAiAccess={ensureAiAccess} />
          <RunBackOverlay />
        </div>
      </IonContent>
      {modal}
    </IonPage>
  );
}
