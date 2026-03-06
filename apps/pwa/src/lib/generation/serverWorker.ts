import { getErrorMessage } from '@/lib/agent/agentShared';
import { runServerAgent } from '@/lib/agent/serverAgent';
import { runFakeGeneration, isFakeGenerationEnabled } from './fakeGeneration';
import { completeJob, failJob, getJob, updateJobProgress } from './jobStore';
import type { GenerationJobPhase, GenerationJobRecord } from './serverTypes';

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
    streamedText: '',
    toolCallCount: 0,
    currentToolCall: null,
    statusText: 'Preparing generation',
    startedAt,
  }, 'preparing');

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
  const phaseForStatus = (status: string): GenerationJobPhase => {
    const lower = status.toLowerCase();
    if (lower.includes('queue')) return 'queued';
    if (lower.includes('prepar')) return 'preparing';
    if (lower.includes('sync')) return 'syncing';
    return 'running';
  };

  if (isFakeGenerationEnabled()) {
    return runFakeGeneration({
      prompt: job.request.text,
      onStatus: async (status) => {
        await updateJobProgress(job.id, {
          statusText: status,
          streamedText: (await getJob(job.id))?.streamedText ?? '',
          toolCallCount: toolCalls,
          currentToolCall: (await getJob(job.id))?.currentToolCall ?? null,
        }, phaseForStatus(status));
      },
      onToolCall: async (target) => {
        toolCalls += 1;
        await updateJobProgress(job.id, {
          toolCallCount: toolCalls,
          currentToolCall: `#${toolCalls} ${target} (updating app files)`,
          statusText: `Running tool #${toolCalls}`,
          streamedText: (await getJob(job.id))?.streamedText ?? '',
        }, 'running');
      },
      onText: async (delta) => {
        const current = await getJob(job.id);
        const streamedText = `${current?.streamedText ?? ''}${delta}`;
        await updateJobProgress(job.id, {
          statusText: current?.statusText ?? 'Running',
          streamedText,
          toolCallCount: current?.toolCallCount ?? toolCalls,
          currentToolCall: current?.currentToolCall ?? null,
        });
      },
    });
  }

  const apiKey = requestScopedApiKey?.trim();
  if (!apiKey) {
    throw new Error('Missing Anthropic key. Provide your BYOK key.');
  }

  return runServerAgent({
    apiKey,
    theme: job.request.theme,
    messages: job.request.messages,
    baseFiles: job.request.baseFiles,
    baseVersion: job.request.version,
    onStatus: async (status) => {
      await updateJobProgress(job.id, {
        statusText: status,
        streamedText: (await getJob(job.id))?.streamedText ?? '',
        toolCallCount: toolCalls,
        currentToolCall: (await getJob(job.id))?.currentToolCall ?? null,
      }, phaseForStatus(status));
    },
    onToolCall: async (target) => {
      toolCalls += 1;
      await updateJobProgress(job.id, {
        toolCallCount: toolCalls,
        currentToolCall: `#${toolCalls} ${target} (updating app files)`,
        statusText: `Running tool #${toolCalls}`,
        streamedText: (await getJob(job.id))?.streamedText ?? '',
      }, 'running');
    },
    onText: async (delta) => {
      const current = await getJob(job.id);
      const streamedText = `${current?.streamedText ?? ''}${delta}`;
      await updateJobProgress(job.id, {
        statusText: current?.statusText ?? 'Running',
        streamedText,
        toolCallCount: current?.toolCallCount ?? toolCalls,
        currentToolCall: current?.currentToolCall ?? null,
      });
    },
  });
}
