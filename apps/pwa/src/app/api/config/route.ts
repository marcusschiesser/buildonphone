import { NextResponse } from 'next/server';

export async function GET() {
  const hasServerKey = !!process.env.ANTHROPIC_API_KEY?.trim();
  return NextResponse.json({
    hasServerKey,
    requiresPassword: hasServerKey && !!process.env.APP_PASSWORD?.trim(),
  });
}
