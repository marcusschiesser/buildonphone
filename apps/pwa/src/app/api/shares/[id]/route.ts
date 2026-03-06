import { NextResponse } from 'next/server';
import { getSharedSnapshot, isShareStorageConfigured } from '@/lib/sharing/shareStore';

export const runtime = 'nodejs';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!isShareStorageConfigured()) {
    return NextResponse.json({ error: 'Sharing is not configured.' }, { status: 503 });
  }

  const { id } = await context.params;
  const snapshot = await getSharedSnapshot(id);

  if (!snapshot) {
    return NextResponse.json({ error: 'Shared app not found.' }, { status: 404 });
  }

  const publicSnapshot = { ...snapshot };
  delete publicSnapshot.creatorUserId;

  return NextResponse.json(publicSnapshot, {
    headers: {
      'cache-control': 'no-store',
    },
  });
}
