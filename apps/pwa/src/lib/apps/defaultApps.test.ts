import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SEEDS, shouldSeedDefaultApps } from './defaultApps';

describe('defaultApps', () => {
  it('contains exactly three stable starter apps', () => {
    expect(DEFAULT_APP_SEEDS).toHaveLength(3);
    expect(DEFAULT_APP_SEEDS.map((seed) => seed.app.id)).toEqual([
      'default-trip-planner',
      'default-snap-caption',
      'default-habit-streak',
    ]);
  });

  it('marks all starter apps as default and version 1', () => {
    for (const seed of DEFAULT_APP_SEEDS) {
      expect(seed.app.isDefault).toBe(true);
      expect(seed.app.currentVersion).toBe(1);
      expect(seed.sourcePath).toMatch(/^\/default-apps\/.+\.jsx$/);
    }
  });

  it('seeds only for first-time empty installs', () => {
    expect(shouldSeedDefaultApps(false, 0)).toBe(true);
    expect(shouldSeedDefaultApps(true, 0)).toBe(false);
    expect(shouldSeedDefaultApps(false, 2)).toBe(false);
    expect(shouldSeedDefaultApps(true, 2)).toBe(false);
  });
});
