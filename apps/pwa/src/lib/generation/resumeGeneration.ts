'use client';

import { patchGeneration, setGenerationResult, startGenerationState } from './generationStore';
import { clearPersistedJob, getPersistedJob } from './persistJob';
import { pollGenerationJob, StaleJobError } from './pollJob';
import { applyCompletedJob, hasActiveStartPoll } from './startGeneration';
import type { GenerationJobRecord } from './serverTypes';
import { localStorageAdapter } from '@/lib/storage/db';
import { getServerConfig } from '@/lib/server-config';

/**
 * Guard to prevent concurrent resume attempts for the same appId.
 * Without this, mount + visibilitychange + interval can all launch parallel
 * polling loops that race each other and may leave the generation store in
 * an inconsistent state.
 */
const activeResumes = new Map<string, Promise<void>>();

/**
 * Called on component mount and whenever the page becomes visible again.
 * If the user left while a generation was running, the persisted jobId lets us
 * re-attach to the server-side job and update the UI with the correct status.
 */
export function resumeGenerationIfNeeded(appId: string): Promise<void> {
  const existing = activeResumes.get(appId);
  if (existing) return existing;

  const promise = doResume(appId).finally(() => {
    // Only delete if this is still our entry (not replaced by a newer call).
    if (activeResumes.get(appId) === promise) {
      activeResumes.delete(appId);
    }
  });
  activeResumes.set(appId, promise);
  return promise;
}

async function doResume(appId: string): Promise<void> {
  const persisted = getPersistedJob(appId);
  if (!persisted) return;

  // If startGeneration is actively polling for this app in the current page
  // session, skip – a second polling path would duplicate messages/notifications.
  if (hasActiveStartPoll(appId)) return;

  let res: Response;
  let jobTimeoutMs: number;
  try {
    [res, { jobTimeoutMs }] = await Promise.all([
      fetch(`/api/generation/jobs/${persisted.jobId}`, { cache: 'no-store' }),
      getServerConfig(),
    ]);
  } catch {
    // Network error – server may be temporarily unreachable.  Keep the
    // persisted entry so we can retry on the next visibility change.
    return;
  }

  if (!res.ok) {
    if (res.status === 401) {
      return;
    }
    // Job expired or not found – drop the persisted entry.
    clearPersistedJob(appId);
    return;
  }

  const job = (await res.json()) as GenerationJobRecord;

  // Restore UI to a "busy" state so the user sees progress rather than a stale idle.
  startGenerationState(appId);
  patchGeneration(appId, {
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

  // Everything below can throw.  We must guarantee that if startGenerationState
  // set busy=true, we always transition to busy=false – otherwise the
  // generation is permanently stuck.
  try {
    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'expired') {
      // Job already finished while we were away – process the result immediately.
      clearPersistedJob(appId);
      await applyCompletedJob(appId, job, persisted.nextVersion, persisted.appName);
      return;
    }

    // Job is still running on the server – resume polling.
    const terminalJob = await pollGenerationJob(persisted.jobId, {
      staleTimeoutMs: jobTimeoutMs,
      onProgress: (j) => {
        patchGeneration(appId, {
          jobId: j.id,
          phase:
            j.progress.phase === 'queued'
              ? 'preparing'
              : j.progress.phase === 'error'
                ? 'error'
                : j.progress.phase,
          status: j.progress.statusText,
          streamedText: j.progress.streamedText,
          toolCallCount: j.progress.toolCallCount,
          currentToolCall: j.progress.currentToolCall,
        });
      },
    });

    clearPersistedJob(appId);
    await applyCompletedJob(appId, terminalJob, persisted.nextVersion, persisted.appName);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (error instanceof StaleJobError) {
      // The server worker stopped reporting progress – the job will never
      // complete.  Clear the persisted entry so we don't retry forever, and
      // try to write a permanent error message to the chat.
      clearPersistedJob(appId);
      let assistantMessage;
      try {
        assistantMessage = await localStorageAdapter.appendMessage(appId, {
          appId,
          role: 'assistant',
          content: `Error: ${message}`,
        });
      } catch {
        // Storage write failed – still ensure we clear the busy state below.
      }
      setGenerationResult(appId, {
        ok: false,
        error: message,
        ...(assistantMessage ? { assistantMessage } : {}),
        completedAt: Date.now(),
      });
    } else {
      // Network error during polling or applyCompletedJob failure – the
      // server-side job may still be running.  Clear busy so the UI is not
      // permanently blocked, but keep the persisted entry so
      // resumeGenerationIfNeeded retries on the next visibility change.
      setGenerationResult(appId, {
        ok: false,
        error: message,
        completedAt: Date.now(),
      });
      // NOTE: intentionally NOT calling clearPersistedJob – retry on next visit.
    }
  }
}
