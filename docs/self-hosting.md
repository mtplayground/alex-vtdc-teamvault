# Self-Hosting

This app can run from a plain checked-out directory after dependencies are installed and the client is built. The production Express process serves both `/api` and the static `dist/` files, so no separate static file server is required.

## Prerequisites

- Node.js 20 or newer
- PostgreSQL with a database reachable by `DATABASE_URL`
- S3-compatible object storage for document files
- Ideavibes auth values for `MCTAI_AUTH_URL`, `MCTAI_AUTH_APP_TOKEN`, and `MCTAI_AUTH_JWKS_URL`
- Optional Ideavibes email values for invitations and notifications

## Environment

Start from the example file:

```bash
cp .env.example .env
```

Set these values for production:

- `NODE_ENV=production`
- `PORT`, the HTTP port for Express
- `SELF_URL`, the public HTTPS origin for this app
- `ALLOWED_CORS_ORIGIN`, normally the same value as `SELF_URL`
- `SESSION_SECRET`, at least 32 random characters
- `DATABASE_URL` and optional `DATABASE_POOL_SIZE`
- `MCTAI_AUTH_URL`, `MCTAI_AUTH_APP_TOKEN`, and `MCTAI_AUTH_JWKS_URL`
- `MCTAI_EMAIL_URL` and `MCTAI_EMAIL_APP_TOKEN` if email is provisioned
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_FORCE_PATH_STYLE`

Do not configure a mail `from` address. The Ideavibes email service owns the verified sender and the app only sends `to`, `subject`, `html` or `text`, and optional `reply_to`.

## Build And Run

```bash
npm ci
npm run build
npm run db:migrate
npm start
```

The app listens on `PORT`. Health checks can call `GET /api/health`.

## Files To Preserve

Keep these files and directories together on the host:

- `dist/`
- `src/`
- `scripts/`
- `migrations/`
- `package.json`
- `package-lock.json`
- `.env` or equivalent process environment

The server currently runs TypeScript through `tsx`, so `src/` is still part of the runtime directory.

## Local Development

Run the API and Vite client separately:

```bash
npm run api:dev
```

```bash
npm run dev
```

The Vite server proxies `/api` to `API_PROXY_TARGET`, defaulting to `http://localhost:3000`.
