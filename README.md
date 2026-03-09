# buildonphone

Built for the Thumb-First Developer. Powered by [edge-pi](https://github.com/marcusschiesser/edge-pi).

buildonphone is a mobile app generator running on your phone. You provide a prompt and your own Anthropic API key, and the app generates a React app (`app.jsx`) that runs inside a secure iframe preview/runtime. 

## Repo Structure

This repo currently ships a single app package: `@buildonphone/pwa` in `apps/pwa`.

- `apps/pwa`: Next.js app
- `AGENTS.md`: operating guide for coding agents
- `turbo.json`: task pipeline

## Tech Stack

- Next.js App Router
- React + Tailwind CSS
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

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Common Commands

Run everything from the repo root. These commands target the single app package in this repo:

```bash
npm run build
npm run lint
npm run typecheck
npm run test
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | Server-managed Anthropic key. When set, the in-app BYOK panel is hidden and all requests use this key automatically. |

For local development, create `apps/pwa/.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

On Vercel, add it under **Project → Settings → Environment Variables**.

## Deploying to Vercel

Deploy from the repo root:

```bash
vercel --cwd apps/pwa --prod
```
