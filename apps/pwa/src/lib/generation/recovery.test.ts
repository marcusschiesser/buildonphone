import { describe, expect, it } from 'vitest';
import {
  MAX_RESUME_FAILURES,
  clearReconnectState,
  markReconnectFailure,
  shouldExpireJob,
  shouldFailReconnect,
} from './recovery';
import type { GenerationReconnectState } from './clientTypes';

describe('recovery helpers', () => {
  it('marks reconnect failures and preserves the original reconnect start time', () => {
    const first = markReconnectFailure({} as GenerationReconnectState, 100);
    expect(first.reconnectStartedAt).toBe(100);
    expect(first.resumeFailureCount).toBe(1);
    expect(first.lastResumeFailureAt).toBe(100);

    const second = markReconnectFailure(first, 200);
    expect(second.reconnectStartedAt).toBe(100);
    expect(second.resumeFailureCount).toBe(2);
    expect(second.lastResumeFailureAt).toBe(200);
  });

  it('clears reconnect metadata after successful progress', () => {
    expect(
      clearReconnectState({
        reconnectStartedAt: 100,
        resumeFailureCount: 2,
        lastResumeFailureAt: 200,
      })
    ).toEqual({
      reconnectStartedAt: undefined,
      resumeFailureCount: undefined,
      lastResumeFailureAt: undefined,
    });
  });

  it('fails reconnects after too many failures or too much elapsed time', () => {
    expect(shouldFailReconnect({ resumeFailureCount: MAX_RESUME_FAILURES }, 10_000, 1_000)).toBe(true);
    expect(shouldFailReconnect({ reconnectStartedAt: 0, resumeFailureCount: 1 }, 10_000, 10_001)).toBe(true);
    expect(shouldFailReconnect({ reconnectStartedAt: 0, resumeFailureCount: 1 }, 10_000, 9_999)).toBe(false);
  });

  it('expires only non-terminal stale jobs', () => {
    expect(shouldExpireJob({ status: 'running', updatedAt: 0 }, 10_000, 10_001)).toBe(true);
    expect(shouldExpireJob({ status: 'running', updatedAt: 0 }, 10_000, 9_999)).toBe(false);
    expect(shouldExpireJob({ status: 'failed', updatedAt: 0 }, 10_000, 20_000)).toBe(false);
  });
});
