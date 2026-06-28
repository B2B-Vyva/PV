# VIGIL

Patient voice intelligence for pharma safety teams, powered by VYVA.

## Local Run

```bash
npm install
npm run dev
```

If another service already uses `3001`, run the API with a different port:

```bash
PORT=3002 npm run dev:server
```

## Database

The app uses PostgreSQL through the `pg` package. Set `DATABASE_URL`, then run:

```bash
psql $DATABASE_URL -f migrations/001_org_users.sql
psql $DATABASE_URL -f migrations/002_products_projects.sql
psql $DATABASE_URL -f migrations/003_patients_reporters.sql
psql $DATABASE_URL -f migrations/004_safety_workflow.sql
psql $DATABASE_URL -f migrations/005_indexes.sql
psql $DATABASE_URL -f migrations/006_seed.sql
```

Demo sign-in after seeding:

```text
reviewer@vigil.demo
Demo1234!
```

## Environment

Copy `.env.example` to your runtime environment and set:

```text
DATABASE_URL
JWT_SECRET
OPENAI_API_KEY
PORT
VITE_API_URL
```

The UI opens in a demo workspace when no database is configured, while backend routes remain database-backed and org-scoped.
