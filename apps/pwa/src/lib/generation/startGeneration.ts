'use client';

import type { ChatMessage } from '@/types';
import { getAnthropicKey } from '@/lib/security/byok';
import { getServerConfig } from '@/lib/server-config';
import { localStorageAdapter } from '@/lib/storage/db';
import { getGeneration, patchGeneration, setGenerationResult, startGenerationState } from './generationStore';
import { notifyGenerationComplete } from './notify';
import { clearPersistedJob, persistActiveJob } from './persistJob';
import { pollGenerationJob } from './pollJob';
import type { GenerationJobRecord, GenerationJobRequest } from './serverTypes';

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

/**
 * Handles a terminal generation job: saves artifacts, updates the app record,
 * appends the assistant message, and notifies the UI. Called both from the
 * original polling path and from the resume-after-return path.
 */
export async function applyCompletedJob(
  appId: string,
  terminalJob: GenerationJobRecord,
  nextVersion: number,
  appName: string
): Promise<void> {
  if (terminalJob.status !== 'succeeded' || !terminalJob.result?.ok || !terminalJob.result.artifacts) {
    const message = terminalJob.result?.error ?? 'Generation failed';
    const assistantMessage = await localStorageAdapter.appendMessage(appId, {
      appId,
      role: 'assistant',
      content: `Error: ${message}`,
    });

    setGenerationResult(appId, {
      ok: false,
      error: message,
      assistantMessage,
      jobId: terminalJob.id,
      completedAt: Date.now(),
    });
    notifyGenerationComplete({ appName, ok: false, error: message });
    return;
  }

  const artifacts = terminalJob.result.artifacts;
  for (const [filename, content] of Object.entries(artifacts)) {
    await localStorageAdapter.writeArtifact(appId, nextVersion, filename, content);
  }

  const existingApp = await localStorageAdapter.getApp(appId);
  if (existingApp) {
    const updated = await localStorageAdapter.updateApp(appId, { currentVersion: nextVersion });
    appName = updated.name || appName;
  }

  const assistantMessage = await localStorageAdapter.appendMessage(appId, {
    appId,
    role: 'assistant',
    content: terminalJob.result.text || 'Generated app.jsx.',
    version: nextVersion,
  });

  setGenerationResult(appId, {
    ok: true,
    newVersion: nextVersion,
    artifacts,
    assistantMessage,
    jobId: terminalJob.id,
    completedAt: Date.now(),
  });

  notifyGenerationComplete({ appName, ok: true });
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
      streamedText: '',
      toolCallCount: 0,
      currentToolCall: null,
    });

    const fakeGenerationEnabled = process.env.NEXT_PUBLIC_FAKE_GENERATION === '1';
    const [{ hasServerKey }, apiKey] = await Promise.all([getServerConfig(), getAnthropicKey()]);
    if (!fakeGenerationEnabled && !apiKey && !hasServerKey) {
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

    const nextVersion = params.version + 1;
    const storedBaseFiles = params.version > 0 ? await localStorageAdapter.listArtifacts(params.appId, params.version) : {};
    const baseFiles =
      params.version > 0 && Object.keys(storedBaseFiles).length === 0 && Object.keys(params.files).length > 0
        ? params.files
        : storedBaseFiles;

    const requestPayload: GenerationJobRequest = {
      appId: params.appId,
      text,
      messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
      version: params.version,
      baseFiles,
      theme: params.theme,
      appNameHint: appName,
    };

    const createRes = await fetch('/api/generation/jobs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify(requestPayload),
    });

    if (!createRes.ok) {
      const bodyText = await createRes.text();
      throw new Error(`Failed to create generation job: ${bodyText || createRes.status}`);
    }

    const created = (await createRes.json()) as { jobId: string };
    patchGeneration(params.appId, {
      jobId: created.jobId,
      status: 'Queued prompt',
      phase: 'preparing',
    });

    // Persist so the job can be resumed if the user leaves and returns.
    persistActiveJob({ jobId: created.jobId, appId: params.appId, nextVersion, appName });

    const terminalJob = await pollGenerationJob(created.jobId, {
      onProgress: (job) => {
        patchGeneration(params.appId, {
          jobId: job.id,
          phase:
            job.progress.phase === 'queued'
              ? 'preparing'
              : job.progress.phase === 'error'
                ? 'error'
                : job.progress.phase,
          status: job.progress.statusText,
          streamedText: job.progress.streamedText,
          toolCallCount: job.progress.toolCallCount,
          currentToolCall: job.progress.currentToolCall,
        });
      },
    });

    clearPersistedJob(params.appId);
    await applyCompletedJob(params.appId, terminalJob, nextVersion, appName);
  } catch (error) {
    clearPersistedJob(params.appId);
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
