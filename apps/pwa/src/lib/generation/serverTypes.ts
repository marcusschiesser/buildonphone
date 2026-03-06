export type GenerationJobPhase =
  | 'queued'
  | 'preparing'
  | 'running'
  | 'syncing'
  | 'succeeded'
  | 'failed'
  | 'expired';

export type GenerationJobStatus = GenerationJobPhase;

export interface GenerationJobRequest {
  appId: string;
  text: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  version: number;
  baseFiles: Record<string, string>;
  theme: string;
  appNameHint?: string;
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
  userId: string;
  status: GenerationJobStatus;
  request: GenerationJobRequest;
  statusText: string;
  streamedText: string;
  toolCallCount: number;
  currentToolCall: string | null;
  result?: GenerationJobResult;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

export function isTerminalGenerationStatus(status: GenerationJobStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'expired';
}

export function isActiveGenerationStatus(status: GenerationJobStatus): boolean {
  return !isTerminalGenerationStatus(status);
}
