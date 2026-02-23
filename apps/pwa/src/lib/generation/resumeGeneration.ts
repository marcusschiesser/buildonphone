'use client';

import { getGeneration, patchGeneration, startGenerationState } from './generationStore';
import { clearPersistedJob, getPersistedJob } from './persistJob';
import { pollGenerationJob } from './pollJob';
import { applyCompletedJob } from './startGeneration';
import type { GenerationJobRecord } from './serverTypes';

/**
 * Called on component mount and whenever the page becomes visible again.
 * If the user left while a generation was running, the persisted jobId lets us
 * re-attach to the server-side job and update the UI with the correct status.
 */
export async function resumeGenerationIfNeeded(appId: string): Promise<void> {
  const persisted = getPersistedJob(appId);
  if (!persisted) return;

  // Already being tracked in-memory – another tab or the original polling is
  // still live, nothing to do.
  const existing = getGeneration(appId);
  if (existing?.busy) return;

  const res = await fetch(`/api/generation/jobs/${persisted.jobId}`, { cache: 'no-store' });
  if (!res.ok) {
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

  if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'expired') {
    // Job already finished while we were away – process the result immediately.
    clearPersistedJob(appId);
    await applyCompletedJob(appId, job, persisted.nextVersion, persisted.appName);
    return;
  }

  // Job is still running on the server – resume polling.
  try {
    const terminalJob = await pollGenerationJob(persisted.jobId, {
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
  } catch {
    clearPersistedJob(appId);
  }
}
