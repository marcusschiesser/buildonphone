import posthog from 'posthog-js';

type TelemetryProps = Record<string, unknown>;

const FIRST_GENERATION_SUCCESS_KEY = 'analytics_first_generation_success_sent';

export function captureAnalyticsEvent(event: string, properties?: TelemetryProps): void {
  posthog.capture(event, properties);
}

export function identifyAnalyticsUser(distinctId: string, properties?: TelemetryProps): void {
  const trimmed = distinctId.trim();
  if (!trimmed) return;
  posthog.identify(trimmed, properties);
}

export function resetAnalyticsUser(): void {
  posthog.reset();
}

export function maybeCaptureFirstGenerationSuccess(properties?: TelemetryProps): void {
  if (typeof window === 'undefined') return;
  const existing = window.localStorage.getItem(FIRST_GENERATION_SUCCESS_KEY);
  if (existing === '1') return;
  window.localStorage.setItem(FIRST_GENERATION_SUCCESS_KEY, '1');
  posthog.capture('first_generation_success', properties);
}
