import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/generation/jobStore';
import { isRequestAuthorized } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isRequestAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const job = await getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Generation job not found.' }, { status: 404 });
  }

  return NextResponse.json(job);
}
