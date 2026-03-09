import { describe, expect, it } from 'vitest';
import { resolveGenerationJobStoreMode } from './jobStoreConfig';
import { isTerminalGenerationStatus } from './serverTypes';
import { isShareStorageConfigured } from '../sharing/shareStore';

function env(input: Record<string, string> = {}): NodeJS.ProcessEnv {
  return input as NodeJS.ProcessEnv;
}

describe('jobStoreConfig', () => {
  it('defaults to redis when no mode is configured', () => {
    expect(resolveGenerationJobStoreMode(env())).toBe('redis');
  });

  it('defaults to memory when fake generation is enabled', () => {
    expect(resolveGenerationJobStoreMode(env({ NEXT_PUBLIC_FAKE_GENERATION: '1' }))).toBe('memory');
  });

  it('allows memory mode only for fake generation', () => {
    expect(resolveGenerationJobStoreMode(env({ GENERATION_JOB_STORE: 'memory', NEXT_PUBLIC_FAKE_GENERATION: '1' }))).toBe('memory');
    expect(() => resolveGenerationJobStoreMode(env({ GENERATION_JOB_STORE: 'memory' }))).toThrow(
      'GENERATION_JOB_STORE=memory is only allowed when fake generation is enabled.'
    );
  });
});

describe('serverTypes', () => {
  it('identifies terminal job statuses', () => {
    expect(isTerminalGenerationStatus('succeeded')).toBe(true);
    expect(isTerminalGenerationStatus('failed')).toBe(true);
    expect(isTerminalGenerationStatus('expired')).toBe(true);
    expect(isTerminalGenerationStatus('running')).toBe(false);
  });
});

describe('shareStore', () => {
  it('requires both Redis url and token for sharing', () => {
    expect(isShareStorageConfigured(env())).toBe(false);
    expect(isShareStorageConfigured(env({ UPSTASH_REDIS_REST_URL: 'https://example.com' }))).toBe(false);
    expect(isShareStorageConfigured(env({ UPSTASH_REDIS_REST_TOKEN: 'token' }))).toBe(false);
    expect(
      isShareStorageConfigured(
        env({
          UPSTASH_REDIS_REST_URL: 'https://example.com',
          UPSTASH_REDIS_REST_TOKEN: 'token',
        })
      )
    ).toBe(true);
  });
});
