import { beforeEach, describe, expect, it, vi } from 'vitest';

const capture = vi.fn();
const identify = vi.fn();
const reset = vi.fn();

vi.mock('posthog-js', () => ({
  default: {
    capture,
    identify,
    reset,
  },
}));

describe('telemetry', () => {
  beforeEach(() => {
    capture.mockReset();
    identify.mockReset();
    reset.mockReset();
    vi.resetModules();
  });

  it('identifies analytics users by trimmed distinct id', async () => {
    const { identifyAnalyticsUser } = await import('./telemetry');

    identifyAnalyticsUser('  user_123  ', { plan: 'pro' });

    expect(identify).toHaveBeenCalledWith('user_123', { plan: 'pro' });
  });

  it('ignores empty distinct ids', async () => {
    const { identifyAnalyticsUser } = await import('./telemetry');

    identifyAnalyticsUser('   ');

    expect(identify).not.toHaveBeenCalled();
  });

  it('resets analytics user state', async () => {
    const { resetAnalyticsUser } = await import('./telemetry');

    resetAnalyticsUser();

    expect(reset).toHaveBeenCalledTimes(1);
  });
});
