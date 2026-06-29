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

## VIGIL Pitch

Open the final 3-minute browser pitch. The route is standalone, uses mock data only, and does not require sign-in or an API connection.

```text
/vigil-pitch
```

Autoplay recording mode:

```text
/vigil-pitch?autoplay=1
```

Presenter controls:

```text
Right arrow / Space  next slide or reveal
Left arrow           previous slide or reveal
F                    toggle fullscreen
Escape               exit fullscreen
R                    restart
```

Direct frame links use a zero-based `frame` query:

```text
/vigil-pitch?export=frames&frame=0
/vigil-pitch?export=frames&frame=18
```

Optional PNG frame capture:

```bash
npm i -D playwright
node scripts/capture-pitch-demo.mjs http://localhost:3002/vigil-pitch ../vigil-pitch-frames
```

Recording MP4:

1. Open `/vigil-pitch?autoplay=1` in Chrome or Edge.
2. Press `F` for fullscreen.
3. Use OBS, Loom, QuickTime, or PowerPoint screen recording.
4. For presenter-led recording, use `/vigil-pitch` and advance manually with Space/right arrow.

## VIGIL Demo

Open the focused 90-second product walkthrough. This route is standalone and is reused inside `/vigil-pitch` for the core demo scenes.

```text
/vigil-demo
```

Presenter controls:

```text
Right arrow / Space  next reveal
Left arrow           previous reveal
F                    toggle fullscreen
Escape               exit fullscreen
R                    restart
```

Direct frame links use a zero-based `frame` query:

```text
/vigil-demo?export=frames&frame=0
/vigil-demo?export=frames&frame=13
```

Autoplay recording mode:

```text
/vigil-demo?autoplay=1
```

Autoplay timing:

```text
Conversation Intake          29 seconds
Safety Lead Workbench        34 seconds
Program Safety Intelligence  24 seconds
Total walkthrough            about 87 seconds
```

Frame export mode:

```text
/vigil-demo?export=frames&frame=0
```

Optional PNG frame capture:

```bash
npm i -D playwright
node scripts/capture-vigil-demo.mjs http://localhost:3002/vigil-demo ../vigil-demo-frames
```

Recording MP4:

1. Open `/vigil-demo?autoplay=1` in Chrome or Edge.
2. Press `F` for fullscreen.
3. Use OBS, Loom, QuickTime, or PowerPoint screen recording.
4. For presenter-led recording, use `/vigil-demo` and advance manually with Space/right arrow.

The demo uses mock data only and has no API dependency.
