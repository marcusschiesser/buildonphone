export type GenerationJobStoreMode = 'redis' | 'memory';

function isFakeGenerationEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NEXT_PUBLIC_FAKE_GENERATION === '1';
}

export function resolveGenerationJobStoreMode(env: NodeJS.ProcessEnv): GenerationJobStoreMode {
  const configured = env.GENERATION_JOB_STORE?.trim();
  const mode = configured === 'memory' ? 'memory' : 'redis';

  if (mode === 'memory' && !isFakeGenerationEnabled(env)) {
    throw new Error('GENERATION_JOB_STORE=memory is only allowed when fake generation is enabled.');
  }

  return mode;
}

export function resolveRedisEnv(env: NodeJS.ProcessEnv): { url: string; token: string } {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Missing Redis configuration. Set UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL/KV_REST_API_TOKEN.'
    );
  }

  return { url, token };
}
