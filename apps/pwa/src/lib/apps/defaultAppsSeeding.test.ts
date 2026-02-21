import { describe, expect, it, vi } from 'vitest';
import type { SuApp } from '@/types';
import { DEFAULT_APP_SEEDS } from './defaultApps';
import { ensureDefaultAppsSeeded, type DefaultAppsSeedingDeps } from './defaultAppsSeeding';

const baseApp: SuApp = {
  id: 'a1',
  name: 'Existing',
  description: '',
  icon: '',
  theme: '',
  currentVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createDeps(overrides?: Partial<DefaultAppsSeedingDeps>): DefaultAppsSeedingDeps {
  return {
    listApps: async () => [],
    createApp: async () => baseApp,
    writeArtifact: async () => undefined,
    appendMessage: async () => undefined,
    loadSource: async () => "ReactDOM.createRoot(document.getElementById('preview-root')).render(<App />);",
    getSeedFlag: async () => null,
    setSeedFlag: async () => undefined,
    ...overrides,
  };
}

describe('defaultAppsSeeding', () => {
  it('seeds starter apps for empty first-time stores', async () => {
    const createApp = vi.fn(async () => baseApp);
    const writeArtifact = vi.fn(async () => undefined);
    const appendMessage = vi.fn(async () => undefined);
    const loadSource = vi.fn(async () => "ReactDOM.createRoot(document.getElementById('preview-root')).render(<App />);");
    const setSeedFlag = vi.fn(async () => undefined);
    const listApps = vi
      .fn<() => Promise<SuApp[]>>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([baseApp, { ...baseApp, id: 'a2' }, { ...baseApp, id: 'a3' }]);

    const result = await ensureDefaultAppsSeeded(
      createDeps({
        listApps,
        createApp,
        writeArtifact,
        appendMessage,
        loadSource,
        setSeedFlag,
        getSeedFlag: async () => null,
      }),
    );

    expect(createApp).toHaveBeenCalledTimes(DEFAULT_APP_SEEDS.length);
    expect(loadSource).toHaveBeenCalledTimes(DEFAULT_APP_SEEDS.length);
    expect(writeArtifact).toHaveBeenCalledTimes(DEFAULT_APP_SEEDS.length);
    expect(appendMessage).toHaveBeenCalledTimes(DEFAULT_APP_SEEDS.length * 2);
    expect(setSeedFlag).toHaveBeenCalledWith('1');
    expect(result).toHaveLength(3);
  });

  it('does not seed when apps already exist', async () => {
    const createApp = vi.fn(async () => baseApp);
    const writeArtifact = vi.fn(async () => undefined);
    const appendMessage = vi.fn(async () => undefined);
    const loadSource = vi.fn(async () => "ReactDOM.createRoot(document.getElementById('preview-root')).render(<App />);");
    const setSeedFlag = vi.fn(async () => undefined);

    const result = await ensureDefaultAppsSeeded(
      createDeps({
        listApps: async () => [baseApp],
        createApp,
        writeArtifact,
        appendMessage,
        loadSource,
        setSeedFlag,
      }),
    );

    expect(createApp).not.toHaveBeenCalled();
    expect(loadSource).not.toHaveBeenCalled();
    expect(writeArtifact).not.toHaveBeenCalled();
    expect(appendMessage).not.toHaveBeenCalled();
    expect(setSeedFlag).not.toHaveBeenCalled();
    expect(result).toEqual([baseApp]);
  });
});
