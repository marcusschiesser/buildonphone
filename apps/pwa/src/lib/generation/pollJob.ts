import type { GenerationJobRecord } from './serverTypes';

export class StaleJobError extends Error {
  constructor() {
    super(
      'Generation appears stuck – the server stopped reporting progress. ' +
        'Please try again.'
    );
    this.name = 'StaleJobError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pollGenerationJob(
  jobId: string,
  handlers: {
    onProgress: (job: GenerationJobRecord) => void;
    signal?: AbortSignal;
    /** How long progress.updatedAt may stay unchanged before the job is
     *  considered stuck.  Should match the server-side job timeout. */
    staleTimeoutMs?: number;
  }
): Promise<GenerationJobRecord> {
  let attempt = 0;
  let lastSeenUpdatedAt: number | null = null;
  let staleWindowStart: number | null = null;

  while (true) {
    if (handlers.signal?.aborted) {
      throw new Error('Generation polling aborted.');
    }

    const res = await fetch(`/api/generation/jobs/${jobId}`, {
      cache: 'no-store',
      signal: handlers.signal,
    });

    if (!res.ok) {
      throw new Error(`Failed to poll generation job (${res.status}).`);
    }

    const job = (await res.json()) as GenerationJobRecord;
    handlers.onProgress(job);

    if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'expired') {
      return job;
    }

    // Stale detection: track whether progress.updatedAt is advancing.
    // During active generation the server updates it on every text delta,
    // tool-call, and status change, so silence for staleTimeoutMs means
    // the worker has died.
    if (handlers.staleTimeoutMs !== undefined) {
      if (lastSeenUpdatedAt !== null && job.progress.updatedAt === lastSeenUpdatedAt) {
        if (staleWindowStart === null) {
          staleWindowStart = Date.now();
        } else if (Date.now() - staleWindowStart > handlers.staleTimeoutMs) {
          throw new StaleJobError();
        }
      } else {
        // Progress moved – reset the stale window.
        staleWindowStart = null;
      }
      lastSeenUpdatedAt = job.progress.updatedAt;
    }

    attempt += 1;
    const waitMs = Math.min(2000, 500 + attempt * 250);
    await sleep(waitMs);
  }
}
