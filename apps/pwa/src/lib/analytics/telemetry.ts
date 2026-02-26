type TelemetryProps = Record<string, unknown>;

type PostHogLike = {
  init: (apiKey: string, options?: Record<string, unknown>) => void;
  capture: (event: string, properties?: TelemetryProps) => void;
  identify: (distinctId: string, properties?: TelemetryProps) => void;
  set_config?: (config: Record<string, unknown>) => void;
};

const FIRST_GENERATION_SUCCESS_KEY = 'analytics_first_generation_success_sent';
let initialized = false;
let posthogClient: PostHogLike | null = null;
let initPromise: Promise<void> | null = null;

function getAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const fromEnv = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
  if (fromEnv === '0') return false;
  if (fromEnv === '1') return true;
  return process.env.NODE_ENV === 'production';
}

function getPostHogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
}

function getPostHogKey(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || '';
}

async function ensurePostHogClient(): Promise<PostHogLike | null> {
  if (posthogClient) return posthogClient;
  if (typeof window === 'undefined') return null;
  const mod = await import('posthog-js');
  posthogClient = mod.default as unknown as PostHogLike;
  return posthogClient;
}

function hasInitializedFlag(): boolean {
  return initialized && !!posthogClient;
}

export async function initAnalytics(): Promise<void> {
  if (!getAnalyticsEnabled() || hasInitializedFlag()) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const key = getPostHogKey();
    if (!key) return;

    const client = await ensurePostHogClient();
    if (!client) return;

    client.init(key, {
      api_host: getPostHogHost(),
      autocapture: true,
      capture_pageview: false,
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: false,
        maskTextSelector: '',
      },
      loaded: (instance: PostHogLike) => {
        if (process.env.NEXT_PUBLIC_POSTHOG_DEBUG === '1') {
          instance.set_config?.({ debug: true });
        }
      },
    });

    initialized = true;
  })().finally(() => {
    initPromise = null;
  });

  return initPromise;
}

export function captureAnalyticsEvent(event: string, properties?: TelemetryProps): void {
  if (!getAnalyticsEnabled()) return;
  posthogClient?.capture(event, properties);
}

export function identifyAnalyticsUser(alias: string): void {
  if (!getAnalyticsEnabled()) return;
  const trimmed = alias.trim();
  if (!trimmed) return;
  posthogClient?.identify(trimmed, { alias: trimmed });
}

export function maybeCaptureFirstGenerationSuccess(properties?: TelemetryProps): void {
  if (typeof window === 'undefined') return;
  const existing = window.localStorage.getItem(FIRST_GENERATION_SUCCESS_KEY);
  if (existing === '1') return;
  window.localStorage.setItem(FIRST_GENERATION_SUCCESS_KEY, '1');
  captureAnalyticsEvent('first_generation_success', properties);
}
