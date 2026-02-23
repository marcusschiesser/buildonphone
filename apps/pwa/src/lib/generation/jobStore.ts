import { Redis } from '@upstash/redis';
import type { GenerationJobRecord, GenerationJobResult, GenerationJobStatus } from './serverTypes';

const JOB_PREFIX = 'claw2go:genjob:';
const DEFAULT_TTL_SECONDS = Number(process.env.GENERATION_JOB_TTL_SECONDS || '86400');

type PartialProgress = Partial<GenerationJobRecord['progress']>;

type InMemoryStore = Map<string, GenerationJobRecord>;

const memoryStore: InMemoryStore = new Map();
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  const hasEnv = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!hasEnv) return null;
  redisClient = Redis.fromEnv();
  return redisClient;
}

function jobKey(jobId: string): string {
  return `${JOB_PREFIX}${jobId}`;
}

async function get(jobId: string): Promise<GenerationJobRecord | null> {
  const redis = getRedisClient();
  if (!redis) return memoryStore.get(jobId) ?? null;
  return (await redis.get<GenerationJobRecord>(jobKey(jobId))) ?? null;
}

async function set(record: GenerationJobRecord): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    memoryStore.set(record.id, record);
    return;
  }
  await redis.set(jobKey(record.id), record, { ex: DEFAULT_TTL_SECONDS });
}

function patch(record: GenerationJobRecord, updates: Partial<GenerationJobRecord>): GenerationJobRecord {
  return {
    ...record,
    ...updates,
    progress: {
      ...record.progress,
      ...(updates.progress ?? {}),
      updatedAt: Date.now(),
    },
  };
}

export async function createJob(record: GenerationJobRecord): Promise<void> {
  await set(record);
}

export async function getJob(jobId: string): Promise<GenerationJobRecord | null> {
  return get(jobId);
}

export async function updateJobProgress(jobId: string, progressPatch: PartialProgress, status?: GenerationJobStatus): Promise<void> {
  const existing = await get(jobId);
  if (!existing) return;
  const next = patch(existing, {
    status: status ?? existing.status,
    progress: {
      ...existing.progress,
      ...progressPatch,
      updatedAt: Date.now(),
    },
  });
  await set(next);
}

export async function completeJob(jobId: string, result: GenerationJobResult): Promise<void> {
  const existing = await get(jobId);
  if (!existing) return;
  const next = patch(existing, {
    status: 'succeeded',
    result,
    completedAt: Date.now(),
    progress: {
      ...existing.progress,
      phase: 'done',
      statusText: 'Done',
      updatedAt: Date.now(),
    },
  });
  await set(next);
}

export async function failJob(jobId: string, error: string): Promise<void> {
  const existing = await get(jobId);
  if (!existing) return;
  const next = patch(existing, {
    status: 'failed',
    result: {
      ok: false,
      error,
    },
    completedAt: Date.now(),
    progress: {
      ...existing.progress,
      phase: 'error',
      statusText: `Error: ${error}`,
      updatedAt: Date.now(),
    },
  });
  await set(next);
}

export async function expireJob(jobId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    const existing = memoryStore.get(jobId);
    if (!existing) return;
    memoryStore.set(jobId, {
      ...existing,
      status: 'expired',
      completedAt: Date.now(),
      progress: {
        ...existing.progress,
        phase: 'error',
        statusText: 'Expired',
        updatedAt: Date.now(),
      },
    });
    return;
  }
  const existing = await redis.get<GenerationJobRecord>(jobKey(jobId));
  if (!existing) return;
  await redis.set(
    jobKey(jobId),
    {
      ...existing,
      status: 'expired',
      completedAt: Date.now(),
      progress: {
        ...existing.progress,
        phase: 'error',
        statusText: 'Expired',
        updatedAt: Date.now(),
      },
    },
    { ex: DEFAULT_TTL_SECONDS }
  );
}
