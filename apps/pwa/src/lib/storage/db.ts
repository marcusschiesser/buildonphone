import Dexie, { type Table } from 'dexie';
import type { ChatMessage, StorageAdapter, SuApp } from '@/types';
import { safeRandomId } from '@/lib/id';
import { sortChatMessages } from './chatMessageSort';
import type { PersistedGenerationJob } from '@/lib/generation/clientTypes';

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

interface GenerationJobRow {
  id: string;
  appId: string;
  nextVersion: number;
  appName: string;
  status: PersistedGenerationJob['status'];
  statusText: string;
  streamedText: string;
  toolCallCount: number;
  currentToolCall: string | null;
  applyState: PersistedGenerationJob['applyState'];
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

class SuDb extends Dexie {
  apps!: Table<SuApp, string>;
  messages!: Table<ChatMessage, string>;
  artifacts!: Table<ArtifactRow, string>;
  secrets!: Table<SecretRow, string>;
  generationJobs!: Table<GenerationJobRow, string>;

  constructor() {
    super('buildonphone');
    this.version(1).stores({
      apps: 'id, updatedAt',
      messages: 'id, appId, createdAt',
      artifacts: 'id, appId, [appId+version], filename',
      secrets: 'name',
    });
    this.version(2).stores({
      apps: 'id, updatedAt',
      messages: 'id, appId, createdAt',
      artifacts: 'id, appId, [appId+version], filename',
      secrets: 'name',
      generationJobs: 'id, appId, updatedAt, applyState',
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
    await db.transaction('rw', db.apps, db.messages, db.artifacts, db.generationJobs, async () => {
      await db.apps.delete(id);
      await db.messages.where('appId').equals(id).delete();
      await db.artifacts.where('appId').equals(id).delete();
      await db.generationJobs.where('appId').equals(id).delete();
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

function toPersistedGenerationJob(row: GenerationJobRow): PersistedGenerationJob {
  return {
    id: row.id,
    appId: row.appId,
    nextVersion: row.nextVersion,
    appName: row.appName,
    status: row.status,
    statusText: row.statusText,
    streamedText: row.streamedText,
    toolCallCount: row.toolCallCount,
    currentToolCall: row.currentToolCall,
    applyState: row.applyState,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function toGenerationJobRow(job: PersistedGenerationJob): GenerationJobRow {
  return {
    id: job.id,
    appId: job.appId,
    nextVersion: job.nextVersion,
    appName: job.appName,
    status: job.status,
    statusText: job.statusText,
    streamedText: job.streamedText,
    toolCallCount: job.toolCallCount,
    currentToolCall: job.currentToolCall,
    applyState: job.applyState,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
}

export function selectLatestPersistedGenerationJobs(rows: PersistedGenerationJob[]): PersistedGenerationJob[] {
  const latestByAppId = new Map<string, PersistedGenerationJob>();

  for (const row of rows) {
    const existing = latestByAppId.get(row.appId);
    if (!existing || row.updatedAt > existing.updatedAt) {
      latestByAppId.set(row.appId, row);
    }
  }

  return [...latestByAppId.values()];
}

export async function listPersistedGenerationJobs(): Promise<PersistedGenerationJob[]> {
  const rows = await db.generationJobs.toArray();
  return selectLatestPersistedGenerationJobs(rows.map(toPersistedGenerationJob));
}

export async function getPersistedGenerationJobByAppId(appId: string): Promise<PersistedGenerationJob | null> {
  const rows = await db.generationJobs.where('appId').equals(appId).toArray();
  const [latest] = selectLatestPersistedGenerationJobs(rows.map(toPersistedGenerationJob));
  return latest ?? null;
}

export async function putPersistedGenerationJob(job: PersistedGenerationJob): Promise<void> {
  await db.transaction('rw', db.generationJobs, async () => {
    await db.generationJobs.where('appId').equals(job.appId).delete();
    await db.generationJobs.put(toGenerationJobRow(job));
  });
}

export async function deletePersistedGenerationJobByAppId(appId: string): Promise<void> {
  await db.generationJobs.where('appId').equals(appId).delete();
}
