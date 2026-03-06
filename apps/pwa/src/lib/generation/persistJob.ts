import type { GenerationJobRecord } from './serverTypes';
import type { PersistedGenerationJob } from './clientTypes';
import {
  deletePersistedGenerationJobByAppId,
  getPersistedGenerationJobByAppId,
  listPersistedGenerationJobs,
  putPersistedGenerationJob,
} from '@/lib/storage/db';

export async function persistActiveJob(job: PersistedGenerationJob): Promise<void> {
  await putPersistedGenerationJob(job);
}

export async function clearPersistedJob(appId: string): Promise<void> {
  await deletePersistedGenerationJobByAppId(appId);
}

export async function getPersistedJob(appId: string): Promise<PersistedGenerationJob | null> {
  return getPersistedGenerationJobByAppId(appId);
}

export async function getAllPersistedJobs(): Promise<PersistedGenerationJob[]> {
  return listPersistedGenerationJobs();
}

export function toPersistedJob(job: GenerationJobRecord, input: {
  appId: string;
  nextVersion: number;
  appName: string;
  applyState?: PersistedGenerationJob['applyState'];
}): PersistedGenerationJob {
  return {
    id: job.id,
    appId: input.appId,
    nextVersion: input.nextVersion,
    appName: input.appName,
    status: job.status,
    statusText: job.statusText,
    streamedText: job.streamedText,
    toolCallCount: job.toolCallCount,
    currentToolCall: job.currentToolCall,
    applyState: input.applyState ?? 'pending',
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}
