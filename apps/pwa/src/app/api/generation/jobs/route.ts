import { after, NextRequest, NextResponse } from 'next/server';
import { safeRandomId } from '@/lib/id';
import { createJob } from '@/lib/generation/jobStore';
import { runGenerationJob } from '@/lib/generation/serverWorker';
import type { GenerationJobRecord, GenerationJobRequest } from '@/lib/generation/serverTypes';

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
    typeof v.theme === 'string'
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!isValidRequest(body)) {
    return NextResponse.json({ error: 'Invalid generation job request.' }, { status: 400 });
  }

  const jobId = safeRandomId('genjob');
  const now = Date.now();

  const job: GenerationJobRecord = {
    id: jobId,
    status: 'queued',
    request: body,
    createdAt: now,
    progress: {
      phase: 'queued',
      statusText: 'Queued prompt',
      streamedText: '',
      toolCallCount: 0,
      currentToolCall: null,
      updatedAt: now,
    },
  };

  await createJob(job);

  const byok = req.headers.get('x-api-key')?.trim();
  after(() => runGenerationJob(jobId, byok));

  return NextResponse.json(
    {
      jobId,
      status: job.status,
      pollUrl: `/api/generation/jobs/${jobId}`,
    },
    { status: 202 }
  );
}
