import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/generation/jobStore';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const job = await getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Generation job not found.' }, { status: 404 });
  }

  return NextResponse.json(job);
}
