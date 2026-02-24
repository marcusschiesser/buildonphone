import { Redis } from '@upstash/redis';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { GenerationJobRecord, GenerationJobResult, GenerationJobStatus } from './serverTypes';

const JOB_PREFIX = 'claw2go:genjob:';
const DEFAULT_TTL_SECONDS = Number(process.env.GENERATION_JOB_TTL_SECONDS || '86400');

type PartialProgress = Partial<GenerationJobRecord['progress']>;

let redisClient: Redis | null = null;
const fallbackFilePath = resolve(process.cwd(), process.env.GENERATION_JOB_FALLBACK_FILE || '.next/gen-jobs.json');

function allowInMemoryFallback(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_FAKE_GENERATION === '1';
}

function resolveRedisEnv(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Missing Redis configuration. Set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN.'
    );
  }

  return { url, token };
}

function getRedisClient(): Redis {
  if (redisClient) return redisClient;
  const { url, token } = resolveRedisEnv();
  redisClient = new Redis({ url, token });
  return redisClient;
}

function jobKey(jobId: string): string {
  return `${JOB_PREFIX}${jobId}`;
}

async function get(jobId: string): Promise<GenerationJobRecord | null> {
  let redis: Redis | null = null;
  try {
    redis = getRedisClient();
  } catch {
    if (!allowInMemoryFallback()) throw new Error(
      'Missing Redis configuration. Set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN.'
    );
  }
  if (!redis) {
    const store = await readFallbackStore();
    return store[jobId] ?? null;
  }
  return (await redis.get<GenerationJobRecord>(jobKey(jobId))) ?? null;
}

async function set(record: GenerationJobRecord): Promise<void> {
  let redis: Redis | null = null;
  try {
    redis = getRedisClient();
  } catch {
    if (!allowInMemoryFallback()) throw new Error(
      'Missing Redis configuration. Set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN.'
    );
  }
  if (!redis) {
    const store = await readFallbackStore();
    store[record.id] = record;
    await writeFallbackStore(store);
    return;
  }
  await redis.set(jobKey(record.id), record, { ex: DEFAULT_TTL_SECONDS });
}

type FallbackStore = Record<string, GenerationJobRecord>;

async function readFallbackStore(): Promise<FallbackStore> {
  try {
    const raw = await readFile(fallbackFilePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as FallbackStore;
  } catch {
    return {};
  }
}

async function writeFallbackStore(store: FallbackStore): Promise<void> {
  await mkdir(dirname(fallbackFilePath), { recursive: true });
  await writeFile(fallbackFilePath, JSON.stringify(store), 'utf8');
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
