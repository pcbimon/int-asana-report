This repository is a Next.js 13 (App Router) + TypeScript web app that syncs data from Asana into a Postgres DB via Prisma and presents reports using shadcn/Tailwind UI components.

Keep guidance short and concrete — focus on what a coding assistant needs to be productive immediately.

- Big picture
  - Next.js App Router lives under `app/`. Pages are server components by default. Client components explicitly use the "use client" directive (see `components/*` which are mostly client components like `WeeklySummaryChart.tsx`).
  - Data flow: Asana API -> lib/ (sync helpers) -> Prisma -> UI. Prisma schema: `prisma/schema.prisma`. Generated client output: `generated/prisma` (import `@prisma/client` / generated client files).
  - UI uses shadcn-style primitives under `components/ui/*` (cards, table, popover, command). Follow the existing component composition and CSS class patterns (Tailwind + `cn` helper in `lib/utils.ts`).

- Important files to reference
  - `prisma/schema.prisma` — canonical DB model; used by any sync/migration logic.
  - `generated/prisma` — where Prisma client is generated. Code imports the client from `@prisma/client` and runtime files are present in `generated/prisma`.
  - `components/` — UI building blocks. Examples: `AdminSection.tsx`, `CurrentTasksTable.tsx`, `SummaryMatricCard.tsx`, `WeeklySummaryChart.tsx`.
  - `lib/utils.ts` — small helpers (e.g., `cn` wrapper for Tailwind utilities) used across components.
  - `app/dashboard/[assignee-gid]/page.tsx` — main report route (dynamic segment for assignee GID); check this to understand how data is fetched and rendered.

- Developer workflows & commands
  - Run locally: use the scripts in `package.json`. Common commands: `pnpm install` (preferred by lockfile), `pnpm dev` or `pnpm run dev` / `npm run dev` to start Next.js (package.json defines `dev` -> `next dev --turbopack`).
  - Build: `pnpm build` (or `npm run build`). Start: `pnpm start`.
  - Prisma: treat `prisma/schema.prisma` as source of truth. Use `npx prisma generate` when changing schema (client output is `generated/prisma`).
  - Environment: sensitive values (DATABASE_URL, ASANA_TOKEN, ASANA_PROJECT_ID, etc.) belong in `.env.local`. The repo contains an example `.env` for local debugging; DO NOT commit secrets — prefer `.env.local`.

- Project-specific conventions
  - UI: use shadcn primitives in `components/ui/*`. Components prefer composition (Card, CardHeader, CardContent) and expressive Tailwind classes; use `cn` for merging classes.
  - Client vs server: assume components without "use client" are server components. If a component uses browser-only libs (ReactECharts, icons, local state), it must include "use client" at top (see `WeeklySummaryChart.tsx`, `AdminSection.tsx`).
  - Pagination / tables: the `CurrentTasksTable.tsx` demonstrates the table + pagination pattern used across the app — follow its data shape for server responses (rows array, total count, page size).
  - Sync behavior: README documents a destructive-but-simple sync: sync clears target tables and reimports Asana pages in batches; follow `sync_metadata` usage to track last sync (see `prisma/schema.prisma`).

- External integrations & constraints
  - Asana API: base URL from `ASANA_BASE_URL`, token in `ASANA_TOKEN`. Calls use Axios and must handle rate-limits (429) and backoff; README documents `ASANA_RATE_LIMIT` and batching strategy.
  - Database: PostgreSQL (recommended v17). Prisma expects `DATABASE_URL` env var.
  - E2E tests: README references Playwright E2E under `tests/e2e/` and `pnpm run test:e2e`. If missing, double-check test scripts before running.

- Examples to follow when editing code
  - To add a client component that renders charts, copy `WeeklySummaryChart.tsx` pattern: `"use client"` + import browser-only libs + wrap in `Card`.
  - To change DB models: update `prisma/schema.prisma`, run `npx prisma migrate dev` or `prisma generate` as appropriate, and regenerate client into `generated/prisma`.
  - To add a new API route or server action, prefer App Router server components or `app/api/*` route handlers that return JSON and use the Prisma client from `generated/prisma`.

- When in doubt
  - Inspect `app/dashboard/[assignee-gid]/page.tsx` and the components it imports to see the expected props shape and rendering flow.
  - Prefer small, incremental changes. Keep UI pieces consistent with `components/ui/*` primitives and Tailwind class patterns.

If anything here is unclear or you'd like more examples (API helpers, sync implementation, or test scripts), tell me which area and I'll expand with exact code pointers.
