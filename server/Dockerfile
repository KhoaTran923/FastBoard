# FastBoard API — multi-stage build.
# Build context is the REPO ROOT (pnpm workspace), not server/:
#   docker build -f server/Dockerfile -t fastboard-server .

# ---- deps + build -----------------------------------------------------------
FROM node:22-alpine AS build
RUN npm install -g pnpm@11
WORKDIR /repo

# Manifests first so dependency layers cache across source-only changes
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY wasm/package.json wasm/
# husky is a root prepare script and has no place in an image build
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY server/ server/
COPY tsconfig.base.json ./
RUN pnpm --filter @repo/server run build

# Self-contained bundle with production dependencies only
RUN pnpm --filter @repo/server deploy --prod --legacy /out

# ---- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Drop root privileges (the node image ships an unprivileged `node` user)
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/package.json ./package.json
# Migrations are applied from inside the container on deploy
COPY --from=build --chown=node:node /repo/server/migrations ./migrations
USER node

EXPOSE 3001

# Platform health checks hit the same endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
