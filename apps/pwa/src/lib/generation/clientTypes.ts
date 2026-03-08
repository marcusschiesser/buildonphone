import type { ChatMessage } from '@/types';
import type { GenerationJobPhase, GenerationJobRecord } from './serverTypes';

export type GenerationPhase = 'idle' | GenerationJobPhase;
export type GenerationApplyState = 'pending' | 'applying' | 'applied';

export interface GenerationResult {
  ok: boolean;
  error?: string;
  newVersion?: number;
  artifacts?: Record<string, string>;
  assistantMessage?: ChatMessage;
  jobId?: string;
  completedAt: number;
}

type SharedPersistedJobFields = Pick<
  GenerationJobRecord,
  | 'id'
  | 'status'
  | 'statusText'
  | 'streamedText'
  | 'toolCallCount'
  | 'currentToolCall'
  | 'createdAt'
  | 'updatedAt'
  | 'startedAt'
  | 'completedAt'
>;

export interface GenerationReconnectState {
  reconnectStartedAt?: number;
  resumeFailureCount?: number;
  lastResumeFailureAt?: number;
}

export interface PersistedGenerationJob extends SharedPersistedJobFields, GenerationReconnectState {
  appId: string;
  nextVersion: number;
  appName: string;
  applyState: GenerationApplyState;
}

export interface GenerationState extends Omit<PersistedGenerationJob, 'status'> {
  busy: boolean;
  status?: GenerationJobPhase;
  phase: GenerationPhase;
  result?: GenerationResult;
}

export interface GenerationSnapshot {
  revision: number;
  byAppId: ReadonlyMap<string, GenerationState>;
}
