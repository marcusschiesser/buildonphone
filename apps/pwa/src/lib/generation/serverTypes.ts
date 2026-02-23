export type GenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'expired';

export interface GenerationJobRequest {
  appId: string;
  text: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  version: number;
  baseFiles: Record<string, string>;
  theme: string;
  appNameHint?: string;
}

export interface GenerationJobProgress {
  phase: 'queued' | 'preparing' | 'running' | 'syncing' | 'done' | 'error';
  statusText: string;
  streamedText: string;
  toolCallCount: number;
  currentToolCall: string | null;
  updatedAt: number;
}

export interface GenerationJobResult {
  ok: boolean;
  text?: string;
  artifacts?: Record<string, string>;
  error?: string;
  newVersionHint?: number;
}

export interface GenerationJobRecord {
  id: string;
  status: GenerationJobStatus;
  request: GenerationJobRequest;
  progress: GenerationJobProgress;
  result?: GenerationJobResult;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
