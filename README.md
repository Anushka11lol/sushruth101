# Sushruth — AI Healthcare Assistant

An AI-powered healthcare assistant web app built for India. Helps users triage symptoms, simplify medical reports, book doctor appointments, track medications, manage health records, and monitor preventive health — all in one place.

---

## Features

- **AI Symptom Triage** — Describe symptoms via text or voice. AI categorises urgency as Low / Moderate / High / Emergency and recommends a specialist. The app does NOT diagnose — only triages.
- **Multilingual support** — English, Hindi, Bengali, Assamese, Tamil, Telugu, Kannada, Malayalam, Gujarati, Marathi, Punjabi, Odia, Urdu, and more.
- **Medical report simplification** — Upload or describe reports; AI explains them in plain language.
- **Appointment booking** — Browse and filter doctors by specialty and city; book slots.
- **Medication reminders** — Browser push notifications at scheduled medication times.
- **Health records** — Past surgeries, conditions, allergies, and family history.
- **Preventive health tracker** — Log vitals and get AI analysis.
- **Care circle** — Add family members or caregivers.
- **Google Maps integration** — Find nearby clinics, hospitals, and specialist centres.
- **Accessibility** — Skip-to-content, ARIA landmarks, screen reader narration, keyboard navigation (Tab, Ctrl+Esc, number shortcuts 1–9).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.9 (frontend + backend) |
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui |
| Backend | Node.js 24, Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Clerk v6 |
| AI (triage + reports) | OpenAI `gpt-4o-mini` |
| AI (image analysis) | Anthropic Claude |
| Package manager | pnpm workspaces |
| API contracts | OpenAPI spec + Orval codegen |
| Validation | Zod |

---

## Project Structure

```
sushruth/
├── artifacts/
│   ├── sushruth/          # React/Vite frontend
│   │   └── src/
│   │       ├── pages/     # All page components
│   │       ├── components/# UI components + layout
│   │       ├── hooks/     # Custom React hooks
│   │       ├── context/   # Language + screen reader context
│   │       └── lib/       # Translations, utilities
│   └── api-server/        # Express backend
│       └── src/
│           ├── routes/    # API route handlers
│           ├── middlewares/
│           └── lib/       # Logger
└── lib/                   # Shared libraries
    ├── db/                # Drizzle ORM schema (source of truth)
    ├── api-spec/          # OpenAPI spec (source of truth)
    ├── api-client-react/  # Generated React Query hooks
    ├── api-zod/           # Generated Zod schemas
    ├── integrations-openai-ai-server/   # OpenAI client (backend)
    ├── integrations-openai-ai-react/    # OpenAI audio utils (frontend)
    └── integrations-anthropic-ai/       # Anthropic client (backend)
```

---

## Frontend Files

| Category | Path |
|---|---|
| Entry points | `artifacts/sushruth/src/main.tsx`, `App.tsx` |
| Pages | `pages/triage.tsx`, `appointments.tsx`, `medications.tsx`, `reports.tsx`, `tracker.tsx`, `health-records.tsx`, `care-circle.tsx`, `dashboard.tsx`, `settings.tsx`, `landing.tsx`, `privacy-emergency.tsx` |
| Onboarding | `pages/onboarding/language-select.tsx`, `health-questions.tsx` |
| Layout | `components/layout/AppLayout.tsx` |
| UI components | `components/ui/` (40+ shadcn/ui components) |
| Hooks | `useKeyboardNav`, `useMedicationReminders`, `useNavShortcuts`, `useSpeakOnInteraction`, `useDisplayName` |
| Context | `LanguageContext.tsx`, `ScreenReaderContext.tsx` |

## Backend Files

| Category | Path |
|---|---|
| Server setup | `artifacts/api-server/src/index.ts`, `app.ts` |
| Routes | `triage.ts`, `appointments.ts`, `medications.ts`, `reports.ts`, `tracker.ts`, `healthRecords.ts`, `careCircle.ts`, `profile.ts`, `openai.ts`, `emergencyAccess.ts` |
| Middleware | `middlewares/clerkProxyMiddleware.ts` |

---

## Database Schema (`lib/db/src/schema/`)

| Table | Purpose |
|---|---|
| `users` | User accounts |
| `profile` | User profile and health preferences |
| `triage` | AI triage sessions |
| `appointments` | Doctor appointments |
| `medications` | Medication schedule |
| `reports` | Uploaded medical reports |
| `tracker` | Vitals and health logs |
| `careCircle` | Family members / caregivers |

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session signing secret |

### Running Locally

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Start the backend API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Start the frontend (in a separate terminal)
pnpm --filter @workspace/sushruth run dev
```

### Other Useful Commands

```bash
# Full typecheck across all packages
pnpm run typecheck

# Regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Build all packages
pnpm run build
```

---

## API Overview

All API routes are served under `/api/` and defined in `lib/api-spec/openapi.yaml`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/triage` | Submit symptoms for AI triage |
| GET | `/api/triage` | List past triage sessions |
| GET/POST | `/api/appointments` | Manage doctor appointments |
| GET/POST | `/api/medications` | Manage medications |
| GET/POST | `/api/reports` | Upload and simplify medical reports |
| GET/POST | `/api/tracker` | Log and retrieve vitals |
| GET/POST | `/api/health-records` | Manage health records |
| GET/POST | `/api/care-circle` | Manage care circle members |
| GET/PUT | `/api/profile` | User profile management |

---

## Architecture Notes

- **Contract-first API**: The OpenAPI spec is the single source of truth. Run `pnpm --filter @workspace/api-spec run codegen` after any spec change to regenerate typed React Query hooks and Zod schemas.
- **Shared proxy routing**: A reverse proxy routes `/api/*` to the backend and everything else to the frontend — no CORS config needed.
- **Input validation**: All triage input is validated by the AI before processing. Non-medical or gibberish input is rejected with a 422 response.
- **Clerk v6 auth**: Uses the `Show` component (`when="signed-in"` / `when="signed-out"`).

---

## License

Private — all rights reserved.
