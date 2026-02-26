import posthog from 'posthog-js';

let initialized = false;

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_TOKEN;

if (!initialized && key) {
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30',
    autocapture: true,
    capture_pageview: false,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: false,
      maskTextSelector: '',
    },
  });
  if (process.env.NEXT_PUBLIC_POSTHOG_DEBUG === '1') {
    posthog.set_config({ debug: true });
  }
  initialized = true;
}
