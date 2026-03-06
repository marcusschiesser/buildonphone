import type { ChatMessage, SuApp } from '@/types';

export interface SharedAppSnapshotMessage extends Pick<ChatMessage, 'role' | 'content' | 'createdAt'> {
  version?: number;
}

export type SharedAppSnapshotApp = Pick<SuApp, 'name' | 'description' | 'icon' | 'theme' | 'currentVersion'>;

export interface SharedAppSnapshotPayload {
  app: SharedAppSnapshotApp;
  messages: SharedAppSnapshotMessage[];
  artifacts: Record<string, string>;
}

export interface SharedAppSnapshot extends SharedAppSnapshotPayload {
  id: string;
  createdAt: string;
  creatorUserId?: string;
}
