'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsClient } from '@/lib/ui/useIsClient';
import {
  IonCol,
  IonContent,
  IonFooter,
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
import { resumeAllPersistedGenerations } from '@/lib/generation/resumeGeneration';
import { AppCard } from '@/components/apps/app-card';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { InstallButton } from '@/components/install-button';
import { AppToolbar } from '@/components/navigation/app-toolbar';
import { MobileTabs } from '@/components/navigation/mobile-tabs';
import { shareAppLink } from '@/lib/sharing/client';
import { getServerConfig } from '@/lib/server-config';

export default function HomePage() {
  const [apps, setApps] = useState<SuApp[]>([]);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const generationMap = useGenerationMap();
  const anyBusy = useAnyBusy();
  const wasBusyRef = useRef(false);

  useEffect(() => {
    const resumeAllPending = () => {
      void resumeAllPersistedGenerations();
    };

    let active = true;
    void (async () => {
      cleanupCompletedGenerations();
      resumeAllPending();
      try {
        const [nextApps, config] = await Promise.all([ensureDefaultAppsSeededClient(), getServerConfig()]);
        if (!active) return;
        setApps(nextApps);
        setShareEnabled(config.shareEnabled);
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

  const shareApp = useCallback(async (appId: string, appName: string) => {
    return shareAppLink(appId, appName);
  }, []);

  const hasDetachedGeneration = Array.from(generationMap.entries()).some(
    ([appId, state]) => state.busy && !apps.some((app) => app.id === appId)
  );

  const mounted = useIsClient();

  if (!mounted) return null;

  return (
      <IonPage>
      <IonHeader translucent>
        <AppToolbar
          end={
            <>
              <InstallButton />
              <SignOutButton />
            </>
          }
        />
      </IonHeader>

      <IonContent>
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
                      onShare={shareApp}
                      generating={generationMap.get(app.id)?.busy ?? false}
                      shareEnabled={shareEnabled}
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
      <IonFooter>
        <MobileTabs active="home" />
      </IonFooter>
    </IonPage>
  );
}
