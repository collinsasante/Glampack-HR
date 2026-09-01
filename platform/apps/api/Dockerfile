# syntax=docker/dockerfile:1

FROM node:22-slim AS base
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# --- deps: install once, cached as long as package.json files don't change ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# --- build: compile shared, then api, then generate the Prisma client ---
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace=packages/shared
# Must happen before compiling api — tsc needs the generated @prisma/client types to exist.
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

# --- production deps only, no devDependencies ---
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/prisma/schema.prisma apps/api/prisma/schema.prisma
RUN npm ci --omit=dev
RUN npm run prisma:generate --workspace=apps/api

# --- final runtime image ---
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo

# Only the root node_modules is copied — Node's module resolution walks up parent
# directories from apps/api/dist, so it finds this without needing a nested copy too
# (which isn't even guaranteed to exist under npm workspace hoisting).
COPY --from=prod-deps /repo/node_modules node_modules
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY packages/shared/package.json packages/shared/package.json
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY apps/api/package.json apps/api/package.json
COPY apps/api/prisma apps/api/prisma

WORKDIR /repo/apps/api
EXPOSE 4000

# Applies pending migrations, then starts the server — safe to run on every
# container start since `prisma migrate deploy` is a no-op when already up to date.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
