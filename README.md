This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Running with Docker Compose (Postgres + Next + Nginx)

This repository includes a `docker-compose.yml` that starts three services:

- `db` — Postgres 17 database
- `web` — your Next.js app built from the repository `Dockerfile`
- `nginx` — an `nginx:alpine` reverse proxy that forwards HTTP traffic to the `web` service

Quick start:

1. Copy `.env.example` to `.env` and fill the values (especially `POSTGRES_PASSWORD` and `ASANA_TOKEN`).

2. Build and start the stack:

```powershell
docker compose up --build
```

3. Open http://localhost in your browser. Nginx will proxy to the Next.js app served on port 3000.

Notes:

- The `web` service depends on the database and will wait for `db` to report healthy before starting.
- Files are mounted into the container for easier development (`./:/app`). For production you may want to remove the volume and use the built image only.
- If you run into permission or file-watch issues on Windows, consider removing the bind mount in `docker-compose.yml`.
