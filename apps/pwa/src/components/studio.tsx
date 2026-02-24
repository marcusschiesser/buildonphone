'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useIsClient } from '@/lib/ui/useIsClient';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { ChatMessage, SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { clearGeneration, consumeGenerationResult, getGeneration, useGeneration } from '@/lib/generation/generationStore';
import { requestNotificationPermission } from '@/lib/generation/notify';
import { resumeGenerationIfNeeded } from '@/lib/generation/resumeGeneration';
import { startGeneration } from '@/lib/generation/startGeneration';
import { buildFixPrompt, type PreviewFixPayload } from '@/lib/ui/previewRuntimeError';
import { getStudioThreadMessages } from '@/lib/ui/studioThread';
import { PreviewFrame } from './preview';
import { StudioMessage } from './studio-message';
import { MobileTabs } from './navigation/mobile-tabs';
import styles from './studio.module.css';

export function Studio({
  appId,
  initialApp,
  initialMessages,
  initialVersion,
}: {
  appId: string;
  initialApp?: SuApp | null;
  initialMessages?: ChatMessage[];
  initialVersion?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [version, setVersion] = useState<number>(initialVersion ?? 0);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'chat' | 'preview' | 'code'>('chat');
  const [appCreated, setAppCreated] = useState(Boolean(initialApp));
  const notificationPermissionRequestedRef = useRef(false);
  const gen = useGeneration(appId);
  const busy = gen?.busy ?? false;
  const status = gen?.status ?? 'Idle';
  const streamedText = gen?.streamedText ?? '';
  const currentToolCall = gen?.currentToolCall ?? null;

  useEffect(() => {
    if (!appId || version < 1) return;
    void localStorageAdapter.listArtifacts(appId, version).then(setFiles);
  }, [appId, version]);

  useEffect(() => {
    void resumeGenerationIfNeeded(appId);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void resumeGenerationIfNeeded(appId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appId]);

  useEffect(() => {
    if (!gen?.result) return;
    let cancelled = false;
    const result = gen.result;

    void (async () => {
      const [history, app] = await Promise.all([localStorageAdapter.getChatHistory(appId), localStorageAdapter.getApp(appId)]);
      if (cancelled) return;

      setMessages(history);
      setAppCreated(Boolean(app));

      if (result.ok) {
        const resolvedVersion = result.newVersion ?? app?.currentVersion ?? 0;
        setVersion(resolvedVersion);
        const nextFiles = resolvedVersion > 0 ? await localStorageAdapter.listArtifacts(appId, resolvedVersion) : {};
        if (cancelled) return;
        setFiles(nextFiles);
        setActiveTab('preview');
      }

      consumeGenerationResult(appId);
      const stateAfterConsume = getGeneration(appId);
      if (stateAfterConsume && !stateAfterConsume.busy && !stateAfterConsume.result) {
        clearGeneration(appId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appId, gen?.result]);

  const send = () => {
    const text = input.trim();
    if (!text || busy || gen?.result) return;
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      appId,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setInput('');

    if (!notificationPermissionRequestedRef.current) {
      notificationPermissionRequestedRef.current = true;
      void requestNotificationPermission();
    }

    void startGeneration({
      appId,
      text,
      messages,
      version,
      files,
      theme: initialApp?.theme ?? '',
      appCreated,
      appNameHint: initialApp?.name,
    });
  };

  const onPreviewFix = (payload: PreviewFixPayload) => {
    if (busy || gen?.result) return;
    const fixPrompt = buildFixPrompt(payload);
    if (!notificationPermissionRequestedRef.current) {
      notificationPermissionRequestedRef.current = true;
      void requestNotificationPermission();
    }
    void startGeneration({
      appId,
      text: fixPrompt,
      messages,
      version,
      files,
      theme: initialApp?.theme ?? '',
      appCreated,
      appNameHint: initialApp?.name,
    });
  };

  const versionLabel = useMemo(() => (version > 0 ? `v${version}` : 'No build yet'), [version]);
  const threadMessages = useMemo(
    () => getStudioThreadMessages(messages, busy, status, streamedText, currentToolCall),
    [busy, messages, status, streamedText, currentToolCall]
  );

  const mounted = useIsClient();

  if (!mounted) return null;

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Claw2go</IonTitle>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" text="Back" />
          </IonButtons>
          <IonButtons slot="end">
            <IonNote>{versionLabel}</IonNote>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={activeTab} onIonChange={(event) => setActiveTab((event.detail.value as 'chat' | 'preview' | 'code') ?? 'chat')}>
            <IonSegmentButton value="chat">
              <IonLabel>Chat</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="preview">
              <IonLabel>Preview</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="code">
              <IonLabel>Code</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className={`page-shell ion-padding studio-shell ${styles.layout}`}>
          {activeTab === 'chat' ? (
            <div className={styles.chatPane}>
              <IonList inset className={styles.scrollFill}>
                {threadMessages.length === 0 ? (
                  <IonItem lines="inset">
                    <IonLabel>
                      <p className="ion-no-margin ion-margin-bottom">
                        Describe the app you want to build, or try one of these examples:
                      </p>
                      {[
                        'Build me a habit tracker with a calendar heatmap and streak logic',
                        'Create a Pomodoro timer with session history and stats',
                        'Make a markdown notes app with live preview and local storage',
                      ].map((example) => (
                        <IonButton
                          key={example}
                          fill="clear"
                          color="secondary"
                          onClick={() => setInput(example)}
                          className={styles.examplePromptBtn}
                        >
                          {example}
                        </IonButton>
                      ))}
                    </IonLabel>
                  </IonItem>
                ) : null}
                {threadMessages.map((m) => (
                  <StudioMessage key={m.id} message={m} />
                ))}
              </IonList>
            </div>
          ) : activeTab === 'preview' ? (
            <div className={styles.cardFlex}>
              <PreviewFrame files={files} onFixError={onPreviewFix} />
            </div>
          ) : (
            <div className={styles.cardFlex}>
              <IonItem lines="inset">
                <IonTextarea autoGrow readonly value={files['app.jsx']?.trim() || '// No app.jsx generated yet.'} />
              </IonItem>
            </div>
          )}
        </div>
      </IonContent>
      <MobileTabs
        active="studio"
        topContent={
          activeTab === 'chat' ? (
            <IonItem lines="inset">
              <IonTextarea
                value={input}
                onIonInput={(event) => setInput(event.detail.value ?? '')}
                autoGrow
                placeholder="Build me a habit tracker with calendar heatmap and streak logic..."
              />
              <IonButton onClick={send} disabled={busy || Boolean(gen?.result) || !input.trim()}>
                {busy ? 'Working...' : 'Send'}
              </IonButton>
            </IonItem>
          ) : null
        }
      />
    </IonPage>
  );
}
