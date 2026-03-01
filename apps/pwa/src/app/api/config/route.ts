import { NextRequest, NextResponse } from 'next/server';
import { isPasswordProtectionEnabled, isRequestAuthorized } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const hasServerKey = !!process.env.ANTHROPIC_API_KEY?.trim();
  const requiresPassword = isPasswordProtectionEnabled();
  const authenticated = requiresPassword ? await isRequestAuthorized(req) : true;

  return NextResponse.json({
    hasServerKey,
    requiresPassword,
    authenticated,
    jobTimeoutMs: Number(process.env.GENERATION_JOB_TIMEOUT_SECONDS || '300') * 1000,
  });
}
