# StudyWithMe

A web-based collaborative focus / study environment, built for the web with a calm, polished UI.


## Getting started (local)

### Prerequisites

- Node.js `20.x`
- npm

### Install

```bash
npm ci
npm ci --prefix server
```

### Configure env

```bash
cp .env.example .env
```

Fill the values in `.env`. The full list is in `.env.example`, but commonly:

- `DATABASE_URL` / `PRISMA_DATABASE_URL` (Postgres)
- `BETTER_AUTH_URL` + `BETTER_AUTH_SECRET`
- OAuth: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
- `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN`
- Public URLs: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_URL`

### Prisma

Prisma client generation runs on install (`postinstall`) and during build.

Optional seed:

```bash
npm run db:seed
```

### Run dev servers

Terminal 1 (Next.js):

```bash
npm run dev
```

Terminal 2 (Socket.IO server):

```bash
npm run dev --prefix server
```

## Scripts

- `npm run dev` — run the Next.js app
- `npm run build` / `npm start` — production build + run
- `npm run check` — lint + typecheck (web + server)
- `npm test` — run Vitest
- `npm run format` — prettier

## CI

GitHub Actions runs install + `npm run check` on pushes/PRs: `.github/workflows/ci.yml`.

## Contributing

See `CONTRIBUTING.md`.

## License

Licensed under **AGPL-3.0**.

If you run a modified version of this software as a network service, the AGPL generally requires you to make the corresponding source code available to users of that service. Make sure you understand your obligations before deploying a modified build.

