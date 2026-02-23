'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ChatMessage, SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import {
  clearGeneration,
  consumeGenerationResult,
  getGeneration,
  useGeneration,
} from '@/lib/generation/generationStore';
import { requestNotificationPermission } from '@/lib/generation/notify';
import { startGeneration } from '@/lib/generation/startGeneration';
import { buildFixPrompt, type PreviewFixPayload } from '@/lib/ui/previewRuntimeError';
import { getStudioThreadMessages } from '@/lib/ui/studioThread';
import { PreviewFrame } from './preview';
import { StudioMessage } from './studio-message';
import { PreviewModeTabs } from './studio/preview-mode-tabs';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

const STUDIO_SHELL_CLASS = 'mx-auto flex h-dvh max-w-7xl flex-col overflow-hidden box-border p-4 lg:p-6';
const STUDIO_PANEL_CLASS = 'h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-cyan-300/20 p-3';
const STUDIO_TITLE_CLASS = 'mb-2 text-xs uppercase tracking-[0.2em] text-cyan-100';
const MOBILE_TAB_CLASS = 'rounded-xl py-2 text-sm';
const THREAD_SCROLL_CLASS = 'min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-zinc-800 bg-black/25 p-3';

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
  const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');
  const [appCreated, setAppCreated] = useState(Boolean(initialApp));
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
    const handleVisibilityChange = () => {
      if (document.hidden && busy) {
        void requestNotificationPermission();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [busy]);

  useEffect(() => {
    if (!gen?.result) return;
    let cancelled = false;
    const result = gen.result;

    void (async () => {
      const [history, app] = await Promise.all([
        localStorageAdapter.getChatHistory(appId),
        localStorageAdapter.getApp(appId),
      ]);
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

  return (
    <div className={STUDIO_SHELL_CLASS}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-cyan-300 hover:text-cyan-200">
            Back to Apps
          </Link>
          <div>
          <h1 className="text-lg font-bold tracking-[0.16em] text-cyan-200 uppercase">Claw2go Studio</h1>
          <p className="text-[11px] text-zinc-400">
            Built for the Thumb-First Developer. Powered by{' '}
            <a
              href="https://github.com/marcusschiesser/edge-pi"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline"
            >
              edge-pi
            </a>
            .
          </p>
          </div>
        </div>
        <div className="rounded-lg border border-cyan-300/20 bg-panel/60 px-3 py-1 text-xs text-cyan-100">{versionLabel}</div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-panel/60 p-1 lg:hidden">
        <button
          className={`${MOBILE_TAB_CLASS} ${activeTab === 'chat' ? 'bg-accent text-black' : 'text-zinc-300'}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`${MOBILE_TAB_CLASS} ${activeTab === 'preview' ? 'bg-accent text-black' : 'text-zinc-300'}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className={`${activeTab === 'chat' ? 'flex' : 'hidden'} ${STUDIO_PANEL_CLASS} bg-panel/75 lg:flex`}>
          <div className={STUDIO_TITLE_CLASS}>Prompt Thread</div>
          <div className={THREAD_SCROLL_CLASS}>
            {threadMessages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-zinc-400">Describe the app you want to build, or try one of these examples:</p>
                <div className="flex flex-col gap-2">
                  {[
                    'Build me a habit tracker with a calendar heatmap and streak logic',
                    'Create a Pomodoro timer with session history and stats',
                    'Make a markdown notes app with live preview and local storage',
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setInput(example)}
                      className="rounded-xl border border-zinc-700 bg-black/20 px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:border-cyan-300/50 hover:text-zinc-100"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {threadMessages.map((m) => (
              <StudioMessage key={m.id} message={m} />
            ))}
          </div>
          <div className="mt-3 flex shrink-0 gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ minHeight: '94px' }}
              placeholder="Build me a habit tracker with calendar heatmap and streak logic..."
            />
            <Button
              onClick={send}
              disabled={busy || Boolean(gen?.result) || !input.trim()}
            >
              {busy ? '...' : 'Send'}
            </Button>
          </div>
        </section>

        <section className={`${activeTab === 'preview' ? 'flex' : 'hidden'} ${STUDIO_PANEL_CLASS} bg-panel-2/50 lg:flex`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className={STUDIO_TITLE_CLASS}>Live Preview</div>
            <PreviewModeTabs mode={previewMode} onChange={setPreviewMode} />
          </div>
          <div className="min-h-0 flex-1">
            {previewMode === 'preview' ? (
              <PreviewFrame files={files} onFixError={onPreviewFix} />
            ) : (
              <pre className="h-full w-full overflow-auto rounded-2xl border border-cyan-300/20 bg-black/40 p-3 text-xs leading-relaxed text-zinc-100">
                <code>{files['app.jsx']?.trim() || '// No app.jsx generated yet.'}</code>
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
