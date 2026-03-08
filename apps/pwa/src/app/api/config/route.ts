import { auth } from '@clerk/nextjs/server';
import { canOverrideModel, DEFAULT_MODEL } from '@/lib/model';
import { isShareStorageConfigured } from '@/lib/sharing/shareStore';
import { NextResponse } from 'next/server';

export async function GET() {
  const effectiveUserId =
    process.env.NEXT_PUBLIC_FAKE_GENERATION === '1' ? 'fake-generation-user' : (await auth()).userId;

  return NextResponse.json({
    jobTimeoutMs: Number(process.env.GENERATION_JOB_TIMEOUT_SECONDS || '300') * 1000,
    shareEnabled: isShareStorageConfigured(),
    defaultModel: DEFAULT_MODEL,
    generationModelOverrideEnabled: canOverrideModel({ userId: effectiveUserId }),
  });
}
