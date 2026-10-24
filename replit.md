# Sushruth — AI Healthcare Assistant

An AI-powered healthcare assistant web app built for India. Helps users triage symptoms, simplify medical reports, book doctor appointments, track medications, manage health records, and monitor preventive health — all in one place.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind v4 + shadcn/ui
- Auth: Clerk v6 (`@clerk/react@6.6.6`, `@clerk/shared@4.12.2`)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI `gpt-4o-mini` via Replit AI integrations (`@workspace/integrations-openai-ai-server`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/sushruth/` — React/Vite frontend
  - `src/pages/` — all page components (triage, appointments, medications, reports, tracker, health-records, care-circle, dashboard, landing)
  - `src/components/layout/AppLayout.tsx` — sidebar nav with accessibility features
  - `src/hooks/useMedicationReminders.ts` — browser push notification hook for medication reminders
  - `src/hooks/useKeyboardNav.ts` — global Ctrl+Esc keyboard shortcut hook
- `artifacts/api-server/src/routes/` — Express routes (triage, appointments, openai, reports, tracker, medications, healthRecords, careCircle)
- `lib/db/src/schema/` — Drizzle ORM schema (source of truth)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod schemas. Run codegen after any spec change.
- Clerk v6 uses `Show` component (`when="signed-in"` / `when="signed-out"`) instead of the removed `SignedIn`/`SignedOut` components.
- `@clerk/shared` must be overridden to `^4.12.2` in `pnpm-workspace.yaml` for Clerk v6 to work.
- Vite's `.vite/` dep cache must be cleared when upgrading Clerk versions.
- AI triage uses `gpt-4o-mini` and returns structured JSON: urgencyLevel, specialistRecommended, careSuggestion, aiSummary.

## Product features

- **AI Symptom Triage** — Describe symptoms via text or voice (multilingual: English, Hindi, Bengali, Assamese, Manipuri). AI categorizes urgency as Low / Moderate / High / Emergency and recommends a specialist. App does NOT diagnose — only triages.
- **Google Maps integration** — "Map" links on every doctor card open Google Maps. "Near Me" / "Find nearby" buttons use browser Geolocation to search for hospitals/specialists near the user.
- **Medication reminders** — Browser push notifications at scheduled medication times. "Reminders On/Off" toggle requests notification permission and persists choice in localStorage.
- **Medical report simplification** — Upload or describe reports; AI explains them in plain language.
- **Appointment booking** — Browse and filter doctors by specialty and city; book slots.
- **Health records** — Past surgeries, conditions, allergies, family history.
- **Preventive health tracker** — Log vitals, get AI analysis.
- **Care circle** — Add family members / caregivers.
- **Accessibility** — Skip-to-content link, ARIA landmarks, `aria-live` regions for screen readers, `aria-label` on all controls, keyboard navigation: Tab/Shift+Tab navigates, Ctrl+Esc jumps to nav sidebar, Esc closes dialogs. Keyboard shortcuts panel in sidebar.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After upgrading Clerk, delete `artifacts/sushruth/.vite/` to clear Vite's dep cache, then restart the workflow.
- The workspace override `"@clerk/react": "^6.6.6"` in `pnpm-workspace.yaml` `overrides` section ensures only v6 is resolved.
- All TanStack Query v5 hooks with `enabled` flags use `{ query: { enabled: !!userId } as any }` to bypass the `queryKey` type requirement.
- API model name is `gpt-4o-mini` (not `gpt-5-mini` or `gpt-4-mini`).
- Do NOT use `confirm()` dialogs in production — replace with proper modal confirmations.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec lives in `lib/api-spec/openapi.yaml`
