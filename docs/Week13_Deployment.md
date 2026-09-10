# Week 13 — Deployment

Containerization for all three services, a production-shaped compose stack, a
full CI/CD pipeline, and host configuration for Railway/Render (backend) and
Vercel (frontend).

## 1. Docker images

| Image              | Base              |    Size | Notes                                                                          |
| ------------------ | ----------------- | ------: | ------------------------------------------------------------------------------ |
| `fastboard-server` | node:22-alpine    |  255 MB | multi-stage; `pnpm deploy --prod` bundle, runs as the unprivileged `node` user |
| `fastboard-client` | nginx:1.27-alpine | 74.7 MB | builds the 3 WASM modules + Vite bundle, then ships static files only          |

Both build from the **repository root** because this is a pnpm workspace:

```bash
docker build -f server/Dockerfile -t fastboard-server .
docker build -f client/Dockerfile --build-arg VITE_API_URL=https://api.example.com/api -t fastboard-client .
```

Design points:

- **Layer caching** — manifests (`package.json`, lockfile) are copied before
  sources, so dependency layers survive source-only changes.
- `--ignore-scripts` on install: husky is a root `prepare` script and has no
  place in an image build.
- **Migrations ship with the image** (`/app/migrations`) and run through the
  compiled `dist/db/migrate.js` (new `migrate:prod` script) — no `tsx` in
  production dependencies.
- **HEALTHCHECK** on both images; the API one hits the same `/api/health`
  endpoint the hosting platforms probe.
- `VITE_API_URL` is a **build arg**: Vite inlines it into the bundle, so the
  API origin is chosen at image build time, not at runtime.

## 2. Compose stacks

| File                      | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `docker-compose.yml`      | dev: Postgres + Redis only (app runs on the host with HMR) |
| `docker-compose.prod.yml` | prod-shaped: Postgres + Redis + API + nginx client         |

```bash
cp .env.docker.example .env.docker     # then edit the secrets
docker compose -f docker-compose.prod.yml --env-file .env.docker up -d --build
# client  http://localhost:8080
# api     http://localhost:3001/api/health
```

A one-shot `migrate` service applies pending migrations before the API starts
(`depends_on: service_completed_successfully`), so a fresh volume comes up
fully schema'd with no manual step.

**Verified locally end to end** (fresh volume):

- all 4 services reach `healthy`; the migrate job applied 7 migrations and exited 0
- register + login through the containerized API → Postgres (201/200)
- CORS between the two origins works from the browser
- SPA deep link `/activity` → 200, `wasm/compression.wasm` → `application/wasm`
- the service worker registers under nginx and precaches 8 entries
- server log: `Redis cache connected`
- board with 3 columns / 4 tasks created through the API renders in the
  containerized client, realtime badge shows **Live**

### Two bugs the real run exposed

1. **Compose project collision.** Both compose files live in the same
   directory, so Compose inferred the same project name for them and put both
   stacks on one network — where the service alias `postgres` resolved to
   whichever container answered first. Running `pnpm db:up` alongside
   `pnpm docker:up` made the API fail with
   `password authentication failed for user "postgres"`. Fixed with an explicit
   `name: fastboard-prod` in `docker-compose.prod.yml`; the two stacks now have
   separate networks and can run side by side.
   _Note:_ the rename also changes the volume name, so the prod stack starts
   from an empty database the first time after this fix.
2. **`Cache-Control: no-store` on `/sw.js`.** Chromium refuses to register a
   service worker whose script is served `no-store`, which would silently kill
   PWA/offline support in production. The correct header is `no-cache`.

## 3. nginx configuration (client image)

- SPA fallback: `try_files $uri $uri/ /index.html`
- `/assets/*` and `/wasm/*`: `immutable`, one year (filenames are hashed)
- `/sw.js`: `Cache-Control: no-cache` — **must not be `no-store`**, which
  prevents the browser from registering the worker at all; `no-cache` still
  revalidates on every load so a deploy is picked up immediately
- gzip for text, JS, JSON, WASM, and SVG
- commented-out `/api` + `/socket.io` proxy blocks for a same-origin deployment

## 4. CI/CD pipeline (`.github/workflows/ci-cd.yml`)

```
push/PR ──► quality ──┐
        └─► integration ──┴─► build ──┐
            (postgres+redis services)  ├─► deploy-config ─┬─► deploy-backend-railway ─┐
        └─► docker ────────────────────┘   (main only)    ├─► deploy-backend-render   ├─► smoke
                                                          └─► deploy-frontend-vercel ─┘
```

**CI (every push and PR)**

| Job           | What runs                                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality`     | lint → typecheck (3 packages) → 45 unit + component tests                                                                                                 |
| `integration` | migrations + 13 supertest API tests against real Postgres and Redis service containers                                                                    |
| `build`       | rebuilds the WASM modules, **fails if the committed `.wasm` is stale** (verified reproducible), builds server + client, uploads the bundle as an artifact |
| `docker`      | builds both images with GitHub Actions layer caching                                                                                                      |

**CD (only on push to `main`)** — deploys run after CI is green. Because GitHub
does not expose secrets to job-level `if`, a tiny `deploy-config` job publishes
their presence as outputs; a deployment job is **skipped, not failed**, when its
credentials are not configured. That keeps the pipeline green before hosting is
set up. `smoke` re-checks `/api/health` with retries afterwards.

## 5. Host configuration

| File           | Host                 | Role                                                                                      |
| -------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `railway.json` | Railway              | builds `server/Dockerfile`, health check `/api/health`, restart on failure                |
| `render.yaml`  | Render (alternative) | blueprint: Docker web service + free Postgres + Redis, `preDeployCommand` runs migrations |
| `vercel.json`  | Vercel               | builds WASM + client from the monorepo root, SPA rewrites, cache headers                  |

### Steps to go live (needs your accounts — see note below)

1. **Backend on Railway**: New Project → Deploy from GitHub → select this repo.
   Add the Postgres and Redis plugins. Set `JWT_SECRET`, `JWT_REFRESH_SECRET`
   (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   and `CORS_ORIGIN` = the Vercel URL. `DATABASE_URL`/`REDIS_URL` are injected
   by the plugins.
2. **Frontend on Vercel**: Import the repo, framework "Other" (settings come
   from `vercel.json`), env `VITE_API_URL` = `https://<railway-app>/api`.
3. **GitHub secrets** for auto-deploy: `RAILWAY_TOKEN`, plus `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (or `RENDER_DEPLOY_HOOK` for Render).
   Repository variables: `PRODUCTION_API_URL` for the smoke test, optionally
   `RAILWAY_SERVICE`.
4. Merge `development` → `main`; CI runs, then both deploys fire.

> The live deploy itself is not automated from here: it needs sign-in to your
> Railway/Vercel accounts. Everything those platforms read (Dockerfiles, host
> configs, workflow, secrets list) is committed and verified locally.

## 6. Deployment checklist

- [x] Dockerfile for client, server, and database (official Postgres image)
- [x] `docker-compose.yml` for dev, `docker-compose.prod.yml` for the full stack
- [x] CI: test → lint → build on every push/PR
- [x] CD: auto-deploy on merge to `main`, skipped cleanly when unconfigured
- [x] Health checks, non-root container user, `.dockerignore`, secret template
- [ ] Live URLs — pending the Railway/Vercel sign-in described above
