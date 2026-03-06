# AGENTS.md

This file is the operating guide for AI coding agents working in this monorepo.

## 1) Project Overview

- Repo: `superuser-pwa`
- Goal: Prompt-to-app PWA where users bring their own Anthropic API key (BYOK).
- Architecture: Turborepo + npm workspaces, with one active app at `apps/pwa`.

## 2) Monorepo Layout

- `apps/pwa`: Next.js App Router application (primary runtime)
- `package.json` (root): Turbo task orchestration
- `turbo.json`: pipeline for `dev`, `build`, `lint`, `typecheck`, `test`
- `package.json` workspaces: workspace package discovery

## 3) App Stack (`apps/pwa`)

- Framework: Next.js `16.1.6` (App Router)
- UI: React `19`, Tailwind CSS
- Storage: Dexie/IndexedDB
- AI SDK: `ai` + `@ai-sdk/anthropic`

## 4) Core Product Flows

- `/`: app list, delete app, navigate to create/edit/run
- `/create`: studio for prompt + generation + preview
- `/edit/[id]`: load existing app and message history into studio
- `/run/[id]`: full-screen run view using same preview component logic

## 5) Key Source Files

### Data and types
- `apps/pwa/src/types/index.ts`
- `apps/pwa/src/lib/storage/db.ts`

### BYOK key handling
- `apps/pwa/src/lib/security/byok.ts`
- `apps/pwa/src/components/byok.tsx`

### Generation
- `apps/pwa/src/lib/agent/systemPrompt.ts`
- `apps/pwa/src/lib/agent/browserAgent.ts`
- `apps/pwa/src/app/api/anthropic/messages/route.ts` (same-origin proxy to avoid browser CORS)

### Preview/run parity
- `apps/pwa/src/components/preview/index.tsx`
- `apps/pwa/src/app/run/[id]/page.tsx`

### App shell and security headers
- `apps/pwa/next.config.ts`
- `apps/pwa/src/app/layout.tsx`
- `apps/pwa/src/app/globals.css`

## 6) Critical Constraints

### BYOK security model
- Users must provide their own Anthropic key.
- Never store Anthropic keys server-side in DB/files.
- Current implementation stores encrypted payload client-side and sends key per request to `/api/anthropic/messages`.

### Browser-only safety
- Keep client code browser-compatible.
- Avoid Node-only imports/APIs in `apps/pwa/src/**`.
- ESLint rule already blocks common Node imports in app source.

### Preview/run consistency
- Reuse `PreviewFrame` for both preview and run paths.
- Do not diverge iframe sandbox/security behavior between preview and run.

## 7) Security and CSP Notes

`apps/pwa/next.config.ts` sets:
- `COOP`/`COEP`
- CSP
- referrer/content-type/permissions policies

If generated apps fail to render, check CSP + iframe sandbox first.
Current iframe sandbox in `PreviewFrame` includes:
- `allow-scripts`
- `allow-forms`
- `allow-popups`
- `allow-same-origin`

## 8) Commands

From repo root (`../superuser-pwa`):

- Install: `npm install`
- Dev (all workspaces): `npm run dev`
- Build (all workspaces): `npm run build`
- Lint (all workspaces): `npm run lint`
- Typecheck (all workspaces): `npm run typecheck`

App-only commands:
- `npm run dev --workspace @buildonphone/pwa`
- `npm run lint --workspace @buildonphone/pwa`
- `npm run typecheck --workspace @buildonphone/pwa`
- `npm run build --workspace @buildonphone/pwa`

## 9) Pre-Commit Checklist (mandatory before every commit)

Run both commands from the `apps/pwa` directory and confirm they exit with no errors:

```bash
npm run lint --workspace @buildonphone/pwa
npm run typecheck --workspace @buildonphone/pwa
```

Fix all reported errors before committing. Do **not** disable lint rules or add `// @ts-ignore` to silence errors — resolve them properly.

## 10) Development Guidelines for Agents

- Prefer targeted edits in existing files over broad rewrites.
- Preserve route/API contracts unless explicitly changing behavior.
- Keep generated-app compatibility in mind (Babel + React UMD style content in artifacts).
- If changing storage schema, add migration logic in Dexie.
- Keep user-facing error messages actionable (include upstream message when possible).
- For new or updated UI behavior, extract dedicated components and isolate pure helper functions in `src/lib/**` where practical; add unit tests for those pure functions.
- Do not extract trivial one-liner helpers into separate files; keep simple logic inline and only extract when it improves reuse, testability, or readability.
- Organize feature UI in subfolders under `apps/pwa/src/components/**` (for example `components/preview/*`) instead of growing a flat components directory.
- Use `ionicons` for product UI icons; prefer icon-only controls only when they include `aria-label` (and `title` when appropriate).
- Prefer Ionic-native layout primitives (`IonGrid`, `IonRow`, `IonCol`, Ionic spacing utilities) for responsive page/component structure before introducing custom CSS layout systems.

## 11) Common Failure Modes and Fixes

- **CORS errors to Anthropic from browser**:
  - Use `/api/anthropic/messages` proxy route, not direct `api.anthropic.com` fetch from browser.

- **"No output generated" from AI SDK**:
  - Tool-only output may still produce valid artifacts.
  - Ensure agent code treats artifact-only responses as success.

- **Preview works but run fails**:
  - Ensure `run/[id]` uses `PreviewFrame` and same sandbox settings.

- **Missing key after reload**:
  - Verify `byok.ts` localStorage path and `ByokPanel` status detection.

## 12) When Making Security Changes

- Do not tighten CSP or iframe sandbox without validating generated previews.
- If you change security headers, immediately re-test:
  - `/create` generation
  - preview render
  - `/run/[id]` render

## 13) Validation Checklist (before handoff)

Run and confirm all green:
- `npm run lint --workspace @buildonphone/pwa`
- `npm run typecheck --workspace @buildonphone/pwa`
- `npm run build --workspace @buildonphone/pwa`

Then smoke-test manually:
- Save BYOK key
- Generate app from `/create`
- Preview renders
- `/run/[id]` matches preview
- Reload app and ensure key/status persistence
