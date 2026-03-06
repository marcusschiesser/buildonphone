import { Redis } from '@upstash/redis';
import { resolveRedisEnv } from '../generation/jobStoreConfig';
import type { SharedAppSnapshot } from './contracts';

const SHARE_PREFIX = 'buildonphone:share:';

let redisClient: Redis | null = null;

export function isShareStorageConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) && Boolean(env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN);
}

function getRedisClient(): Redis {
  if (redisClient) return redisClient;
  const { url, token } = resolveRedisEnv(process.env);
  redisClient = new Redis({ url, token });
  return redisClient;
}

function shareKey(shareId: string): string {
  return `${SHARE_PREFIX}${shareId}`;
}

export async function createSharedSnapshot(snapshot: SharedAppSnapshot): Promise<void> {
  await getRedisClient().set(shareKey(snapshot.id), snapshot);
}

export async function getSharedSnapshot(shareId: string): Promise<SharedAppSnapshot | null> {
  return (await getRedisClient().get<SharedAppSnapshot>(shareKey(shareId))) ?? null;
}
