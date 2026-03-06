'use client';

import { getLocalSharedImport, exportAppSnapshot, importSharedAppSnapshot } from '@/lib/storage/db';
import { captureAnalyticsEvent } from '@/lib/analytics/telemetry';
import type { SharedAppSnapshot, SharedAppSnapshotPayload } from './contracts';
import { parseSharedAppSnapshot } from './schema';

async function parseError(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }

  return fallback;
}

export async function createShareLink(appId: string): Promise<string> {
  const snapshot = await exportAppSnapshot(appId);
  const response = await fetch('/api/shares', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(snapshot satisfies SharedAppSnapshotPayload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to create share link.'));
  }

  const payload = (await response.json()) as { sharePath?: string };
  if (!payload.sharePath) {
    throw new Error('Share link response was missing a path.');
  }

  return new URL(payload.sharePath, window.location.origin).toString();
}

export async function shareAppLink(appId: string, appName: string): Promise<'shared' | 'copied'> {
  const url = await createShareLink(appId);
  let copied = false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: appName,
        text: `Open ${appName} on buildonphone.com`,
        url,
      });
      captureAnalyticsEvent('app_shared', { appId, method: copied ? 'web_share_and_clipboard' : 'web_share' });
      return 'shared';
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') {
        throw error;
      }
    }
  }

  if (copied) {
    captureAnalyticsEvent('app_shared', { appId, method: 'clipboard' });
    return 'copied';
  }

  throw new Error('Sharing is not supported on this device.');
}

export async function fetchSharedSnapshot(shareId: string): Promise<SharedAppSnapshot> {
  const response = await fetch(`/api/shares/${shareId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load shared app.'));
  }

  return parseSharedAppSnapshot(await response.json());
}

export async function ensureImportedSharedApp(shareId: string, snapshot: SharedAppSnapshot): Promise<string> {
  const existingAppId = await getLocalSharedImport(shareId);
  if (existingAppId) {
    captureAnalyticsEvent('shared_app_reopened', { shareId, appId: existingAppId });
    return existingAppId;
  }

  const imported = await importSharedAppSnapshot(shareId, snapshot);
  captureAnalyticsEvent('shared_app_imported', { shareId, appId: imported.id });
  return imported.id;
}
