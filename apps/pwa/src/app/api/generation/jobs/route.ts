import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { safeRandomId } from '@/lib/id';
import { createJob } from '@/lib/generation/jobStore';
import { runGenerationJob } from '@/lib/generation/serverWorker';
import type { GenerationJobRecord, GenerationJobRequest } from '@/lib/generation/serverTypes';
import { resolveHostModel } from '@/lib/model';

export const runtime = 'nodejs';

function isValidRequest(body: unknown): body is GenerationJobRequest {
  if (!body || typeof body !== 'object') return false;
  const v = body as Partial<GenerationJobRequest>;
  return (
    typeof v.appId === 'string' &&
    typeof v.text === 'string' &&
    Array.isArray(v.messages) &&
    typeof v.version === 'number' &&
    v.baseFiles !== null &&
    typeof v.baseFiles === 'object' &&
    typeof v.theme === 'string' &&
    (v.model === undefined || typeof v.model === 'string')
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!isValidRequest(body)) {
    return NextResponse.json({ error: 'Invalid generation job request.' }, { status: 400 });
  }

  let resolvedModel: string;
  try {
    resolvedModel = resolveHostModel(body.model, { userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid model selection.';
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const jobId = safeRandomId('genjob');
  const now = Date.now();

  const job: GenerationJobRecord = {
    id: jobId,
    userId,
    status: 'queued',
    request: {
      ...body,
      model: resolvedModel,
    },
    statusText: 'Queued prompt',
    streamedText: '',
    toolCallCount: 0,
    currentToolCall: null,
    createdAt: now,
    updatedAt: now,
  };

  await createJob(job);

  const byok = req.headers.get('x-api-key')?.trim();
  void runGenerationJob(jobId, byok);

  return NextResponse.json(
    {
      jobId,
      status: job.status,
      pollUrl: `/api/generation/jobs/${jobId}`,
    },
    { status: 202 }
  );
}
