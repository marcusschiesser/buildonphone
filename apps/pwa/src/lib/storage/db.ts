import Dexie, { type Table } from 'dexie';
import type { ChatMessage, StorageAdapter, SuApp } from '@/types';
import { safeRandomId } from '@/lib/id';
import { sortChatMessages } from './chatMessageSort';

interface ArtifactRow {
  id: string;
  appId: string;
  version: number;
  filename: string;
  content: string;
  createdAt: string;
}

interface SecretRow {
  name: string;
  value: string;
  updatedAt: string;
}

class SuDb extends Dexie {
  apps!: Table<SuApp, string>;
  messages!: Table<ChatMessage, string>;
  artifacts!: Table<ArtifactRow, string>;
  secrets!: Table<SecretRow, string>;

  constructor() {
    super('buildonphone');
    this.version(1).stores({
      apps: 'id, updatedAt',
      messages: 'id, appId, createdAt',
      artifacts: 'id, appId, [appId+version], filename',
      secrets: 'name',
    });
  }
}

const db = new SuDb();

function randomId() {
  return safeRandomId('row');
}

export const localStorageAdapter: StorageAdapter = {
  async listApps() {
    return db.apps.orderBy('updatedAt').reverse().toArray();
  },

  async getApp(id) {
    return (await db.apps.get(id)) ?? null;
  },

  async createApp(app, id) {
    const now = new Date().toISOString();
    const full: SuApp = { ...app, id: id ?? randomId(), createdAt: now, updatedAt: now };
    await db.apps.put(full);
    return full;
  },

  async updateApp(id, updates) {
    const existing = await db.apps.get(id);
    if (!existing) throw new Error(`App ${id} not found`);
    const next = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await db.apps.put(next);
    return next;
  },

  async deleteApp(id) {
    await db.transaction('rw', db.apps, db.messages, db.artifacts, async () => {
      await db.apps.delete(id);
      await db.messages.where('appId').equals(id).delete();
      await db.artifacts.where('appId').equals(id).delete();
    });
  },

  async getChatHistory(appId) {
    const messages = await db.messages.where('appId').equals(appId).toArray();
    return sortChatMessages(messages);
  },

  async appendMessage(appId, msg) {
    const full: ChatMessage = {
      ...msg,
      id: randomId(),
      appId,
      createdAt: new Date().toISOString(),
    };
    await db.messages.put(full);
    return full;
  },

  async writeArtifact(appId, version, filename, content) {
    await db.artifacts.put({
      id: `${appId}-${version}-${filename}`,
      appId,
      version,
      filename,
      content,
      createdAt: new Date().toISOString(),
    });
  },

  async readArtifact(appId, version, filename) {
    const row = await db.artifacts.get(`${appId}-${version}-${filename}`);
    if (!row) throw new Error(`Artifact missing: ${filename}`);
    return row.content;
  },

  async listArtifacts(appId, version) {
    const rows = await db.artifacts.where('[appId+version]').equals([appId, version]).toArray();
    return Object.fromEntries(rows.map((r) => [r.filename, r.content]));
  },
};

export async function saveSecret(name: string, value: string) {
  await db.secrets.put({ name, value, updatedAt: new Date().toISOString() });
}

export async function getSecret(name: string) {
  return (await db.secrets.get(name))?.value ?? null;
}

export async function clearSecret(name: string) {
  await db.secrets.delete(name);
}
