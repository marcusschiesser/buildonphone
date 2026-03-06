'use client';

import { clearGeneration, hydrateGeneration, setGenerationResult } from './generationStore';
import { clearPersistedJob, getAllPersistedJobs, getPersistedJob, persistActiveJob, toPersistedJob } from './persistJob';
import { pollGenerationJob, StaleJobError } from './pollJob';
import { applyCompletedJob, hasActiveStartPoll } from './startGeneration';
import { isTerminalGenerationStatus, type GenerationJobRecord } from './serverTypes';
import { getServerConfig } from '@/lib/server-config';

const activeResumes = new Map<string, Promise<void>>();

export function resumeGenerationIfNeeded(appId: string): Promise<void> {
  const existing = activeResumes.get(appId);
  if (existing) return existing;

  const promise = doResume(appId).finally(() => {
    if (activeResumes.get(appId) === promise) {
      activeResumes.delete(appId);
    }
  });
  activeResumes.set(appId, promise);
  return promise;
}

export async function resumeAllPersistedGenerations(): Promise<void> {
  const jobs = await getAllPersistedJobs();
  await Promise.all(jobs.map((job) => resumeGenerationIfNeeded(job.appId)));
}

async function syncPersistedFromJob(job: GenerationJobRecord, persisted: Awaited<ReturnType<typeof getPersistedJob>>) {
  if (!persisted) return;
  const next = toPersistedJob(job, {
    appId: persisted.appId,
    nextVersion: persisted.nextVersion,
    appName: persisted.appName,
    applyState: persisted.applyState,
  });
  await persistActiveJob(next);
  hydrateGeneration(next);
}

async function doResume(appId: string): Promise<void> {
  const persisted = await getPersistedJob(appId);
  if (!persisted) {
    clearGeneration(appId);
    return;
  }

  hydrateGeneration(persisted);

  if (hasActiveStartPoll(appId)) return;

  let res: Response;
  let jobTimeoutMs: number;
  try {
    [res, { jobTimeoutMs }] = await Promise.all([
      fetch(`/api/generation/jobs/${persisted.id}`, { cache: 'no-store' }),
      getServerConfig(),
    ]);
  } catch {
    return;
  }

  if (!res.ok) {
    if (res.status === 401) {
      return;
    }
    await clearPersistedJob(appId);
    clearGeneration(appId);
    return;
  }

  const job = (await res.json()) as GenerationJobRecord;
  await syncPersistedFromJob(job, persisted);

  try {
    if (isTerminalGenerationStatus(job.status)) {
      await applyCompletedJob(appId, job, persisted.nextVersion, persisted.appName, job.startedAt);
      return;
    }

    const terminalJob = await pollGenerationJob(persisted.id, {
      staleTimeoutMs: jobTimeoutMs,
      onProgress: (nextJob) => {
        void syncPersistedFromJob(nextJob, persisted);
      },
    });

    await applyCompletedJob(appId, terminalJob, persisted.nextVersion, persisted.appName, terminalJob.startedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (error instanceof StaleJobError) {
      await clearPersistedJob(appId);
      setGenerationResult(appId, {
        ok: false,
        error: message,
        completedAt: Date.now(),
      });
      return;
    }

    setGenerationResult(appId, {
      ok: false,
      error: message,
      completedAt: Date.now(),
    });
  }
}
