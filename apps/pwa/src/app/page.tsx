'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsClient } from '@/lib/ui/useIsClient';
import {
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonPage,
  IonRow,
  IonText,
} from '@ionic/react';
import type { SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { ensureDefaultAppsSeededClient } from '@/lib/apps/defaultAppsSeedingClient';
import { cleanupCompletedGenerations, useAnyBusy, useGenerationMap } from '@/lib/generation/generationStore';
import { getAllPersistedJobs } from '@/lib/generation/persistJob';
import { resumeGenerationIfNeeded } from '@/lib/generation/resumeGeneration';
import { ByokPanel } from '@/components/byok';
import { AppCard } from '@/components/apps/app-card';
import { InstallButton } from '@/components/install-button';
import { AppToolbar } from '@/components/navigation/app-toolbar';
import { MobileTabs } from '@/components/navigation/mobile-tabs';

export default function HomePage() {
  const [apps, setApps] = useState<SuApp[]>([]);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const generationMap = useGenerationMap();
  const anyBusy = useAnyBusy();
  const wasBusyRef = useRef(false);

  useEffect(() => {
    const resumeAllPending = () => {
      for (const job of getAllPersistedJobs()) {
        void resumeGenerationIfNeeded(job.appId);
      }
    };

    let active = true;
    void (async () => {
      cleanupCompletedGenerations();
      resumeAllPending();
      try {
        const nextApps = await ensureDefaultAppsSeededClient();
        if (!active) return;
        setApps(nextApps);
      } finally {
        if (active) setAppsLoaded(true);
      }
    })();

    const resumeInterval = window.setInterval(() => {
      resumeAllPending();
    }, 2000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resumeAllPending();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(resumeInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (anyBusy) {
      wasBusyRef.current = true;
      return;
    }
    if (!wasBusyRef.current) return;

    let cancelled = false;
    void (async () => {
      cleanupCompletedGenerations();
      const nextApps = await localStorageAdapter.listApps();
      if (cancelled) return;
      setApps(nextApps);
      wasBusyRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, [anyBusy]);

  const renameApp = useCallback(async (appId: string, nextName: string) => {
    const updated = await localStorageAdapter.updateApp(appId, { name: nextName });
    setApps((prev) => prev.map((app) => (app.id === appId ? updated : app)));
  }, []);

  const deleteApp = useCallback(async (appId: string) => {
    await localStorageAdapter.deleteApp(appId);
    setApps((prev) => prev.filter((app) => app.id !== appId));
  }, []);

  const hasDetachedGeneration = Array.from(generationMap.entries()).some(
    ([appId, state]) => state.busy && !apps.some((app) => app.id === appId)
  );

  const mounted = useIsClient();

  if (!mounted) return null;

  return (
    <IonPage>
      <IonHeader translucent>
        <AppToolbar end={<InstallButton />} />
      </IonHeader>

      <IonContent fullscreen>

            <ByokPanel />

          <IonGrid fixed>
            <IonRow className="ion-align-items-stretch">
              {appsLoaded && apps.length === 0 ? (
                <IonCol size="12">
                  <IonText color="medium">No apps yet. Start with &quot;Create App&quot;.</IonText>
                </IonCol>
              ) : (
                apps.map((app) => (
                  <IonCol key={app.id} size="12" sizeMd="6" sizeXl="4" className="app-card-col">
                    <AppCard
                      app={app}
                      onRename={renameApp}
                      onDelete={deleteApp}
                      generating={generationMap.get(app.id)?.busy ?? false}
                    />
                  </IonCol>
                ))
              )}
            </IonRow>
          </IonGrid>

          {hasDetachedGeneration ? (
            <IonText color="tertiary" className="ion-margin-top ion-display-block">
              Generation is running in the background. It will appear here when app metadata is synced.
            </IonText>
          ) : null}
      </IonContent>
      <MobileTabs active="home" />
    </IonPage>
  );
}
