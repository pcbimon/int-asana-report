# Copilot Instructions for Individual Dashboard (Next.js + TypeScript + ECharts)

Purpose
- Implement an Individual Dashboard to analyze per-assignee work from Asana Project data.
- Tech stack: Next.js (TypeScript), ECharts, Shadcn, Tailwind CSS. Database using Supabase.

Repository layout (recommended)
- /src
  - /components
    - Header.tsx
    - KpiCards.tsx
    - WeeklySummaryChart.tsx
    - CurrentTasksTable.tsx
    - FiltersPanel.tsx
    - ExportButtons.tsx
  - /lib
    - asanaApi.ts
    - dataProcessor.ts
    - storage.ts
  - /models
    - asanaReport.ts
  - /pages
    - /dashboard/[assignee].tsx
    - /sync.tsx
    - /auth
      - login.tsx
      - logout.tsx
      - invite.tsx
      - forgot-password.tsx
    - /404.tsx
  - /styles
    - tailwind.css

Data model (TypeScript)
- class AsanaReport { sections: Section[]; }
- class Section { gid: string; name: string; tasks: Task[]; }
- class Task { gid: string; name: string; assignee?: Assignee; completed: boolean; completed_at?: string; subtasks?: Subtask[]; due_on?: string; project?: string; }
- class Assignee { gid: string; name: string; email?: string; }
- class Subtask { gid: string; name: string; assignee?: Assignee; completed: boolean; created_at?: string; completed_at?: string; }

Asana API helpers (/lib/asanaApi.ts)
- fetchSections(): GET {{BASE_URL}}/projects/{{PROJECT_ID}}/sections
- fetchTasksInSection(sectionGid): GET {{BASE_URL}}/sections/{{sectionGid}}/tasks?opt_fields=name,assignee,completed,completed_at,due_on,projects,custom_fields
- fetchSubtasks(taskGid): GET {{BASE_URL}}/tasks/{{taskGid}}/subtasks?opt_fields=name,assignee,completed,created_at,completed_at
- Use Authorization: Bearer {{TOKEN}}. Retry + backoff and handle rate limits.

Data processing (/lib/dataProcessor.ts)
- Merge sections -> tasks -> subtasks into AsanaReport instance.
- Normalize assignees (map by gid).
- Compute derived fields per task: overdue (due_on < today && not completed), lead time (completed_at - created_at).
- Produce per-assignee aggregates: total, completed, overdue, avgTime, weekly timeseries.
- Short description: Calculate all metrics (total, completed, overdue, avgTime, weekly timeseries, etc.) from Subtask entries only — do not use Task data directly to compute results, except when showing a Task's "created week" purely for display.
- Reason: Tasks are treated as the week they were created for display/grouping, but the actual work metrics (work done/completed/overdue/lead time) come from Subtasks, which are the real work units.
- Mapping rules:
  - Every subtask is the primary unit for aggregates and timeseries.
  - If subtask.assignee is missing, ignore that subtask.
  - completed / completed_at / created_at are always taken from the subtask when calculating lead time, overdue, and weekly buckets.
- Task-level created-week display:
  - Ignore subtask.created_at for the Task-level "created week" display; however, use subtask.created_at, subtask.completed_at, and subtask.assignee for all metric calculations.
- Table display of tasks:
  - Show subtasks grouped by their section.
  - For each subtask, show its created week (from subtask.created_at), assignee (from subtask.assignee), due date (from subtask.due_on), and status (from subtask.completed).
  - Do not use subtask data to determine the Task's created week or assignee for display purposes.
- Convert timestamps:
  - Convert all timestamps to ISO (UTC) before computing or grouping by week to reduce timezone issues.
  - If mixed metrics (Task + Subtask) are needed, expose a flag/option to preserve the current behavior.
- Usage examples:
  - weeklyTimeseries.assigned = count subtask.created_at by the week of created_at (or by assigned date if present)
  - weeklyTimeseries.completed = count subtask.completed_at by the week of completed_at
  - avgTime = average (subtask.completed_at - subtask.created_at) per assignee

Storage and sync (/lib/storage.ts)
- This file describes storing data from Asana into Supabase using a "1 Class Model = 1 Table" approach and includes a special table `sync_metadata` to store the `updated_at` of the last sync.
- Recommended schema:
  - assignees(gid TEXT PK, name TEXT, email TEXT)
  - sections(gid TEXT PK, name TEXT)
  - tasks(gid TEXT PK, name TEXT, section_gid TEXT, assignee_gid TEXT, completed BOOLEAN, completed_at TIMESTAMP, due_on DATE, project TEXT, created_at TIMESTAMP)
  - subtasks(gid TEXT PK, name TEXT, parent_task_gid TEXT, assignee_gid TEXT, completed BOOLEAN, created_at TIMESTAMP, completed_at TIMESTAMP)
  - sync_metadata(key TEXT PK, updated_at TIMESTAMP)
  - user_roles(uid UUID PK, role TEXT) // for auth roles
  - user_assignees(uid UUID PK, assignee_gid TEXT) // map user to assignee
- Roles:
  - admin: full access to all data and sync and can view all assignees by default
  - user: read-only access to their own assignee data
- Use Supabase client with `SUPABASE_SERVICE_ROLE_KEY` for full access (server-side only).
- Use upsert for save/update operations.
- Main functions in the file:
  - saveReport(report, metadataKey): save/update assignees, sections, tasks, subtasks (use upsert) and then update `sync_metadata.updated_at`
  - loadReport(): read all tables, join relationships (assignee maps, task -> subtasks, tasks -> sections) and return an AsanaReport
  - getLastUpdated / setLastUpdated: read/write the timestamp in `sync_metadata`
