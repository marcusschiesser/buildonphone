'use client';

import type { ChatMessage } from '@/types';
import { getAnthropicKey } from '@/lib/security/byok';
import { getServerConfig } from '@/lib/server-config';
import { localStorageAdapter } from '@/lib/storage/db';
import { AuthRequiredError } from '@/lib/ui/aiAccess';
import { getGeneration, hydrateGeneration, patchGeneration, setGenerationResult, startGenerationState } from './generationStore';
import { notifyGenerationComplete } from './notify';
import { clearPersistedJob, getPersistedJob, persistActiveJob, toPersistedJob } from './persistJob';
import { pollGenerationJob, StaleJobError } from './pollJob';
import type { GenerationJobRecord, GenerationJobRequest } from './serverTypes';
import { captureAnalyticsEvent, maybeCaptureFirstGenerationSuccess } from '@/lib/analytics/telemetry';

const activeStartPolls = new Set<string>();

export function hasActiveStartPoll(appId: string): boolean {
  return activeStartPolls.has(appId);
}

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

function syncGenerationFromJob(appId: string, job: GenerationJobRecord) {
  patchGeneration(appId, {
    id: job.id,
    phase: job.status,
    statusText: job.statusText,
    streamedText: job.streamedText,
    toolCallCount: job.toolCallCount,
    currentToolCall: job.currentToolCall,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}

async function appendAssistantMessageOnce(
  appId: string,
  params: {
    content: string;
    version?: number;
  }
) {
  const history = await localStorageAdapter.getChatHistory(appId);
  const existing = history.find(
    (message) =>
      message.role === 'assistant' &&
      message.content === params.content &&
      message.version === params.version
  );

  if (existing) return existing;

  return localStorageAdapter.appendMessage(appId, {
    appId,
    role: 'assistant',
    content: params.content,
    ...(params.version !== undefined ? { version: params.version } : {}),
  });
}

export async function applyCompletedJob(
  appId: string,
  terminalJob: GenerationJobRecord,
  nextVersion: number,
  appName: string,
  startedAt?: number
): Promise<void> {
  const durationMs = startedAt ? Math.max(0, Date.now() - startedAt) : undefined;
  await persistActiveJob(toPersistedJob(terminalJob, {
    appId,
    nextVersion,
    appName,
    applyState: 'applying',
  }));
  hydrateGeneration(toPersistedJob(terminalJob, {
    appId,
    nextVersion,
    appName,
    applyState: 'applying',
  }));

  if (terminalJob.status !== 'succeeded' || !terminalJob.result?.ok || !terminalJob.result.artifacts) {
    const message = terminalJob.result?.error ?? 'Generation failed';
    const assistantMessage = await appendAssistantMessageOnce(appId, {
      content: `Error: ${message}`,
    });

    await persistActiveJob(toPersistedJob(terminalJob, {
      appId,
      nextVersion,
      appName,
      applyState: 'applied',
    }));
    setGenerationResult(appId, {
      ok: false,
      error: message,
      assistantMessage,
      jobId: terminalJob.id,
      completedAt: Date.now(),
    });
    await clearPersistedJob(appId);
    captureAnalyticsEvent('generation_completed', {
      appId,
      ok: false,
      error: message,
      jobId: terminalJob.id,
      durationMs,
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

  const assistantMessage = await appendAssistantMessageOnce(appId, {
    content: terminalJob.result.text || 'Generated app.jsx.',
    version: nextVersion,
  });

  await persistActiveJob(toPersistedJob(terminalJob, {
    appId,
    nextVersion,
    appName,
    applyState: 'applied',
  }));
  setGenerationResult(appId, {
    ok: true,
    newVersion: nextVersion,
    artifacts,
    assistantMessage,
    jobId: terminalJob.id,
    completedAt: Date.now(),
  });
  await clearPersistedJob(appId);
  captureAnalyticsEvent('generation_completed', {
    appId,
    ok: true,
    jobId: terminalJob.id,
    newVersion: nextVersion,
    artifactCount: Object.keys(artifacts).length,
    durationMs,
  });
  maybeCaptureFirstGenerationSuccess({
    appId,
    jobId: terminalJob.id,
  });

  notifyGenerationComplete({ appName, ok: true });
}

export async function startGeneration(params: {
  appId: string;
  text: string;
  source: 'chat_send' | 'preview_fix';
  messages: ChatMessage[];
  version: number;
  files: Record<string, string>;
  theme: string;
  appCreated: boolean;
  appNameHint?: string;
}): Promise<void> {
  const text = params.text.trim();
  if (!text) return;
  const generationStartedAt = Date.now();

  const existing = getGeneration(params.appId);
  if (existing?.busy || existing?.result) return;

  startGenerationState(params.appId);

  let appName = params.appNameHint?.trim() || 'My App';
  let jobPersisted = false;
  const nextVersion = params.version + 1;

  try {
    captureAnalyticsEvent('prompt_submitted', {
      appId: params.appId,
      source: params.source,
      promptText: text,
      promptLength: text.length,
      version: params.version,
      messageCount: params.messages.length,
    });

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
    }

    patchGeneration(params.appId, {
      phase: 'preparing',
      statusText: 'Preparing generation',
      streamedText: '',
      toolCallCount: 0,
      currentToolCall: null,
    });

    const fakeGenerationEnabled = process.env.NEXT_PUBLIC_FAKE_GENERATION === '1';
    const [{ jobTimeoutMs }, apiKey] = await Promise.all([getServerConfig(), getAnthropicKey()]);
    if (!fakeGenerationEnabled && !apiKey) {
      const message = 'Missing Anthropic key';
      const assistantMessage = await appendAssistantMessageOnce(params.appId, {
        content: `Error: ${message}`,
      });

      setGenerationResult(params.appId, {
        ok: false,
        error: message,
        assistantMessage,
        completedAt: Date.now(),
      });
      captureAnalyticsEvent('generation_completed', {
        appId: params.appId,
        ok: false,
        error: message,
        durationMs: Date.now() - generationStartedAt,
      });
      notifyGenerationComplete({ appName, ok: false, error: message });
      return;
    }

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
      if (createRes.status === 401) {
        throw new AuthRequiredError();
      }
      const bodyText = await createRes.text();
      throw new Error(`Failed to create generation job: ${bodyText || createRes.status}`);
    }

    const created = (await createRes.json()) as { jobId: string; status: GenerationJobRecord['status'] };
    patchGeneration(params.appId, {
      id: created.jobId,
      nextVersion,
      appName,
      statusText: 'Queued prompt',
      phase: created.status,
    });
    captureAnalyticsEvent('generation_job_created', {
      appId: params.appId,
      jobId: created.jobId,
      source: params.source,
      version: params.version,
    });

    try {
      await persistActiveJob({
        id: created.jobId,
        appId: params.appId,
        nextVersion,
        appName,
        status: created.status,
        statusText: 'Queued prompt',
        streamedText: '',
        toolCallCount: 0,
        currentToolCall: null,
        applyState: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      jobPersisted = true;
    } catch {
      // Best-effort persistence: keep the in-page polling path alive even if
      // IndexedDB is unavailable, matching the previous localStorage behavior.
    }
    activeStartPolls.add(params.appId);

    const terminalJob = await pollGenerationJob(created.jobId, {
      staleTimeoutMs: jobTimeoutMs,
      onProgress: (job) => {
        syncGenerationFromJob(params.appId, job);
        void persistActiveJob(toPersistedJob(job, {
          appId: params.appId,
          nextVersion,
          appName,
        })).catch(() => undefined);
      },
    });

    activeStartPolls.delete(params.appId);
    jobPersisted = false;
    await applyCompletedJob(params.appId, terminalJob, nextVersion, appName, generationStartedAt);
  } catch (error) {
    activeStartPolls.delete(params.appId);

    if (error instanceof AuthRequiredError) {
      await clearPersistedJob(params.appId);
      clearGenerationStateForRetry(params.appId);
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (jobPersisted && !(error instanceof StaleJobError)) {
      if (await getPersistedJob(params.appId)) {
        patchGeneration(params.appId, {
          busy: true,
          phase: 'running',
          statusText: 'Reconnecting to generation job...',
        });
      }
      return;
    }

    await clearPersistedJob(params.appId);
    patchGeneration(params.appId, {
      phase: 'failed',
      statusText: `Error: ${message}`,
    });

    const assistantMessage = await appendAssistantMessageOnce(params.appId, {
      content: `Error: ${message}`,
    });

    setGenerationResult(params.appId, {
      ok: false,
      error: message,
      assistantMessage,
      completedAt: Date.now(),
    });
    captureAnalyticsEvent('generation_completed', {
      appId: params.appId,
      ok: false,
      error: message,
      durationMs: Date.now() - generationStartedAt,
    });

    notifyGenerationComplete({ appName, ok: false, error: message });
  }
}

function clearGenerationStateForRetry(appId: string) {
  patchGeneration(appId, {
    busy: false,
    phase: 'idle',
    statusText: 'Idle',
    streamedText: '',
    currentToolCall: null,
    toolCallCount: 0,
    applyState: 'pending',
    result: undefined,
  });
}
