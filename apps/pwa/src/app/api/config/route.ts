import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    jobTimeoutMs: Number(process.env.GENERATION_JOB_TIMEOUT_SECONDS || '300') * 1000,
  });
}
