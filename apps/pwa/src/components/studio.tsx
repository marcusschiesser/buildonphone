'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ChatMessage, SuApp } from '@/types';
import { localStorageAdapter } from '@/lib/storage/db';
import { getAnthropicKey } from '@/lib/security/byok';
import { getStudioThreadMessages } from '@/lib/ui/studioThread';
import { runBrowserAgent } from '@/lib/agent/browserAgent';
import { PreviewFrame } from './preview';
import { StudioMessage } from './studio-message';

function extractName(prompt: string): string {
  const lower = prompt.toLowerCase();
  const patterns = [/(?:make|create|build)\s+(?:a|an|me\s+a)?\s*(.+?)(?:\s+with|\s+that|\s+app|$)/i];
  for (const p of patterns) {
    const match = lower.match(p);
    if (match?.[1]) {
      const name = match[1].trim().replace(/\s+app$/i, '');
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return prompt.slice(0, 30);
}

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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [streamedText, setStreamedText] = useState('');
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [appCreated, setAppCreated] = useState(Boolean(initialApp));

  useEffect(() => {
    if (!appId || version < 1) return;
    void localStorageAdapter.listArtifacts(appId, version).then(setFiles);
  }, [appId, version]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    let toolCalls = 0;

    setBusy(true);
    setStatus('Queuing prompt');
    setStreamedText('');
    setInput('');

    const userMsg = await localStorageAdapter.appendMessage(appId, {
      appId,
      role: 'user',
      content: text,
    });
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      setBusy(false);
      setStatus('Missing Anthropic key');
      return;
    }

    try {
      const nextVersion = version + 1;
      setStatus('Preparing generation');
      const baseFiles = version > 0 ? await localStorageAdapter.listArtifacts(appId, version) : {};

      const payload = await runBrowserAgent({
        apiKey,
        theme: initialApp?.theme ?? '',
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        baseFiles,
        onText: (delta) => {
          setStreamedText((prev) => prev + delta);
          setStatus('Streaming response');
        },
        onToolCall: (target) => {
          toolCalls += 1;
          setStatus(`Running tool #${toolCalls}: ${target} (updating app files)`);
        },
        onStatus: setStatus,
      });

      for (const [filename, content] of Object.entries(payload.artifacts)) {
        await localStorageAdapter.writeArtifact(appId, nextVersion, filename, content);
      }

      if (!appCreated) {
        await localStorageAdapter.createApp(
          {
            name: extractName(nextMessages[0]?.content || text),
            description: nextMessages[0]?.content || '',
            icon: '',
            theme: '',
            currentVersion: nextVersion,
          },
          appId
        );
        setAppCreated(true);
      } else {
        await localStorageAdapter.updateApp(appId, { currentVersion: nextVersion });
      }

      const aiMsg = await localStorageAdapter.appendMessage(appId, {
        appId,
        role: 'assistant',
        content: payload.text || streamedText || 'Generated files.',
        version: nextVersion,
      });

      setMessages((prev) => [...prev, aiMsg]);
      setVersion(nextVersion);
      setFiles(payload.artifacts);
      setActiveTab('preview');
      setStatus('Done');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Error: ${message}`);
      const aiMsg = await localStorageAdapter.appendMessage(appId, {
        appId,
        role: 'assistant',
        content: `Error: ${message}`,
      });
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setBusy(false);
      setStreamedText('');
    }
  };

  const versionLabel = useMemo(() => (version > 0 ? `v${version}` : 'No build yet'), [version]);
  const threadMessages = useMemo(() => getStudioThreadMessages(messages, busy, status, streamedText), [busy, messages, status, streamedText]);

  return (
    <div className="mx-auto flex h-screen max-w-7xl flex-col p-4 lg:p-6">
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
          className={`rounded-xl py-2 text-sm ${activeTab === 'chat' ? 'bg-accent text-black' : 'text-zinc-300'}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`rounded-xl py-2 text-sm ${activeTab === 'preview' ? 'bg-accent text-black' : 'text-zinc-300'}`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className={`${activeTab === 'chat' ? 'flex' : 'hidden'} min-h-0 flex-col rounded-3xl border border-cyan-300/20 bg-panel/75 p-3 lg:flex`}>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-100">Prompt Thread</div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-zinc-800 bg-black/25 p-3">
            {threadMessages.length === 0 ? <p className="text-sm text-zinc-400">Describe the app you want to build.</p> : null}
            {threadMessages.map((m) => (
              <StudioMessage key={m.id} message={m} />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[94px] w-full resize-none rounded-2xl border border-zinc-700 bg-black/35 p-3 text-sm outline-none focus:border-cyan-300"
              placeholder="Build me a habit tracker with calendar heatmap and streak logic..."
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="rounded-2xl bg-accent px-4 py-3 font-semibold text-black disabled:opacity-40"
            >
              {busy ? '...' : 'Send'}
            </button>
          </div>
        </section>

        <section className={`${activeTab === 'preview' ? 'flex' : 'hidden'} min-h-0 flex-col rounded-3xl border border-cyan-300/20 bg-panel-2/50 p-3 lg:flex`}>
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-100">Live Preview</div>
          <div className="min-h-0 flex-1">
            <PreviewFrame files={files} />
          </div>
        </section>
      </div>
    </div>
  );
}
