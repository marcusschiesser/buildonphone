# @buildonphone/pwa

Main Next.js app for buildonphone.

## Local Development

From the monorepo root:

```bash
npm install
npm run dev --workspace @buildonphone/pwa
```

Open `http://localhost:3000`.

## Analytics Configuration (PostHog)

Set these env vars in your deployment:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
# Optional override:
# NEXT_PUBLIC_ANALYTICS_ENABLED=1
# NEXT_PUBLIC_ANALYTICS_ENABLED=0
# optional local debugging
# NEXT_PUBLIC_POSTHOG_DEBUG=1
```

`NEXT_PUBLIC_ANALYTICS_ENABLED` behavior:
- If unset: analytics is enabled in production and disabled in non-production.
- If set to `1`: analytics is always enabled (client-side only).
- If set to `0`: analytics is always disabled.

## Validate Before Shipping

```bash
npm run lint --workspace @buildonphone/pwa
npm run typecheck --workspace @buildonphone/pwa
npm run build --workspace @buildonphone/pwa

# CI smoke flow without Anthropic key
NEXT_PUBLIC_FAKE_GENERATION=1 npm run smoke --workspace @buildonphone/pwa
```
