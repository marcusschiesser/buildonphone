import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { expireJob, getJob } from '@/lib/generation/jobStore';
import { shouldExpireJob } from '@/lib/generation/recovery';

export const runtime = 'nodejs';
const JOB_TIMEOUT_MS = Number(process.env.GENERATION_JOB_TIMEOUT_SECONDS || '300') * 1000;
const FAKE_GENERATION_ENABLED = process.env.NEXT_PUBLIC_FAKE_GENERATION === '1';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  void req;
  const effectiveUserId = FAKE_GENERATION_ENABLED ? 'fake-generation-user' : (await auth()).userId;
  if (!effectiveUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let job = await getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Generation job not found.' }, { status: 404 });
  }

  if (job.userId !== effectiveUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (shouldExpireJob(job, JOB_TIMEOUT_MS)) {
    const latestJob = await getJob(id);
    if (!latestJob) {
      return NextResponse.json({ error: 'Generation job not found.' }, { status: 404 });
    }

    if (latestJob.userId !== effectiveUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (shouldExpireJob(latestJob, JOB_TIMEOUT_MS) && latestJob.updatedAt === job.updatedAt) {
      await expireJob(id);
      job = {
        ...latestJob,
        status: 'expired',
        statusText: 'Expired',
        completedAt: Date.now(),
        updatedAt: Date.now(),
      };
    } else {
      job = latestJob;
    }
  }

  return NextResponse.json(job);
}
