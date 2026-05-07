# Contributing

Thanks for your interest in contributing to this project. This repository is an open-source SaaS-style codebase (Next.js app + a Socket.IO server). Contributions that improve reliability, security, performance, developer experience, or user experience are especially welcome.

## Ground rules

- Be respectful and constructive in issues, PRs, and reviews.
- Keep changes small and focused (one PR = one thing).
- Prefer clarity over cleverness; optimize for maintainability.
- No secrets: never commit API keys, tokens, or `.env` files.

## Quick start (local development)

### Prerequisites

- Node.js `20.x`
- npm (comes with Node)

### Install dependencies

```bash
npm ci
npm ci --prefix server
```

### Configure environment

Copy the example env file and fill in values:

```bash
cp .env.example .env
```

At minimum, you’ll need working values for database/auth providers depending on what you’re changing. For most UI-only changes, you can often get by with the `NEXT_PUBLIC_*` values set to localhost defaults.

### Database / Prisma

This repo uses Prisma. Client generation happens automatically via `postinstall`, and also as part of `npm run build`.

If you need seed data:

```bash
npm run db:seed
```

### Run the app

In one terminal:

```bash
npm run dev
```

In another terminal (socket server):

```bash
npm run dev --prefix server
```

## Development checks

Before opening a PR, make sure these pass locally:

```bash
npm run check
npm test
```

Useful single commands:

- Lint: `npm run lint`
- Typecheck (web): `npm run typecheck`
- Typecheck (server): `npm run typecheck:server`
- Format: `npm run format`
- Unit tests only: `npm run test:unit`
- Integration tests only: `npm run test:integration`

## What to contribute

Good first contributions:

- Fix a bug with a minimal reproduction in the PR description
- Improve accessibility (keyboard nav, focus states, ARIA, contrast)
- Improve performance (reduce unnecessary rerenders, lighter bundles)
- Add tests around critical logic (unit or integration)
- Improve documentation (setup, troubleshooting, architecture notes)

If you’re planning something larger (new features, refactors, architectural changes), open an issue first to discuss scope and approach.

## Pull request guidelines

- **Describe the “why”**: what problem you’re solving and why this approach.
- **Include screenshots/videos** for UI changes (before/after if helpful).
- **Add/adjust tests** when fixing bugs or changing behavior.
- **Avoid drive-by reformatting**: keep diffs focused on the change.
- **Update docs** if behavior, config, or setup changes.

### Branch naming

Use clear branch names, e.g.:

- `fix/socket-reconnect`
- `feat/calendar-sync`
- `chore/deps`

## Reporting bugs / requesting features

When filing an issue, please include:

- What you expected vs what happened
- Steps to reproduce (or a minimal repo/snippet)
- Screenshots/recordings (for UI issues)
- Environment (OS, Node version, browser)

## Security

If you believe you’ve found a security vulnerability, please **do not** open a public issue. Instead, report it privately to the maintainers (use the contact method listed in the repository’s README or project website, if available).

## License

By contributing, you agree that your contributions will be licensed under the project’s **AGPL-3.0** license (or any later version if the project specifies “or later”).

