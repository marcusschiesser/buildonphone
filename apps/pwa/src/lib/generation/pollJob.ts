import type { GenerationJobRecord } from './serverTypes';

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

    attempt += 1;
    const waitMs = Math.min(2000, 500 + attempt * 250);
    await sleep(waitMs);
  }
}
