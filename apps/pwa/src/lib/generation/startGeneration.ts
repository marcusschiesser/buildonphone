'use client';

import type { ChatMessage } from '@/types';
import { getAnthropicKey } from '@/lib/security/byok';
import { getServerConfig } from '@/lib/server-config';
import { localStorageAdapter } from '@/lib/storage/db';
import { AuthRequiredError } from '@/lib/ui/aiAccess';
import { getGeneration, patchGeneration, setGenerationResult, startGenerationState } from './generationStore';
import { notifyGenerationComplete } from './notify';
import { clearPersistedJob, getPersistedJob, persistActiveJob } from './persistJob';
import { pollGenerationJob, StaleJobError } from './pollJob';
import type { GenerationJobRecord, GenerationJobRequest } from './serverTypes';
import { captureAnalyticsEvent, maybeCaptureFirstGenerationSuccess } from '@/lib/analytics/telemetry';

/**
 * Tracks appIds where startGeneration is actively polling in the current page
 * session.  resumeGenerationIfNeeded checks this to avoid launching a second
 * parallel polling loop for the same job.
 */
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

/**
 * Handles a terminal generation job: saves artifacts, updates the app record,
 * appends the assistant message, and notifies the UI. Called both from the
 * original polling path and from the resume-after-return path.
 */
export async function applyCompletedJob(
  appId: string,
  terminalJob: GenerationJobRecord,
  nextVersion: number,
  appName: string,
  startedAt?: number
): Promise<void> {
  const durationMs = startedAt ? Math.max(0, Date.now() - startedAt) : undefined;
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
  // Tracks whether we reached the polling phase (i.e. a job was created and
  // persisted).  Used in the catch block to decide whether the error is
  // recoverable via the resume mechanism or should be saved permanently.
  let jobPersisted = false;

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
    const [{ jobTimeoutMs }, apiKey] = await Promise.all([getServerConfig(), getAnthropicKey()]);
    if (!fakeGenerationEnabled && !apiKey) {
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
      captureAnalyticsEvent('generation_completed', {
        appId: params.appId,
        ok: false,
        error: message,
        durationMs: Date.now() - generationStartedAt,
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
      if (createRes.status === 401) {
        throw new AuthRequiredError();
      }
      const bodyText = await createRes.text();
      throw new Error(`Failed to create generation job: ${bodyText || createRes.status}`);
    }

    const created = (await createRes.json()) as { jobId: string };
    patchGeneration(params.appId, {
      jobId: created.jobId,
      status: 'Queued prompt',
      phase: 'preparing',
    });
    captureAnalyticsEvent('generation_job_created', {
      appId: params.appId,
      jobId: created.jobId,
      source: params.source,
      version: params.version,
    });

    // Persist so the job can be resumed if the user leaves and returns.
    persistActiveJob({ jobId: created.jobId, appId: params.appId, nextVersion, appName });
    jobPersisted = true;
    activeStartPolls.add(params.appId);

    const terminalJob = await pollGenerationJob(created.jobId, {
      staleTimeoutMs: jobTimeoutMs,
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
    activeStartPolls.delete(params.appId);
    jobPersisted = false; // persisted entry gone – failures past this point are not recoverable
    await applyCompletedJob(params.appId, terminalJob, nextVersion, appName, generationStartedAt);
  } catch (error) {
    // The in-page poll is no longer running – let resumeGenerationIfNeeded
    // take over on the next visibility change / interval tick.
    activeStartPolls.delete(params.appId);

    if (error instanceof AuthRequiredError) {
      clearPersistedJob(params.appId);
      clearGenerationStateForRetry(params.appId);
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    if (jobPersisted && !(error instanceof StaleJobError)) {
      // The error occurred during polling, after the server-side job was
      // already created.  The job may still finish successfully – keep the
      // persisted entry so resumeGenerationIfNeeded can re-attach on the next
      // page visit.  Do NOT write a permanent error message to the chat and
      // keep the UI in a resumable busy state so actions don't race artifacts.
      //
      // However, if the persisted entry is already gone it means
      // resumeGenerationIfNeeded already handled the result while we were
      // suspended – don't override its busy=false state.
      if (getPersistedJob(params.appId)) {
        patchGeneration(params.appId, {
          busy: true,
          phase: 'running',
          status: 'Reconnecting to generation job...',
        });
      }
    } else {
      // Error before job creation, or a stale/stuck job – there is nothing to
      // resume.  Record a permanent error in the chat history and clean up.
      clearPersistedJob(params.appId);
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
      captureAnalyticsEvent('generation_completed', {
        appId: params.appId,
        ok: false,
        error: message,
        durationMs: Date.now() - generationStartedAt,
      });

      notifyGenerationComplete({ appName, ok: false, error: message });
    }
  }
}

function clearGenerationStateForRetry(appId: string) {
  patchGeneration(appId, {
    busy: false,
    phase: 'idle',
    status: 'Idle',
    streamedText: '',
    currentToolCall: null,
    toolCallCount: 0,
    result: undefined,
  });
}
