'use client';

import type { ChatMessage } from '@/types';
import { runBrowserAgent } from '@/lib/agent/browserAgent';
import { getAnthropicKey } from '@/lib/security/byok';
import { getServerConfig } from '@/lib/server-config';
import { localStorageAdapter } from '@/lib/storage/db';
import { isFakeGenerationEnabled, runFakeGeneration } from './fakeGeneration';
import { getGeneration, patchGeneration, setGenerationResult, startGenerationState } from './generationStore';
import { notifyGenerationComplete } from './notify';

function extractName(prompt: string): string {
  const lower = prompt.toLowerCase();
  const patterns = [/(?:make|create|build)\s+(?:a|an|me\s+a)?\s*(.+?)(?:\s+with|\s+that|\s+app|$)/i];
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim().replace(/\s+app$/i, '');
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return prompt.slice(0, 30) || 'My App';
}

export async function startGeneration(params: {
  appId: string;
  text: string;
  messages: ChatMessage[];
  version: number;
  files: Record<string, string>;
  theme: string;
  appCreated: boolean;
  appNameHint?: string;
}): Promise<void> {
  const text = params.text.trim();
  if (!text) return;

  const existing = getGeneration(params.appId);
  if (existing?.busy || existing?.result) return;

  startGenerationState(params.appId);

  let toolCallCount = 0;
  let streamedTextBuffer = '';
  let appName = params.appNameHint?.trim() || 'My App';

  try {
    const userMsg = await localStorageAdapter.appendMessage(params.appId, {
      appId: params.appId,
      role: 'user',
      content: text,
    });
    const nextMessages = [...params.messages, userMsg];

    let appExists = params.appCreated;
    const existingApp = await localStorageAdapter.getApp(params.appId);
    if (existingApp) {
      appExists = true;
      appName = existingApp.name || appName;
    }

    if (!appExists) {
      appName = extractName(nextMessages[0]?.content || text);
      await localStorageAdapter.createApp(
        {
          name: appName,
          description: nextMessages[0]?.content || text,
          icon: '',
          theme: params.theme,
          currentVersion: 0,
        },
        params.appId
      );
      appExists = true;
    }

    patchGeneration(params.appId, {
      phase: 'preparing',
      status: 'Preparing generation',
    });

    const nextVersion = params.version + 1;
    const onText = (delta: string) => {
      streamedTextBuffer += delta;
      patchGeneration(params.appId, {
        phase: 'running',
        streamedText: `${getGeneration(params.appId)?.streamedText ?? ''}${delta}`,
      });
    };
    const onToolCall = (target: string) => {
      toolCallCount += 1;
      patchGeneration(params.appId, {
        phase: 'running',
        toolCallCount,
        currentToolCall: `#${toolCallCount} ${target} (updating app files)`,
        status: `Running tool #${toolCallCount}`,
      });
    };
    const onStatus = (status: string) => {
      patchGeneration(params.appId, {
        phase: status.toLowerCase().includes('sync') ? 'syncing' : 'running',
        status,
      });
    };

    let payload: { text: string; artifacts: Record<string, string> };
    if (isFakeGenerationEnabled()) {
      payload = await runFakeGeneration({
        prompt: text,
        onStatus,
        onToolCall,
        onText,
      });
    } else {
      const [{ hasServerKey }, apiKey] = await Promise.all([getServerConfig(), getAnthropicKey()]);
      if (!apiKey && !hasServerKey) {
        const message = 'Missing Anthropic key';
        const assistantMessage = await localStorageAdapter.appendMessage(params.appId, {
          appId: params.appId,
          role: 'assistant',
          content: `Error: ${message}`,
        });

        setGenerationResult(params.appId, {
          ok: false,
          error: message,
          assistantMessage,
          completedAt: Date.now(),
        });
        notifyGenerationComplete({ appName, ok: false, error: message });
        return;
      }

      const storedBaseFiles = params.version > 0 ? await localStorageAdapter.listArtifacts(params.appId, params.version) : {};
      const baseFiles =
        params.version > 0 && Object.keys(storedBaseFiles).length === 0 && Object.keys(params.files).length > 0
          ? params.files
          : storedBaseFiles;

      payload = await runBrowserAgent({
        apiKey: apiKey ?? '',
        theme: params.theme,
        messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
        baseFiles,
        baseVersion: params.version,
        onText,
        onToolCall,
        onStatus,
      });
    }

    patchGeneration(params.appId, {
      phase: 'syncing',
      status: 'Syncing artifacts',
    });

    for (const [filename, content] of Object.entries(payload.artifacts)) {
      await localStorageAdapter.writeArtifact(params.appId, nextVersion, filename, content);
    }

    if (appExists) {
      const updated = await localStorageAdapter.updateApp(params.appId, { currentVersion: nextVersion });
      appName = updated.name || appName;
    }

    const assistantMessage = await localStorageAdapter.appendMessage(params.appId, {
      appId: params.appId,
      role: 'assistant',
      content: payload.text || streamedTextBuffer || 'Generated files.',
      version: nextVersion,
    });

    setGenerationResult(params.appId, {
      ok: true,
      newVersion: nextVersion,
      artifacts: payload.artifacts,
      assistantMessage,
      completedAt: Date.now(),
    });

    notifyGenerationComplete({ appName, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    patchGeneration(params.appId, {
      phase: 'error',
      status: `Error: ${message}`,
    });

    const assistantMessage = await localStorageAdapter.appendMessage(params.appId, {
      appId: params.appId,
      role: 'assistant',
      content: `Error: ${message}`,
    });

    setGenerationResult(params.appId, {
      ok: false,
      error: message,
      assistantMessage,
      completedAt: Date.now(),
    });

    notifyGenerationComplete({ appName, ok: false, error: message });
  }
}
