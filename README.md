# claw2go

Built for the Thumb-First Developer. Powered by [edge-pi](https://github.com/marcusschiesser/edge-pi).

Claw2go is a mobile app generator running on your phone. You provide a prompt and your own Anthropic API key, and the app generates a React app (`app.jsx`) that runs inside a secure iframe preview/runtime. 

## Monorepo Structure

- `apps/pwa`: main Next.js app (`@claw2go/pwa`)
- `AGENTS.md`: operating guide for coding agents
- `turbo.json`: Turborepo task pipeline

## Tech Stack

- Next.js App Router
- React + Tailwind CSS
- Turborepo
- npm workspaces
- Dexie (IndexedDB)
- AI SDK + Anthropic (BYOK)
- edge-pi runtime integration

## Getting Started

Prerequisites:

- Node.js 24+
- npm 11+

Install dependencies:

```bash
npm install
```

Run all workspaces in dev mode:

```bash
npm run dev
```

Run only the PWA:

```bash
npm run dev --workspace @claw2go/pwa
```

Open `http://localhost:3000`.

## Common Commands

From repo root:

```bash
npm run build
npm run lint
npm run typecheck
npm run test
```

App-only:

```bash
npm run build --workspace @claw2go/pwa
npm run lint --workspace @claw2go/pwa
npm run typecheck --workspace @claw2go/pwa
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | Server-managed Anthropic key. When set, the in-app BYOK panel is hidden and all requests use this key automatically. |
| `APP_PASSWORD` | Optional | Shared password to protect the hosted instance. Only active when `ANTHROPIC_API_KEY` is also set. Users must enter this password once; a 30-day cookie is then issued. |

For local development, create `apps/pwa/.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

On Vercel, add it under **Project → Settings → Environment Variables**.

## Deploying to Vercel

`apps/pwa/vercel.json` is the source of truth for reproducible Vercel builds:

- `framework: "nextjs"`
- `installCommand: "npm install"`
- `buildCommand: "npm run build"`

Deploy from `apps/pwa`:

```bash
vercel --prod
```
