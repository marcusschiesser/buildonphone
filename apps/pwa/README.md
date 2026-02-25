# @buildonphone/pwa

Main Next.js app for buildonphone.

## Local Development

From the monorepo root:

```bash
npm install
npm run dev --workspace @buildonphone/pwa
```

Open `http://localhost:3000`.

## Validate Before Shipping

```bash
npm run lint --workspace @buildonphone/pwa
npm run typecheck --workspace @buildonphone/pwa
npm run build --workspace @buildonphone/pwa

# CI smoke flow without Anthropic key
NEXT_PUBLIC_FAKE_GENERATION=1 npm run smoke --workspace @buildonphone/pwa
```
