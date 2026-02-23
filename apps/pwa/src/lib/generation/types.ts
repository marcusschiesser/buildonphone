import type { ChatMessage } from '@/types';

export type GenerationPhase = 'idle' | 'preparing' | 'running' | 'syncing' | 'done' | 'error';

export interface GenerationResult {
  ok: boolean;
  error?: string;
  newVersion?: number;
  artifacts?: Record<string, string>;
  assistantMessage?: ChatMessage;
  jobId?: string;
  completedAt: number;
}

export interface GenerationState {
  appId: string;
  busy: boolean;
  phase: GenerationPhase;
  status: string;
  streamedText: string;
  currentToolCall: string | null;
  toolCallCount: number;
  jobId?: string;
  result?: GenerationResult;
  startedAt: number;
  updatedAt: number;
}

export interface GenerationSnapshot {
  revision: number;
  byAppId: ReadonlyMap<string, GenerationState>;
}
