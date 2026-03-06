import { Redis } from '@upstash/redis';
import { resolveGenerationJobStoreMode, resolveRedisEnv } from './jobStoreConfig';
import type { GenerationJobPhase, GenerationJobRecord, GenerationJobResult } from './serverTypes';

const JOB_PREFIX = 'buildonphone:genjob:';
const DEFAULT_TTL_SECONDS = Number(process.env.GENERATION_JOB_TTL_SECONDS || '86400');

type MemoryStore = Map<string, GenerationJobRecord>;
type JobPatch = Partial<Omit<GenerationJobRecord, 'id' | 'userId' | 'request'>> & {
  status?: GenerationJobPhase;
};

let redisClient: Redis | null = null;
const memoryStore: MemoryStore = new Map();

function getStoreMode() {
  return resolveGenerationJobStoreMode(process.env);
}

function getRedisClient(): Redis {
  if (redisClient) return redisClient;
  const { url, token } = resolveRedisEnv(process.env);
  redisClient = new Redis({ url, token });
  return redisClient;
}

function jobKey(jobId: string): string {
  return `${JOB_PREFIX}${jobId}`;
}

async function get(jobId: string): Promise<GenerationJobRecord | null> {
  if (getStoreMode() === 'memory') {
    return memoryStore.get(jobId) ?? null;
  }

  return (await getRedisClient().get<GenerationJobRecord>(jobKey(jobId))) ?? null;
}

async function set(record: GenerationJobRecord): Promise<void> {
  if (getStoreMode() === 'memory') {
    memoryStore.set(record.id, record);
    return;
  }

  await getRedisClient().set(jobKey(record.id), record, { ex: DEFAULT_TTL_SECONDS });
}

function patch(record: GenerationJobRecord, updates: JobPatch): GenerationJobRecord {
  const now = Date.now();
  return {
    ...record,
    ...updates,
    updatedAt: now,
  };
}

export async function createJob(record: GenerationJobRecord): Promise<void> {
  await set(record);
}

export async function getJob(jobId: string): Promise<GenerationJobRecord | null> {
  return get(jobId);
}

export async function updateJob(jobId: string, updates: JobPatch): Promise<void> {
  const existing = await get(jobId);
  if (!existing) return;
  await set(patch(existing, updates));
}

export async function updateJobProgress(
  jobId: string,
  progressPatch: Partial<Pick<GenerationJobRecord, 'statusText' | 'streamedText' | 'toolCallCount' | 'currentToolCall' | 'startedAt' | 'completedAt'>>,
  status?: GenerationJobPhase
): Promise<void> {
  await updateJob(jobId, {
    ...(status ? { status } : {}),
    ...progressPatch,
  });
}

export async function completeJob(jobId: string, result: GenerationJobResult): Promise<void> {
  await updateJob(jobId, {
    status: 'succeeded',
    result,
    statusText: 'Done',
    completedAt: Date.now(),
  });
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await updateJob(jobId, {
    status: 'failed',
    result: {
      ok: false,
      error,
    },
    statusText: `Error: ${error}`,
    completedAt: Date.now(),
  });
}

export async function expireJob(jobId: string): Promise<void> {
  await updateJob(jobId, {
    status: 'expired',
    statusText: 'Expired',
    completedAt: Date.now(),
  });
}
