import type { SuApp } from '@/types';
import { DEFAULT_APP_SEEDS, HABIT_TRACKER_LOCALSTORAGE_MIGRATION_FLAG, shouldSeedDefaultApps } from './defaultApps';

export interface DefaultAppsSeedingDeps {
  listApps: () => Promise<SuApp[]>;
  createApp: (app: Omit<SuApp, 'id' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<SuApp>;
  writeArtifact: (appId: string, version: number, filename: string, content: string) => Promise<void>;
  appendMessage: (appId: string, message: { appId: string; role: 'user' | 'assistant'; content: string; version: number }) => Promise<unknown>;
  loadSource: (sourcePath: string) => Promise<string>;
  getSeedFlag: () => Promise<string | null>;
  setSeedFlag: (value: string) => Promise<void>;
}

export interface DefaultAppsMigrationDeps {
  getApp: (id: string) => Promise<SuApp | null>;
  writeArtifact: (appId: string, version: number, filename: string, content: string) => Promise<void>;
  loadSource: (sourcePath: string) => Promise<string>;
  getMigrationFlag: (name: string) => Promise<string | null>;
  setMigrationFlag: (name: string, value: string) => Promise<void>;
}

export async function ensureDefaultAppsMigrated(deps: DefaultAppsMigrationDeps): Promise<void> {
  const flag = await deps.getMigrationFlag(HABIT_TRACKER_LOCALSTORAGE_MIGRATION_FLAG);
  if (flag === '1') return;

  const habitApp = await deps.getApp('default-habit-streak');
  if (habitApp) {
    const seed = DEFAULT_APP_SEEDS.find((s) => s.app.id === 'default-habit-streak');
    if (seed) {
      const newSource = await deps.loadSource(seed.sourcePath);
      await deps.writeArtifact('default-habit-streak', habitApp.currentVersion, 'app.jsx', newSource);
    }
  }

  await deps.setMigrationFlag(HABIT_TRACKER_LOCALSTORAGE_MIGRATION_FLAG, '1');
}

export async function ensureDefaultAppsSeeded(deps: DefaultAppsSeedingDeps): Promise<SuApp[]> {
  const [appsInDb, seedFlag] = await Promise.all([deps.listApps(), deps.getSeedFlag()]);
  const hasSeedFlag = seedFlag === '1';

  if (shouldSeedDefaultApps(hasSeedFlag, appsInDb.length)) {
    for (const seed of DEFAULT_APP_SEEDS) {
      const appJsx = await deps.loadSource(seed.sourcePath);
      await deps.createApp(seed.app, seed.app.id);
      await deps.writeArtifact(seed.app.id, 1, 'app.jsx', appJsx);
      await deps.appendMessage(seed.app.id, {
        appId: seed.app.id,
        role: 'user',
        content: seed.userMessage,
        version: 1,
      });
      await deps.appendMessage(seed.app.id, {
        appId: seed.app.id,
        role: 'assistant',
        content: seed.assistantMessage,
        version: 1,
      });
    }
    await deps.setSeedFlag('1');
  }

  return deps.listApps();
}
