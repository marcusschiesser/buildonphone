import { getSecret, localStorageAdapter, saveSecret } from '../storage/db';
import { DEFAULT_APPS_SEED_FLAG } from './defaultApps';
import { ensureDefaultAppsSeeded, ensureDefaultAppsMigrated, type DefaultAppsSeedingDeps } from './defaultAppsSeeding';
import type { SuApp } from '@/types';

export const defaultAppsSeedingDeps: DefaultAppsSeedingDeps = {
  listApps: () => localStorageAdapter.listApps(),
  createApp: (app, id) => localStorageAdapter.createApp(app, id),
  writeArtifact: (appId, version, filename, content) => localStorageAdapter.writeArtifact(appId, version, filename, content),
  appendMessage: (appId, message) => localStorageAdapter.appendMessage(appId, message),
  loadSource: async (sourcePath) => {
    const response = await fetch(sourcePath);
    if (!response.ok) {
      throw new Error(`Failed to load default app source: ${sourcePath}`);
    }
    return response.text();
  },
  getSeedFlag: () => getSecret(DEFAULT_APPS_SEED_FLAG),
  setSeedFlag: (value) => saveSecret(DEFAULT_APPS_SEED_FLAG, value),
};

let defaultAppsSeedingInFlight: Promise<SuApp[]> | null = null;

export function ensureDefaultAppsSeededClient(): Promise<SuApp[]> {
  if (defaultAppsSeedingInFlight) return defaultAppsSeedingInFlight;
  defaultAppsSeedingInFlight = ensureDefaultAppsSeeded(defaultAppsSeedingDeps).finally(() => {
    defaultAppsSeedingInFlight = null;
  });
  return defaultAppsSeedingInFlight;
}

const migrationDeps = {
  getApp: (id: string) => localStorageAdapter.getApp(id),
  writeArtifact: (appId: string, version: number, filename: string, content: string) =>
    localStorageAdapter.writeArtifact(appId, version, filename, content),
  loadSource: async (sourcePath: string) => {
    const response = await fetch(sourcePath);
    if (!response.ok) throw new Error(`Failed to load default app source: ${sourcePath}`);
    return response.text();
  },
  getMigrationFlag: (name: string) => getSecret(name),
  setMigrationFlag: (name: string, value: string) => saveSecret(name, value),
};

export function ensureDefaultAppsMigratedClient(): Promise<void> {
  return ensureDefaultAppsMigrated(migrationDeps);
}
