import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { safeRandomId } from '@/lib/id';
import { createSharedSnapshot, isShareStorageConfigured } from '@/lib/sharing/shareStore';
import { parseSharedAppSnapshotPayload } from '@/lib/sharing/schema';
import type { SharedAppSnapshot } from '@/lib/sharing/contracts';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isShareStorageConfigured()) {
    return NextResponse.json({ error: 'Sharing is not configured.' }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  let payload;

  try {
    payload = parseSharedAppSnapshotPayload(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid share payload.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const snapshot: SharedAppSnapshot = {
      id: safeRandomId('share'),
      createdAt: new Date().toISOString(),
      creatorUserId: userId,
      ...payload,
    };

    await createSharedSnapshot(snapshot);

    return NextResponse.json({
      shareId: snapshot.id,
      sharePath: `/share/${snapshot.id}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create share link.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
