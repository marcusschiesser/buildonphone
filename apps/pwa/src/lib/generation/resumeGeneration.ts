'use client';

import { clearGeneration, hydrateGeneration, setGenerationResult } from './generationStore';
import { clearPersistedJob, getAllPersistedJobs, getPersistedJob, persistActiveJob, toPersistedJob } from './persistJob';
import { pollGenerationJob, StaleJobError } from './pollJob';
import { applyCompletedJob, hasActiveStartPoll } from './startGeneration';
import { isTerminalGenerationStatus, type GenerationJobRecord } from './serverTypes';
import { getServerConfig } from '@/lib/server-config';
import {
  clearReconnectState,
  LOST_CONNECTION_ERROR,
  markReconnectFailure,
  REAUTH_ERROR,
  RECONNECTING_STATUS_TEXT,
  shouldFailReconnect,
} from './recovery';

const activeResumes = new Map<string, Promise<void>>();
const DEFAULT_JOB_TIMEOUT_MS = 5 * 60 * 1000;

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
  if (!persisted) return null;
  const next = clearReconnectState(toPersistedJob(job, {
    appId: persisted.appId,
    nextVersion: persisted.nextVersion,
    appName: persisted.appName,
    applyState: persisted.applyState,
  }));
  await persistActiveJob(next);
  hydrateGeneration(next);
  return next;
}

async function failReconnect(appId: string, error: string): Promise<void> {
  await clearPersistedJob(appId);
  setGenerationResult(appId, {
    ok: false,
    error,
    completedAt: Date.now(),
  });
}

async function recordResumeFailure(
  appId: string,
  persisted: NonNullable<Awaited<ReturnType<typeof getPersistedJob>>>,
  jobTimeoutMs: number,
  errorMessage: string
): Promise<void> {
  const reconnecting = markReconnectFailure({
    ...persisted,
    statusText: RECONNECTING_STATUS_TEXT,
  });

  if (shouldFailReconnect(reconnecting, jobTimeoutMs)) {
    await failReconnect(appId, errorMessage);
    return;
  }

  await persistActiveJob(reconnecting);
  hydrateGeneration(reconnecting);
}

async function doResume(appId: string): Promise<void> {
  const persisted = await getPersistedJob(appId);
  if (!persisted) {
    clearGeneration(appId);
    return;
  }
  let latestPersisted = persisted;

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
    await recordResumeFailure(appId, persisted, DEFAULT_JOB_TIMEOUT_MS, LOST_CONNECTION_ERROR);
    return;
  }

  if (!res.ok) {
    if (res.status === 401) {
      await recordResumeFailure(appId, persisted, jobTimeoutMs, REAUTH_ERROR);
      return;
    }
    await failReconnect(appId, LOST_CONNECTION_ERROR);
    return;
  }

  const job = (await res.json()) as GenerationJobRecord;
  latestPersisted = (await syncPersistedFromJob(job, latestPersisted)) ?? latestPersisted;

  try {
    if (isTerminalGenerationStatus(job.status)) {
      await applyCompletedJob(appId, job, persisted.nextVersion, persisted.appName, job.startedAt);
      return;
    }

    const terminalJob = await pollGenerationJob(persisted.id, {
      staleTimeoutMs: jobTimeoutMs,
      onProgress: async (nextJob) => {
        latestPersisted = (await syncPersistedFromJob(nextJob, latestPersisted)) ?? latestPersisted;
      },
    });

    await applyCompletedJob(appId, terminalJob, persisted.nextVersion, persisted.appName, terminalJob.startedAt);
  } catch (error) {
    if (error instanceof StaleJobError) {
      await failReconnect(appId, error.message);
      return;
    }

    await recordResumeFailure(appId, latestPersisted, jobTimeoutMs, LOST_CONNECTION_ERROR);
  }
}
