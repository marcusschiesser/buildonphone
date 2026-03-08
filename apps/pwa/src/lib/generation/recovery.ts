import { isTerminalGenerationStatus, type GenerationJobRecord } from './serverTypes';
import type { GenerationReconnectState } from './clientTypes';

export const MAX_RESUME_FAILURES = 3;
export const RECONNECTING_STATUS_TEXT = 'Reconnecting to generation job...';
export const LOST_CONNECTION_ERROR = 'Generation connection was lost. Please try again.';
export const REAUTH_ERROR = 'Your session expired while reconnecting. Sign in again and retry.';

export function markReconnectFailure<T extends GenerationReconnectState>(state: T, at = Date.now()): T {
  return {
    ...state,
    reconnectStartedAt: state.reconnectStartedAt ?? at,
    resumeFailureCount: (state.resumeFailureCount ?? 0) + 1,
    lastResumeFailureAt: at,
  };
}

export function clearReconnectState<T extends GenerationReconnectState>(state: T): T {
  return {
    ...state,
    reconnectStartedAt: undefined,
    resumeFailureCount: undefined,
    lastResumeFailureAt: undefined,
  };
}

export function shouldFailReconnect(
  state: GenerationReconnectState,
  jobTimeoutMs: number,
  now = Date.now()
): boolean {
  if ((state.resumeFailureCount ?? 0) >= MAX_RESUME_FAILURES) {
    return true;
  }

  return state.reconnectStartedAt !== undefined && now - state.reconnectStartedAt > jobTimeoutMs;
}

export function shouldExpireJob(job: Pick<GenerationJobRecord, 'status' | 'updatedAt'>, jobTimeoutMs: number, now = Date.now()): boolean {
  if (isTerminalGenerationStatus(job.status)) {
    return false;
  }

  return now - job.updatedAt > jobTimeoutMs;
}