- Gotchas / cautions:
  - Use ISO format for time strings (new Date().toISOString()) for consistency
  - Send optional fields as `null` in payload so upsert behaves as expected
  - Current code does not use transactions; for atomicity consider Postgres transactions / RPC
  - Verify permissions for `SUPABASE_KEY` — keep it server-side only
- Short recommendations:
  - Add error handling and return upsert results to verify success
  - Create indexes on foreign keys (section_gid, parent_task_gid, assignee_gid) to improve query performance
  - For large datasets consider batch upsert or pagination

Pages & routing
- /dashboard/[assignee] — server-side render minimal skeleton; fetch from Supabase data on server-side and hydrate charts.
- Authentication: protect route with middleware (JWT/session). On auth success, show only data for authenticated assignee and must create login link from https://supabase.com/docs/guides/auth/server-side/nextjs?queryGroups=router&router=app
- /sync — trigger data fetch from Asana, process, and save to Supabase. Show last sync time and status.
- /Auth/login — simple login form (use env vars for test user).
- /Auth/logout — clear session and redirect to login.
- 404 page for unknown assignees.
- /auth/invite#access_token=... for create new user to access dashboard. validate token and create user password from `supabase` invite user by email and redirect to login. super admin can invite user from supabase dashboard.
- /auth/forgot-password for reset password form. send reset email from supabase auth.

UI & Components
- Header: assignee name, export buttons.
- KpiCards: total tasks, completed, completion rate, overdue, avg time.
- Charts: use ECharts React wrapper, responsive. Provide props for data, color theme, tooltip, legend.
  - Weekly Line: tasks assigned vs completed per week; overlay Expected completion tasks line.
- CurrentTasksTable: columns: Task, Project/Section, Due date, Status, Priority. Support sort, filter, search, pagination.
- FiltersPanel: time-range, project, status. Persist filters in URL query params.
Note : Expected completion tasks is single line from constant by env var NEXT_EXPECTED_COMPLETION_TASKS (e.g. 3 tasks per week).

Export & Print
- Export to PDF: render printable page and use window.print() or html2pdf.
- Export to Excel: generate CSV/XLSX from current filtered data (SheetJS).

Styling
- Tailwind CSS for responsive layout and use `Shadcn` as Main UI components. Ensure accessible from desktop and mobile.

Testing & quality
- Unit tests for dataProcessor functions (Jest).
- Integration tests for API helpers (msw to mock Asana).
- Linting: ESLint + Prettier. Type-check CI step.

Environment & setup
Note: If you've already added your environment secrets in your deployment/provider (for example Vercel, Netlify, or your CI), do NOT create a local .env.local that contains sensitive tokens. Read env keys from the provider-managed environment instead and access them server-side.

1. Environment variables (use server-side secrets)
   - Suggested server-only variable names (do NOT prefix with NEXT_PUBLIC_ for secrets):
     - ASANA_BASE_URL=https://app.asana.com/api/1.0
     - ASANA_TOKEN=your_pat_here
     - ASANA_PROJECT_ID=your_project_id
     - ASANA_TEAM_ID=your_team_id
   - How to use: read these with `process.env.ASANA_TOKEN` etc. from Next.js API routes or server components. Avoid shipping `ASANA_TOKEN` to the client; proxy Asana requests through an API route that uses the server env.

2. If you must expose non-sensitive values to the client, use a non-secret variable prefixed with `NEXT_PUBLIC_` (only for public, non-sensitive values). Prefer exposing data through an API route instead of exposing tokens.

3. Install: using yarn as package manager
  - yarn install
  - yarn add echarts echarts-for-react tailwindcss axios dayjs js-cookie xlsx html2canvas jspdf shadcn
  - yarn add supabase @supabase/supabase-js

4. Tailwind init:
  - yarn tailwindcss init -p # หรือ npx tailwindcss init -p, แล้ว configure content paths.

5. Run:
  - yarn dev

6. Build:
  - yarn build && yarn start
7. Login Page:
  - use existing user and password from ENV key ADMIN_USER and ADMIN_PWD for authentication and test inside the application.

Performance considerations
- All API calls should be optimized for performance.
- All Data proocessing must be in server side only.
- Paginate API calls if many subtasks.
- Debounce filter/search operations.
- Cache computed aggregates to avoid reprocessing on UI-only changes.
- if no data in supabase, show message to sync data from asana and link to /sync page.
- sync page should show last sync time and status. and sync process should be server-side only. and can be parallel requests for each section,tasks,subtasks to asana api to speed up.

Security
- Do not expose PAT in client builds. Prefer server-side proxy or Next.js API routes that read PAT from server env and proxy requests. If PAT is client-side, limit scope and rotate regularly.

Deployment
- Vercel or any Node host. Keep secrets in provider env settings. Enable HTTPS.

Maintenance
- Provide a cron or webhook-based refresh to keep Local Storage sync up to date. E.g. a Next.js API route /api/sync that triggers data fetch and processing, called periodically (e.g. daily) via an external cron job or Vercel cron. need to create sql for supabase to enable cron job.
- Document rate limit behavior and error handling.

Notes
- Prioritize server-side proxy for sensitive tokens.
- Start with core pages (Header, KpiCards, WeeklySummaryChart, CurrentTasksTable), then add advanced charts and exports iteratively.
