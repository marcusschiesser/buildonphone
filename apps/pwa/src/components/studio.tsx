'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsClient } from '@/lib/ui/useIsClient';
import {
  IonBackButton,
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTextarea,
  IonToolbar,
} from '@ionic/react';
import type { ChatMessage, SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { clearGeneration, consumeGenerationResult, getGeneration, useGeneration } from '@/lib/generation/generationStore';
import { requestNotificationPermission } from '@/lib/generation/notify';
import { resumeGenerationIfNeeded } from '@/lib/generation/resumeGeneration';
import { startGeneration } from '@/lib/generation/startGeneration';
import { isAuthRequiredError, useAiAccessGate } from '@/lib/ui/aiAccess';
import { buildFixPrompt, type PreviewFixPayload } from '@/lib/ui/previewRuntimeError';
import { getStudioThreadMessages } from '@/lib/ui/studioThread';
import { PreviewFrame } from './preview';
import { StudioMessage } from './studio-message';
import { AppToolbar } from './navigation/app-toolbar';
import { MobileTabs } from './navigation/mobile-tabs';
import styles from './studio.module.css';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';

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
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [appCreated, setAppCreated] = useState(Boolean(initialApp));
  const notificationPermissionRequestedRef = useRef(false);
  const { ensureAiAccess, modal } = useAiAccessGate();
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

  const runGeneration = useCallback(
    async (params: Parameters<typeof startGeneration>[0], options?: { allowRetry?: boolean }) => {
      try {
        await startGeneration(params);
      } catch (error) {
        if (!options?.allowRetry || !isAuthRequiredError(error)) {
          throw error;
        }

        const access = await ensureAiAccess({ purpose: 'generation', forcePassword: true });
        if (!access.ok) return;
        await startGeneration(params);
      }
    },
    [ensureAiAccess]
  );

  const send = () => {
    const text = input.trim();
    if (!text || busy || gen?.result) return;

    if (!notificationPermissionRequestedRef.current) {
      notificationPermissionRequestedRef.current = true;
      void requestNotificationPermission();
    }

    void (async () => {
      const access = await ensureAiAccess({ purpose: 'generation' });
      if (!access.ok) return;

      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        appId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);
      setInput('');

      try {
        await runGeneration(
          {
            appId,
            text,
            source: 'chat_send',
            messages,
            version,
            files,
            theme: initialApp?.theme ?? '',
            appCreated,
            appNameHint: initialApp?.name,
          },
          { allowRetry: true }
        );
      } catch {
        // startGeneration persists non-auth failures into generation state.
      }
    })();
  };

  const onPreviewFix = (payload: PreviewFixPayload) => {
    if (busy || gen?.result) return;
    const fixPrompt = buildFixPrompt(payload);
    captureAnalyticsEvent('preview_fix_requested', {
      appId,
      errorMessage: payload.errorMessage,
      hasStack: Boolean(payload.stack?.trim()),
    });
    if (!notificationPermissionRequestedRef.current) {
      notificationPermissionRequestedRef.current = true;
      void requestNotificationPermission();
    }
    void (async () => {
      const access = await ensureAiAccess({ purpose: 'generation' });
      if (!access.ok) return;

      try {
        await runGeneration(
          {
            appId,
            text: fixPrompt,
            source: 'preview_fix',
            messages,
            version,
            files,
            theme: initialApp?.theme ?? '',
            appCreated,
            appNameHint: initialApp?.name,
          },
          { allowRetry: true }
        );
      } catch {
        // startGeneration persists non-auth failures into generation state.
      }
    })();
  };

  const threadMessages = useMemo(
    () => getStudioThreadMessages(messages, busy, status, streamedText, currentToolCall),
    [busy, messages, status, streamedText, currentToolCall]
  );

  const mounted = useIsClient();

  const onTabChange = (nextTab: 'chat' | 'preview') => {
    if (activeTab === nextTab) return;
    setActiveTab(nextTab);
    captureAnalyticsEvent('studio_tab_changed', {
      appId,
      tab: nextTab,
    });
  };

  if (!mounted) return null;

  return (
    <IonPage>
      <IonHeader translucent>
        <AppToolbar start={<IonBackButton defaultHref="/" text="Back" />} />
        <IonToolbar>
          <IonSegment value={activeTab} onIonChange={(event) => onTabChange((event.detail.value as 'chat' | 'preview') ?? 'chat')}>
            <IonSegmentButton value="chat">
              <IonLabel>Chat</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="preview">
              <IonLabel>Preview</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent >
          {activeTab === 'chat' ? (
              <IonList inset >
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
                          onClick={() => {
                            setInput(example);
                            captureAnalyticsEvent('example_prompt_clicked', {
                              appId,
                              example,
                            });
                          }}
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
          ) : (
              <PreviewFrame files={files} onFixError={onPreviewFix} ensureAiAccess={ensureAiAccess} />
          )}
      </IonContent>
      <IonFooter>
        {activeTab === 'chat' ? (
          <IonToolbar >
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
          </IonToolbar>
        ) : null}
        <MobileTabs active="studio" />
      </IonFooter>
      {modal}
    </IonPage>
  );
}
