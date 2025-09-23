## Copilot / AI agent guidance for int-asana-report

Focus: this repo runs a small containerized stack (Postgres + nginx) used for generating Asana-related reports seeded from `db_initial.sql`. Keep changes minimal, container-friendly, and well-documented.

Key components
- `docker-compose.yml` — primary developer entrypoint; use it to start the stack and inspect service port mappings.
- `Dockerfile` — app image build; follow existing layer ordering (system packages → app code → entrypoint) and prefer cache-friendly edits.
- `db_initial.sql` — canonical DB initializer (schema + seed). Treat it as the source of truth for local schema changes.
- `nginx/conf.d/default.conf` — HTTP fronting and proxy config for local runs.

Developer workflows
- Start the stack (rebuild images): run `docker compose up --build` from the repo root.
- Recreate DB from scratch: `docker compose down -v` then `docker compose up --build` (this removes the persisted `volumes/db_data`).

Concrete values you'll use
- Services: `db`, `web`, and `nginx` (as defined in `docker-compose.yml`).
- Ports: Postgres listens on host 5432 (compose maps "5432:5432"), app on 3000 ("3000:3000"), nginx on 80 ("80:80").
- Volumes: local Postgres data is mounted at `./volumes/db_data:/var/lib/postgresql/data`.
- Database connection example used by the app (env var `DATABASE_URL`):
	postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}

Repository patterns & conventions
- Schema-first approach: prefer editing `db_initial.sql` for schema or seed changes. Document in the commit message whether a `db_data` reset is required.
- Minimal infra surface: the project intentionally avoids heavyweight orchestration — Postgres stores data, nginx fronts HTTP. Keep logic out of infra unless necessary.
- Local persistent data: `volumes/db_data` holds Postgres files. When testing schema changes, recreate volumes to ensure consistent state.

Integration points & external deps
- The compose stack is self-contained. If you add external APIs, declare required env vars in compose override(s) and never commit secrets.
- Network and port changes should be made in `docker-compose.yml` and mirrored in `nginx/conf.d/default.conf` when relevant.

Editing guidelines & examples
- Edit nginx and test: change `nginx/conf.d/default.conf`, then `docker compose up --build nginx` and reload the mapped HTTP port.
- Edit DB schema: add SQL to `db_initial.sql` and run `docker compose down -v && docker compose up --build` to reprovision.

Small contract (inputs/outputs) for changes you might be asked to implement
- Inputs: changes to SQL (`db_initial.sql`), Node app code (root project files), and nginx config.
- Outputs: deterministic container image builds, a working web app at host:3000 (proxied at host:80), and a reproducible DB state when `db_data` is reset.

Common edge cases
- Local DB volume exists: schema edits will not apply until the `db_data` volume is removed and the DB is reinitialized.
- Missing lockfile: `Dockerfile` falls back to `npm install` and `npm run build` if no lockfile is present; prefer committing a lockfile for reproducible builds.
- Environment vars: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and `ASANA_TOKEN` are required for a full stack run; compose expects them in the shell environment or an env file.

What not to do
- Do not introduce a migration framework without agreement from maintainers; this repository uses `db_initial.sql` as the initializer.
- Do not commit secrets or credentials; use environment variables and compose overrides for local testing.

PR notes
- If a change requires resetting developer data or changing ports, mention it in the PR description and include reproduction steps.

If anything is missing or unclear, tell me which workflows you rely on most and I will expand this document.

