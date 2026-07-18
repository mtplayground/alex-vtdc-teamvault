# Document Workspace

A single-page web app scaffold for secure workspace document collaboration.

## Development

```bash
npm install
npm run dev
```

The development server listens on `0.0.0.0:8080`.

## Build

```bash
npm run build
```

## Database

Persistent state uses PostgreSQL. Set `DATABASE_URL` in the environment before running migrations.

```bash
npm run db:migrate
```
