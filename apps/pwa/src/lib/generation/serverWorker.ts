import { getErrorMessage } from '@/lib/agent/agentShared';
import { runServerAgent } from '@/lib/agent/serverAgent';
import { runFakeGeneration, isFakeGenerationEnabled } from './fakeGeneration';
import { completeJob, failJob, getJob, updateJobProgress } from './jobStore';
import type { GenerationJobRecord } from './serverTypes';

const JOB_TIMEOUT_MS = Number(process.env.GENERATION_JOB_TIMEOUT_SECONDS || '300') * 1000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Generation job timed out.')), timeoutMs);
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export async function runGenerationJob(jobId: string, requestScopedApiKey?: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  const startedAt = Date.now();
  await updateJobProgress(jobId, {
    phase: 'running',
    statusText: 'Preparing generation',
    streamedText: '',
    toolCallCount: 0,
    currentToolCall: null,
    updatedAt: startedAt,
  }, 'running');

  try {
    const payload = await withTimeout(runJobCore(job, requestScopedApiKey), JOB_TIMEOUT_MS);
    await completeJob(jobId, {
      ok: true,
      text: payload.text,
      artifacts: payload.artifacts,
      newVersionHint: job.request.version + 1,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    await failJob(jobId, message);
  }
}

async function runJobCore(job: GenerationJobRecord, requestScopedApiKey?: string): Promise<{ text: string; artifacts: Record<string, string> }> {
  let toolCalls = 0;

  if (isFakeGenerationEnabled()) {
    return runFakeGeneration({
      prompt: job.request.text,
      onStatus: async (status) => {
        await updateJobProgress(job.id, {
          phase: status.toLowerCase().includes('sync') ? 'syncing' : 'running',
          statusText: status,
        });
      },
      onToolCall: async (target) => {
        toolCalls += 1;
        await updateJobProgress(job.id, {
          toolCallCount: toolCalls,
          currentToolCall: `#${toolCalls} ${target} (updating app files)`,
          statusText: `Running tool #${toolCalls}`,
        });
      },
      onText: async (delta) => {
        const current = await getJob(job.id);
        const streamedText = `${current?.progress.streamedText ?? ''}${delta}`;
        await updateJobProgress(job.id, {
          streamedText,
        });
      },
    });
  }

  const serverKey = process.env.ANTHROPIC_API_KEY?.trim();
  const apiKey = serverKey || requestScopedApiKey?.trim();
  if (!apiKey) {
    throw new Error('Missing Anthropic key. Configure server ANTHROPIC_API_KEY or provide BYOK key.');
  }

  return runServerAgent({
    apiKey,
    theme: job.request.theme,
    messages: job.request.messages,
    baseFiles: job.request.baseFiles,
    baseVersion: job.request.version,
    onStatus: async (status) => {
      await updateJobProgress(job.id, {
        phase: status.toLowerCase().includes('sync') ? 'syncing' : 'running',
        statusText: status,
      });
    },
    onToolCall: async (target) => {
      toolCalls += 1;
      await updateJobProgress(job.id, {
        toolCallCount: toolCalls,
        currentToolCall: `#${toolCalls} ${target} (updating app files)`,
        statusText: `Running tool #${toolCalls}`,
      });
    },
    onText: async (delta) => {
      const current = await getJob(job.id);
      const streamedText = `${current?.progress.streamedText ?? ''}${delta}`;
      await updateJobProgress(job.id, {
        streamedText,
      });
    },
  });
}
