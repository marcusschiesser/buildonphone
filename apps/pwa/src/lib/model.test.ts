import { describe, expect, it } from 'vitest';
import { canOverrideModel, DEFAULT_MODEL, getSuperUserIds, resolveHostModel } from './model';

function env(input: Record<string, string> = {}): NodeJS.ProcessEnv {
  return input as NodeJS.ProcessEnv;
}

describe('model access', () => {
  it('allows override in development', () => {
    expect(canOverrideModel({ env: env({ NODE_ENV: 'development' }) })).toBe(true);
  });

  it('allows override for configured super users in production', () => {
    expect(
      canOverrideModel({
        userId: 'user_123',
        env: env({ NODE_ENV: 'production', SUPERUSER_CLERK_USER_IDS: 'user_123,user_456' }),
      })
    ).toBe(true);
    expect(
      canOverrideModel({
        userId: 'user_999',
        env: env({ NODE_ENV: 'production', SUPERUSER_CLERK_USER_IDS: 'user_123,user_456' }),
      })
    ).toBe(false);
  });

  it('parses super user ids from env', () => {
    expect(getSuperUserIds(env({ SUPERUSER_CLERK_USER_IDS: ' user_1, ,user_2 ' }))).toEqual(['user_1', 'user_2']);
  });
});

describe('resolveHostModel', () => {
  it('returns the default model when no override is provided', () => {
    expect(resolveHostModel(undefined, { env: env({ NODE_ENV: 'production' }) })).toBe(DEFAULT_MODEL);
  });

  it('accepts a custom model for allowed sessions', () => {
    expect(resolveHostModel('claude-opus-4-1', { env: env({ NODE_ENV: 'development' }) })).toBe('claude-opus-4-1');
  });

  it('rejects a custom model for regular production users', () => {
    expect(() => resolveHostModel('claude-opus-4-1', { env: env({ NODE_ENV: 'production' }) })).toThrow(
      'Custom model selection is not allowed for this user.'
    );
  });
});
