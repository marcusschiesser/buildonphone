import { NextResponse } from 'next/server';

export async function GET() {
  const hasServerKey = !!process.env.ANTHROPIC_API_KEY?.trim();
  return NextResponse.json({
    hasServerKey,
    requiresPassword: hasServerKey && !!process.env.APP_PASSWORD?.trim(),
    jobTimeoutMs: Number(process.env.GENERATION_JOB_TIMEOUT_SECONDS || '300') * 1000,
  });
}
