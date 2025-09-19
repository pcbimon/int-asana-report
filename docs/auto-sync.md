# Auto-sync (scheduled) for Asana -> Supabase

This document explains how to enable automatic sync of Asana data by calling the app's `/api/sync` endpoint on a schedule.

## What is `SYNC_SERVICE_KEY`?

`SYNC_SERVICE_KEY` is a server-side secret used to authenticate server-to-server requests to `POST /api/sync` so you can safely trigger syncs from CI/schedulers without a user session.

## Generate a secure key

Use a cryptographically secure generator and store the result in your deployment or CI secrets. Example (locally):

PowerShell (Windows):

```powershell
# generate 32 bytes in hex
[System.BitConverter]::ToString((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32)).Replace('-', '').ToLower()
```

Or using OpenSSL on macOS / Linux:

```bash
openssl rand -hex 32
```

Store the generated string as the secret `SYNC_SERVICE_KEY` in your hosting provider (Vercel/Netlify), in Supabase project vars, and as `secrets.SYNC_SERVICE_KEY` in GitHub for Actions.

## How the API expects it

Send the key in the request header `x-sync-service-key`. When the value matches the server env `SYNC_SERVICE_KEY`, the route will bypass the browser-based Supabase session check and run the sync as a scheduled job.

Example curl:

```bash
curl -X POST "https://your-app.example.com/api/sync" \
  -H "Content-Type: application/json" \
  -H "x-sync-service-key: $SYNC_SERVICE_KEY" \
  -d '{"userEmail":"automation@your.org"}'
```

## GitHub Actions

We added `.github/workflows/scheduled-sync.yml` that runs daily at 02:00 UTC and supports manual dispatch. Add these repository secrets:

- `SYNC_URL` — full URL to the deployed `POST /api/sync` endpoint (e.g. `https://example.vercel.app/api/sync`)
- `SYNC_SERVICE_KEY` — the secret key generated above

The workflow sends `x-sync-service-key` and a small JSON body with `userEmail` for logging.

## Alternatives

- Use Vercel's scheduled functions / serverless cron if you deploy there; pass the key similarly.
- Use Supabase Edge Functions and schedule via an external cron or GitHub Actions; Edge Functions may use the SERVICE_ROLE_KEY internally to access Supabase directly (keep it server-side).

## Security notes

- Do NOT expose `SYNC_SERVICE_KEY` to client-side code or commit it to the repo.
- Rotate the key periodically and invalidate old ones by updating the environment variable.
