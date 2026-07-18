# Secure Document Workspace

A React and Express app for secure workspace document collaboration.

## Development

Create an environment file first:

```bash
cp .env.example .env
```

Fill in the database, storage, and Ideavibes service values. Then run the API and client in separate terminals:

```bash
npm install
npm run db:migrate
npm run api:dev
```

```bash
npm run dev
```

The Vite development server listens on `0.0.0.0:8080` and proxies `/api` to `API_PROXY_TARGET`, which defaults to `http://localhost:3000`.

## Production

```bash
npm ci
npm run build
npm run db:migrate
npm start
```

`npm start` runs the Express server on `PORT`, mounts API routes under `/api`, and serves the built `dist/` client for all frontend routes.

## Configuration

Use `.env.example` as the source of truth for required variables. Production deployments need `SELF_URL`, `SESSION_SECRET`, `DATABASE_URL`, Ideavibes auth values, and S3-compatible storage credentials. Ideavibes email values are optional; if they are absent, email delivery is skipped without crashing requests.

Self-hosting details are in [docs/self-hosting.md](docs/self-hosting.md).
