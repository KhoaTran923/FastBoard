# FastBoard client — build the WASM modules and the Vite bundle, serve with nginx.
# Build context is the REPO ROOT (pnpm workspace), not client/:
#   docker build -f client/Dockerfile --build-arg VITE_API_URL=... -t fastboard-client .

# ---- build ------------------------------------------------------------------
FROM node:22-alpine AS build
RUN npm install -g pnpm@11
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY wasm/package.json wasm/
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.base.json ./
COPY wasm/ wasm/
COPY client/ client/

# The API origin is baked into the bundle at build time
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# AssemblyScript modules land in client/public/wasm/ and are picked up by Vite
RUN pnpm --filter @repo/wasm run build \
 && pnpm --filter @repo/client run build

# ---- runtime ----------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/client/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
