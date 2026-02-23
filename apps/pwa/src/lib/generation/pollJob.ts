import type { GenerationJobRecord } from './serverTypes';

// If the job's progress.updatedAt hasn't advanced for this long, the
// server-side worker has very likely crashed or been killed by the platform
// before it could mark the job as failed.  Treat it as unrecoverable.
// Mirrors NEXT_PUBLIC_GENERATION_JOB_TIMEOUT_SECONDS (default 300 s) so the
// client gives up at the same threshold as the server-side timeout.
const STALE_JOB_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_GENERATION_JOB_TIMEOUT_SECONDS || '300') * 1000;

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
    // tool-call, and status change, so silence for STALE_JOB_TIMEOUT_MS means
    // the worker has died.
    if (lastSeenUpdatedAt !== null && job.progress.updatedAt === lastSeenUpdatedAt) {
      if (staleWindowStart === null) {
        staleWindowStart = Date.now();
      } else if (Date.now() - staleWindowStart > STALE_JOB_TIMEOUT_MS) {
        throw new StaleJobError();
      }
    } else {
      // Progress moved – reset the stale window.
      staleWindowStart = null;
    }
    lastSeenUpdatedAt = job.progress.updatedAt;

    attempt += 1;
    const waitMs = Math.min(2000, 500 + attempt * 250);
    await sleep(waitMs);
  }
}
