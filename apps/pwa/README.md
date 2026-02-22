# @claw2go/pwa

Main Next.js app for Claw2go.

## Local Development

From the monorepo root:

```bash
npm install
npm run dev --workspace @claw2go/pwa
```

Open `http://localhost:3000`.

## Validate Before Shipping

```bash
npm run lint --workspace @claw2go/pwa
npm run typecheck --workspace @claw2go/pwa
npm run build --workspace @claw2go/pwa

# CI smoke flow without Anthropic key
NEXT_PUBLIC_FAKE_GENERATION=1 npm run smoke --workspace @claw2go/pwa
```
